import { randomUUID } from "crypto";
import { query, withTransaction } from "@/lib/db/pool";
import {
  assertTurnoDentroHorarioSucursal,
  buildSlotsFromTramos,
  DEFAULT_HORARIO_SEMANAL,
  DIAS_SEMANA,
  fechasCerradasEnRango,
  tramosParaFecha,
  turnoFueraDeHorarioSemanal,
  validateHorarioSemanal,
} from "@/lib/horarioSucursal";
import { CLINICA_HORARIO, getTipoServicio } from "@/lib/constants";

function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function mapCierre(row) {
  return {
    id: row.id,
    sucursalId: row.sucursal_id,
    fechaDesde: formatDate(row.fecha_desde),
    fechaHasta: formatDate(row.fecha_hasta),
    motivo: row.motivo ?? "",
  };
}

export async function seedDefaultHorarioSucursal(sucursalId, client = null) {
  const q = client ? client.query.bind(client) : query;
  for (const dia of DEFAULT_HORARIO_SEMANAL) {
    await q(
      `INSERT INTO sucursal_horario_dia (sucursal_id, dia_semana, cerrado)
       VALUES ($1, $2, $3)
       ON CONFLICT (sucursal_id, dia_semana) DO NOTHING`,
      [sucursalId, dia.diaSemana, dia.cerrado]
    );
    if (!dia.cerrado) {
      await q(
        `INSERT INTO sucursal_horario_tramo (id, sucursal_id, dia_semana, orden, hora_inicio, hora_fin)
         SELECT $1, $2, $3, 0, $4::time, $5::time
         WHERE NOT EXISTS (
           SELECT 1 FROM sucursal_horario_tramo WHERE sucursal_id = $2 AND dia_semana = $3
         )`,
        [randomUUID(), sucursalId, dia.diaSemana, dia.tramos[0].horaInicio, dia.tramos[0].horaFin]
      );
    }
  }
}

async function loadDiaRows(sucursalId) {
  const { rows: diaRows } = await query(
    "SELECT dia_semana, cerrado FROM sucursal_horario_dia WHERE sucursal_id = $1",
    [sucursalId]
  );
  const { rows: tramoRows } = await query(
    `SELECT dia_semana, orden, hora_inicio, hora_fin FROM sucursal_horario_tramo
     WHERE sucursal_id = $1 ORDER BY dia_semana, orden, hora_inicio`,
    [sucursalId]
  );

  if (diaRows.length === 0) {
    await seedDefaultHorarioSucursal(sucursalId);
    return loadDiaRows(sucursalId);
  }

  const tramosByDia = new Map();
  for (const t of tramoRows) {
    const list = tramosByDia.get(t.dia_semana) ?? [];
    list.push({
      horaInicio: formatTime(t.hora_inicio),
      horaFin: formatTime(t.hora_fin),
    });
    tramosByDia.set(t.dia_semana, list);
  }

  const byDia = new Map(diaRows.map((r) => [r.dia_semana, r.cerrado === true]));
  return DIAS_SEMANA.map((diaSemana) => ({
    diaSemana,
    cerrado: byDia.get(diaSemana) ?? diaSemana >= 6,
    tramos: byDia.get(diaSemana) === true ? [] : (tramosByDia.get(diaSemana) ?? []),
  }));
}

export async function loadCierresSucursal(sucursalId) {
  const { rows } = await query(
    `SELECT * FROM sucursal_cierres WHERE sucursal_id = $1 ORDER BY fecha_desde DESC`,
    [sucursalId]
  );
  return rows.map(mapCierre);
}

export async function getHorarioSemanalSucursal(sucursalId) {
  const dias = await loadDiaRows(sucursalId);
  return { dias };
}

export async function getHorarioContextoSucursal(sucursalId) {
  const [dias, cierres] = await Promise.all([loadDiaRows(sucursalId), loadCierresSucursal(sucursalId)]);
  return { horarioSemanal: dias, cierres };
}

export async function setHorarioSemanalSucursal(sucursalId, diasInput) {
  const dias = validateHorarioSemanal(diasInput);

  await withTransaction(async (client) => {
    await client.query("DELETE FROM sucursal_horario_tramo WHERE sucursal_id = $1", [sucursalId]);
    await client.query("DELETE FROM sucursal_horario_dia WHERE sucursal_id = $1", [sucursalId]);

    for (const dia of dias) {
      await client.query(
        `INSERT INTO sucursal_horario_dia (sucursal_id, dia_semana, cerrado) VALUES ($1, $2, $3)`,
        [sucursalId, dia.diaSemana, dia.cerrado]
      );
      if (!dia.cerrado) {
        let orden = 0;
        for (const t of dia.tramos) {
          await client.query(
            `INSERT INTO sucursal_horario_tramo (id, sucursal_id, dia_semana, orden, hora_inicio, hora_fin)
             VALUES ($1, $2, $3, $4, $5::time, $6::time)`,
            [randomUUID(), sucursalId, dia.diaSemana, orden++, t.horaInicio, t.horaFin]
          );
        }
      }
    }
  });

  const warnings = await countConflictosHorario(sucursalId, dias);
  return { dias, warnings };
}

async function countConflictosHorario(sucursalId, horarioSemanal) {
  const cierres = await loadCierresSucursal(sucursalId);
  const hoy = new Date().toISOString().slice(0, 10);

  const { rows: turnoRows } = await query(
    `SELECT fecha, hora_inicio, duracion_minutos, estado FROM turnos
     WHERE sucursal_id = $1 AND fecha >= $2::date AND estado NOT IN ('cancelado')`,
    [sucursalId, hoy]
  );
  let turnosFuera = 0;
  for (const row of turnoRows) {
    const turno = {
      fecha: formatDate(row.fecha),
      horaInicio: formatTime(row.hora_inicio),
      duracionMinutos: row.duracion_minutos,
      estado: row.estado,
    };
    if (turnoFueraDeHorarioSemanal(turno, horarioSemanal, cierres)) turnosFuera++;
  }

  const { rows: solRows } = await query(
    `SELECT fecha_preferida, hora_inicio_preferida, tipo_servicio_id FROM solicitudes_turno
     WHERE sucursal_id = $1 AND estado = 'pendiente' AND fecha_preferida >= $2::date`,
    [sucursalId, hoy]
  );
  let solicitudesFuera = 0;
  for (const row of solRows) {
    const tipo = getTipoServicio(row.tipo_servicio_id);
    try {
      assertTurnoDentroHorarioSucursal(
        {
          fecha: formatDate(row.fecha_preferida),
          horaInicio: formatTime(row.hora_inicio_preferida),
          duracionMinutos: tipo?.duracionMinutos ?? 30,
        },
        horarioSemanal,
        cierres
      );
    } catch {
      solicitudesFuera++;
    }
  }

  return { turnosFuera, solicitudesFuera };
}

export async function listCierresAdmin(sucursalId) {
  return loadCierresSucursal(sucursalId);
}

export async function createCierreSucursal(input) {
  if (!input.sucursalId || !input.fechaDesde || !input.fechaHasta) {
    throw new Error("Sucursal y rango de fechas son obligatorios.");
  }
  if (input.fechaDesde > input.fechaHasta) throw new Error("fecha_desde debe ser anterior o igual a fecha_hasta.");

  const id = randomUUID();
  await query(
    `INSERT INTO sucursal_cierres (id, sucursal_id, fecha_desde, fecha_hasta, motivo)
     VALUES ($1, $2, $3::date, $4::date, $5)`,
    [id, input.sucursalId, input.fechaDesde, input.fechaHasta, input.motivo?.trim() || null]
  );

  const ctx = await getHorarioContextoSucursal(input.sucursalId);
  const warnings = await countConflictosHorario(input.sucursalId, ctx.horarioSemanal);
  return { cierre: { id, ...input, motivo: input.motivo ?? "" }, warnings };
}

export async function createCierreTodasSucursales(input) {
  const { rows } = await query("SELECT id FROM sucursales");
  const results = [];
  for (const row of rows) {
    results.push(
      await createCierreSucursal({
        sucursalId: row.id,
        fechaDesde: input.fechaDesde,
        fechaHasta: input.fechaHasta,
        motivo: input.motivo,
      })
    );
  }
  const warnings = results.reduce(
    (acc, r) => ({
      turnosFuera: acc.turnosFuera + r.warnings.turnosFuera,
      solicitudesFuera: acc.solicitudesFuera + r.warnings.solicitudesFuera,
    }),
    { turnosFuera: 0, solicitudesFuera: 0 }
  );
  return { count: results.length, warnings };
}

export async function deleteCierreSucursal(id) {
  const { rowCount } = await query("DELETE FROM sucursal_cierres WHERE id = $1", [id]);
  if (!rowCount) throw new Error("Cierre no encontrado.");
}

export async function assertTurnoEnHorarioSucursal(turno) {
  const ctx = await getHorarioContextoSucursal(turno.sucursalId);
  assertTurnoDentroHorarioSucursal(turno, ctx.horarioSemanal, ctx.cierres);
}

export async function getSlotsSucursal({ sucursalId, fecha, duracionMinutos }) {
  const ctx = await getHorarioContextoSucursal(sucursalId);
  const tramos = tramosParaFecha(fecha, ctx.horarioSemanal, ctx.cierres);
  return {
    abierto: tramos.length > 0,
    slots: buildSlotsFromTramos(tramos, {
      slotMinutos: CLINICA_HORARIO.slotMinutos,
      duracionMinutos,
    }),
  };
}

export async function getCalendarioSucursal({ sucursalId, desde, hasta }) {
  const ctx = await getHorarioContextoSucursal(sucursalId);
  const fechasCerradas = fechasCerradasEnRango(desde, hasta, ctx.horarioSemanal, ctx.cierres);
  return { fechasCerradas };
}
