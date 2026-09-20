import { randomUUID } from "crypto";
import { query } from "@/lib/db/pool";
import { TURNO_EMAIL_ONCE_PER_TURNO, TURNO_EMAIL_TIPO } from "@/lib/email/turnoEmailTypes";

export async function loadTurnoEmailContext(turnoId) {
  const { rows } = await query(
    `SELECT
       t.id AS turno_id,
       t.fecha,
       t.hora_inicio,
       t.estado,
       t.tipo_servicio_id,
       m.nombre AS mascota_nombre,
       u.nombre AS cliente_nombre,
       u.email AS cliente_email,
       s.nombre_comercial AS sucursal_nombre,
       s.direccion AS sucursal_direccion,
       s.localidad AS sucursal_localidad,
       uv.nombre AS veterinario_nombre
     FROM turnos t
     JOIN mascotas m ON m.id = t.mascota_id
     JOIN clientes c ON c.usuario_id = m.cliente_id
     JOIN usuarios u ON u.id = c.usuario_id
     JOIN sucursales s ON s.id = t.sucursal_id
     JOIN usuarios uv ON uv.id = t.veterinario_id
     WHERE t.id = $1`,
    [turnoId]
  );
  return rows[0] ?? null;
}

export async function yaEnviadoTurnoEmail(turnoId, tipo) {
  const { rows } = await query(
    `SELECT 1 FROM emails_turno_enviados WHERE turno_id = $1 AND tipo = $2 LIMIT 1`,
    [turnoId, tipo]
  );
  return rows.length > 0;
}

export async function registrarEnvioTurnoEmail(turnoId, tipo) {
  if (!TURNO_EMAIL_ONCE_PER_TURNO.has(tipo)) {
    await query(`INSERT INTO emails_turno_enviados (id, turno_id, tipo) VALUES ($1, $2, $3)`, [
      randomUUID(),
      turnoId,
      tipo,
    ]);
    return;
  }

  try {
    await query(`INSERT INTO emails_turno_enviados (id, turno_id, tipo) VALUES ($1, $2, $3)`, [
      randomUUID(),
      turnoId,
      tipo,
    ]);
  } catch (err) {
    if (err.code !== "23505") throw err;
  }
}

export async function borrarRecordatorioPendiente(turnoId) {
  await query(`DELETE FROM emails_turno_enviados WHERE turno_id = $1 AND tipo = $2`, [
    turnoId,
    TURNO_EMAIL_TIPO.RECORDATORIO_24H,
  ]);
}

/** Turnos activos cuyo inicio cae en la ventana 23h–24h (TZ Argentina). */
export async function listTurnosEnVentanaRecordatorio() {
  const { rows } = await query(
    `SELECT t.id
     FROM turnos t
     WHERE t.estado IN ('programado', 'confirmado')
       AND NOT EXISTS (
         SELECT 1 FROM emails_turno_enviados e
         WHERE e.turno_id = t.id AND e.tipo = $1
       )
       AND ((t.fecha + t.hora_inicio) AT TIME ZONE 'America/Argentina/Buenos_Aires')
         >= (now() AT TIME ZONE 'America/Argentina/Buenos_Aires' + interval '23 hours')
       AND ((t.fecha + t.hora_inicio) AT TIME ZONE 'America/Argentina/Buenos_Aires')
         < (now() AT TIME ZONE 'America/Argentina/Buenos_Aires' + interval '24 hours')`,
    [TURNO_EMAIL_TIPO.RECORDATORIO_24H]
  );
  return rows.map((r) => r.id);
}
