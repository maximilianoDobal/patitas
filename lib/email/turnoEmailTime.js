import { TURNO_TZ } from "@/lib/email/turnoEmailTypes";

/** Ventana fija ~24 h antes: entre 23 h y 24 h del inicio del turno. */
export function isInRecordatorioWindow(turnoStartMs, nowMs = Date.now()) {
  const msUntil = turnoStartMs - nowMs;
  const h23 = 23 * 60 * 60 * 1000;
  const h24 = 24 * 60 * 60 * 1000;
  return msUntil >= h23 && msUntil < h24;
}

/**
 * Interpreta fecha + hora del turno en America/Argentina/Buenos_Aires.
 * MVP: offset -03:00 (sin DST). La ventana del cron usa AT TIME ZONE en SQL
 * (`listTurnosEnVentanaRecordatorio`); mantener ambos alineados si cambia la TZ.
 */
export function turnoStartMs(fecha, horaInicio) {
  const f = String(fecha).slice(0, 10);
  const hm = String(horaInicio).slice(0, 5);
  return new Date(`${f}T${hm}:00-03:00`).getTime();
}

export function formatFechaHoraTurno(fecha, horaInicio) {
  const start = new Date(turnoStartMs(fecha, horaInicio));
  const fechaStr = start.toLocaleDateString("es-AR", {
    timeZone: TURNO_TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const horaStr = start.toLocaleTimeString("es-AR", {
    timeZone: TURNO_TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return { fechaStr, horaStr };
}
