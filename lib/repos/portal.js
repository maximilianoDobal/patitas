import { randomUUID } from "crypto";
import { query } from "@/lib/db/pool";
import { getTipoServicio } from "@/lib/constants";
import { assertTurnoEnHorarioSucursal } from "@/lib/repos/horarioSucursal";

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function mapMascota(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    nombre: row.nombre,
    especie: row.especie ?? "",
    raza: row.raza ?? "",
  };
}

function mapSolicitud(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    mascotaId: row.mascota_id,
    sucursalId: row.sucursal_id,
    tipoServicioId: row.tipo_servicio_id,
    fechaPreferida: formatDate(row.fecha_preferida),
    horaInicioPreferida: formatTime(row.hora_inicio_preferida),
    estado: row.estado,
    motivoRechazo: row.motivo_rechazo ?? "",
    turnoId: row.turno_id,
    creadoEn: row.creado_en,
  };
}

function mapTurnoPortal(row) {
  return {
    id: row.id,
    mascotaId: row.mascota_id,
    mascotaNombre: row.mascota_nombre,
    sucursalId: row.sucursal_id,
    sucursalCodigo: row.sucursal_codigo,
    tipoServicioId: row.tipo_servicio_id,
    fecha: formatDate(row.fecha),
    horaInicio: formatTime(row.hora_inicio),
    estado: row.estado,
  };
}

export async function listMascotasForCliente(clienteId) {
  const { rows } = await query("SELECT * FROM mascotas WHERE cliente_id = $1 ORDER BY nombre", [
    clienteId,
  ]);
  return rows.map(mapMascota);
}

export async function listProximosTurnosCliente(clienteId) {
  const hoy = new Date().toISOString().slice(0, 10);
  const { rows } = await query(
    `SELECT t.*, m.nombre AS mascota_nombre, s.codigo_interno AS sucursal_codigo
     FROM turnos t
     JOIN mascotas m ON m.id = t.mascota_id
     JOIN sucursales s ON s.id = t.sucursal_id
     WHERE m.cliente_id = $1
       AND t.fecha >= $2::date
       AND t.estado IN ('programado', 'confirmado', 'en_atencion')
     ORDER BY t.fecha, t.hora_inicio`,
    [clienteId, hoy]
  );
  return rows.map(mapTurnoPortal);
}

export async function listConsultasPortalCliente(clienteId) {
  const { rows } = await query(
    `SELECT c.titulo, c.tipo_servicio_id, c.fecha, m.nombre AS mascota_nombre
     FROM consultas c
     JOIN historias_clinicas h ON h.id = c.historia_clinica_id
     JOIN mascotas m ON m.id = h.mascota_id
     WHERE m.cliente_id = $1
     ORDER BY c.fecha DESC NULLS LAST`,
    [clienteId]
  );
  return rows.map((r) => ({
    titulo: r.titulo ?? "",
    tipoServicioId: r.tipo_servicio_id,
    tipoServicioNombre: getTipoServicio(r.tipo_servicio_id)?.nombre ?? r.tipo_servicio_id,
    fecha: r.fecha ? formatDate(r.fecha) : null,
    mascotaNombre: r.mascota_nombre,
  }));
}

export async function listSolicitudesCliente(clienteId) {
  const { rows } = await query(
    `SELECT * FROM solicitudes_turno WHERE cliente_id = $1 ORDER BY creado_en DESC`,
    [clienteId]
  );
  return rows.map(mapSolicitud);
}

export async function createSolicitudTurno(input, clienteId) {
  const { rows: mascotaRows } = await query(
    "SELECT id, cliente_id FROM mascotas WHERE id = $1",
    [input.mascotaId]
  );
  const mascota = mascotaRows[0];
  if (!mascota || mascota.cliente_id !== clienteId) {
    throw new Error("Mascota no encontrada.");
  }

  const tipo = getTipoServicio(input.tipoServicioId);
  if (!tipo) throw new Error("Tipo de servicio inválido.");

  const { rows: sucRows } = await query("SELECT id FROM sucursales WHERE id = $1", [
    input.sucursalId,
  ]);
  if (!sucRows[0]) throw new Error("Sucursal no encontrada.");

  if (!input.fechaPreferida || !input.horaInicioPreferida) {
    throw new Error("Fecha y hora preferidas son obligatorias.");
  }

  await assertTurnoEnHorarioSucursal({
    sucursalId: input.sucursalId,
    fecha: input.fechaPreferida,
    horaInicio: input.horaInicioPreferida,
    duracionMinutos: tipo.duracionMinutos,
  });

  const id = randomUUID();
  await query(
    `INSERT INTO solicitudes_turno (
      id, cliente_id, mascota_id, sucursal_id, tipo_servicio_id,
      fecha_preferida, hora_inicio_preferida, estado
    ) VALUES ($1,$2,$3,$4,$5,$6::date,$7::time,'pendiente')`,
    [
      id,
      clienteId,
      input.mascotaId,
      input.sucursalId,
      input.tipoServicioId,
      input.fechaPreferida,
      input.horaInicioPreferida,
    ]
  );

  const { rows } = await query("SELECT * FROM solicitudes_turno WHERE id = $1", [id]);
  return mapSolicitud(rows[0]);
}

export async function listSucursalesPortal() {
  const { rows } = await query(
    "SELECT id, codigo_interno, nombre_comercial FROM sucursales ORDER BY codigo_interno"
  );
  return rows.map((r) => ({
    id: r.id,
    codigoInterno: r.codigo_interno,
    nombreComercial: r.nombre_comercial,
  }));
}
