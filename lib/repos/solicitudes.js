import { query } from "@/lib/db/pool";
import { pickVeterinarioAutomatico, proponerSalaParaVet } from "@/lib/autoAssign";
import { getTipoServicio } from "@/lib/constants";
import { createTurno } from "@/lib/repos/postgresStore";

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function mapSolicitudStaff(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    clienteNombre: row.cliente_nombre,
    mascotaId: row.mascota_id,
    mascotaNombre: row.mascota_nombre,
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

async function loadSchedulingContext(sucursalId) {
  const [salasRes, salaTiposRes, vetPreferidaRes, vetTiposRes, vetsRes] = await Promise.all([
    query("SELECT id, sucursal_id, nombre FROM salas WHERE sucursal_id = $1", [sucursalId]),
    query("SELECT sala_id, tipo_servicio_id FROM sala_tipos_servicio"),
    query(
      `SELECT vsp.veterinario_id, vsp.sala_id FROM veterinario_sala_preferida vsp
       JOIN usuarios u ON u.id = vsp.veterinario_id WHERE u.sucursal_id = $1`,
      [sucursalId]
    ),
    query(
      `SELECT vts.veterinario_id, vts.tipo_servicio_id FROM veterinario_tipos_servicio vts
       JOIN usuarios u ON u.id = vts.veterinario_id WHERE u.sucursal_id = $1`,
      [sucursalId]
    ),
    query(
      `SELECT id, nombre FROM usuarios WHERE sucursal_id = $1 AND rol = 'veterinario' AND activo = true`,
      [sucursalId]
    ),
  ]);

  return {
    salas: salasRes.rows.map((r) => ({ id: r.id, sucursalId: r.sucursal_id, nombre: r.nombre })),
    salaTiposServicio: salaTiposRes.rows.map((r) => ({
      salaId: r.sala_id,
      tipoServicioId: r.tipo_servicio_id,
    })),
    veterinarioSalaPreferida: vetPreferidaRes.rows.map((r) => ({
      veterinarioId: r.veterinario_id,
      salaId: r.sala_id,
    })),
    veterinarioTiposServicio: vetTiposRes.rows.map((r) => ({
      veterinarioId: r.veterinario_id,
      tipoServicioId: r.tipo_servicio_id,
    })),
    veterinarios: vetsRes.rows.map((r) => ({ id: r.id, nombre: r.nombre })),
  };
}

async function turnosForDay(sucursalId, fecha) {
  const { rows } = await query(
    "SELECT * FROM turnos WHERE sucursal_id = $1 AND fecha = $2::date",
    [sucursalId, fecha]
  );
  return rows.map((row) => ({
    id: row.id,
    sucursalId: row.sucursal_id,
    mascotaId: row.mascota_id,
    tipoServicioId: row.tipo_servicio_id,
    veterinarioId: row.veterinario_id,
    salaId: row.sala_id,
    fecha: formatDate(row.fecha),
    horaInicio: formatTime(row.hora_inicio),
    duracionMinutos: row.duracion_minutos,
    estado: row.estado,
  }));
}

export async function listSolicitudesPendientes(sucursalId) {
  const { rows } = await query(
    `SELECT st.*, u.nombre AS cliente_nombre, m.nombre AS mascota_nombre
     FROM solicitudes_turno st
     JOIN usuarios u ON u.id = st.cliente_id
     JOIN mascotas m ON m.id = st.mascota_id
     WHERE st.sucursal_id = $1 AND st.estado = 'pendiente'
     ORDER BY st.fecha_preferida, st.hora_inicio_preferida`,
    [sucursalId]
  );
  return rows.map(mapSolicitudStaff);
}

export async function proponerAsignacionSolicitud(solicitudId, sucursalId) {
  const { rows } = await query("SELECT * FROM solicitudes_turno WHERE id = $1", [solicitudId]);
  const sol = rows[0];
  if (!sol || sol.sucursal_id !== sucursalId || sol.estado !== "pendiente") {
    throw new Error("Solicitud no encontrada.");
  }

  const ctx = await loadSchedulingContext(sucursalId);
  const tipo = getTipoServicio(sol.tipo_servicio_id);
  const turnosDelDia = await turnosForDay(sucursalId, formatDate(sol.fecha_preferida));

  const habilitados = ctx.veterinarioTiposServicio
    .filter((vt) => vt.tipoServicioId === sol.tipo_servicio_id)
    .map((vt) => vt.veterinarioId);

  const veterinarioId = pickVeterinarioAutomatico({
    tipoServicioId: sol.tipo_servicio_id,
    fecha: formatDate(sol.fecha_preferida),
    horaInicio: formatTime(sol.hora_inicio_preferida),
    duracionMinutos: tipo?.duracionMinutos,
    turnosDelDia,
    veterinariosHabilitados: habilitados,
    sucursalId,
  });

  if (!veterinarioId) {
    return { veterinarioId: null, salaId: null, veterinarios: ctx.veterinarios, salas: ctx.salas };
  }

  const preferida = ctx.veterinarioSalaPreferida.find((v) => v.veterinarioId === veterinarioId);
  const salaId = proponerSalaParaVet({
    tipoServicioId: sol.tipo_servicio_id,
    veterinarioId,
    salas: ctx.salas,
    salaTipos: ctx.salaTiposServicio,
    vetPreferida: preferida,
  });

  return { veterinarioId, salaId, veterinarios: ctx.veterinarios, salas: ctx.salas };
}

export async function confirmarSolicitud(solicitudId, overrides, session) {
  const sucursalId = session.sucursalId;

  const claim = await query(
    `UPDATE solicitudes_turno SET estado = 'confirmada', actualizado_en = now()
     WHERE id = $1 AND sucursal_id = $2 AND estado = 'pendiente'
     RETURNING *`,
    [solicitudId, sucursalId]
  );
  const sol = claim.rows[0];
  if (!sol) {
    throw new Error("Solicitud no encontrada o ya no está pendiente.");
  }

  let veterinarioId = overrides.veterinarioId;
  let salaId = overrides.salaId;

  if (!veterinarioId || !salaId) {
    const propuesta = await proponerAsignacionSolicitud(solicitudId, sucursalId);
    veterinarioId = veterinarioId ?? propuesta.veterinarioId;
    salaId = salaId ?? propuesta.salaId;
  }

  if (!veterinarioId || !salaId) {
    await query(
      `UPDATE solicitudes_turno SET estado = 'pendiente', actualizado_en = now() WHERE id = $1 AND turno_id IS NULL`,
      [solicitudId]
    );
    throw new Error("No hay veterinario disponible en la franja solicitada.");
  }

  const tipo = getTipoServicio(sol.tipo_servicio_id);

  try {
    const turno = await createTurno(
      {
        sucursalId,
        mascotaId: sol.mascota_id,
        tipoServicioId: sol.tipo_servicio_id,
        veterinarioId,
        salaId,
        fecha: formatDate(sol.fecha_preferida),
        horaInicio: formatTime(sol.hora_inicio_preferida),
        duracionMinutos: tipo?.duracionMinutos,
        estado: "confirmado",
      },
      session
    );

    await query("UPDATE solicitudes_turno SET turno_id = $2 WHERE id = $1", [solicitudId, turno.id]);
    return { solicitudId, turno };
  } catch (e) {
    await query(
      `UPDATE solicitudes_turno SET estado = 'pendiente', actualizado_en = now() WHERE id = $1 AND turno_id IS NULL`,
      [solicitudId]
    );
    throw e;
  }
}

export async function rechazarSolicitud(solicitudId, motivo, session) {
  const { rows } = await query("SELECT * FROM solicitudes_turno WHERE id = $1", [solicitudId]);
  const sol = rows[0];
  if (!sol || sol.sucursal_id !== session.sucursalId) {
    throw new Error("Solicitud no encontrada.");
  }
  if (sol.estado !== "pendiente") {
    throw new Error("Solo se pueden rechazar solicitudes pendientes.");
  }

  await query(
    `UPDATE solicitudes_turno SET estado = 'rechazada', motivo_rechazo = $2, actualizado_en = now() WHERE id = $1`,
    [solicitudId, motivo?.trim() || null]
  );
}

export async function cancelarSolicitud(solicitudId, session) {
  const { rows } = await query("SELECT * FROM solicitudes_turno WHERE id = $1", [solicitudId]);
  const sol = rows[0];
  if (!sol || sol.sucursal_id !== session.sucursalId) {
    throw new Error("Solicitud no encontrada.");
  }
  if (sol.estado !== "pendiente") {
    throw new Error("Solo se pueden cancelar solicitudes pendientes.");
  }

  await query(
    `UPDATE solicitudes_turno SET estado = 'cancelada', actualizado_en = now() WHERE id = $1`,
    [solicitudId]
  );
}
