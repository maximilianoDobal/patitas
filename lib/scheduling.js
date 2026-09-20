import { CLINICA_HORARIO, getTipoServicio } from "@/lib/constants";

export function parseTimeToMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

export function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export function getTurnoRange(turno) {
  const start = parseTimeToMinutes(turno.horaInicio);
  const tipo = getTipoServicio(turno.tipoServicioId);
  const duration = turno.duracionMinutos ?? tipo?.duracionMinutos ?? 30;
  return { start, end: start + duration, duration };
}

export function rangesOverlap(a, b) {
  return a.start < b.end && b.start < a.end;
}

export function assertNoOverlap(turno, others, { ignoreTurnoId } = {}) {
  if (turno.excepcionAgenda) return;

  const range = getTurnoRange(turno);
  for (const other of others) {
    if (other.id === ignoreTurnoId || other.estado === "cancelado") continue;
    if (other.fecha !== turno.fecha) continue;
    const sameVet = other.veterinarioId === turno.veterinarioId;
    const sameSala = other.salaId === turno.salaId;
    if (!sameVet && !sameSala) continue;
    const otherRange = getTurnoRange(other);
    if (rangesOverlap(range, otherRange)) {
      const reason = sameVet && sameSala ? "veterinario y sala" : sameVet ? "veterinario" : "sala";
      throw new Error(`Conflicto de agenda: solapamiento por ${reason}.`);
    }
  }
}

export function buildTimeSlots() {
  const { inicio, fin, slotMinutos } = CLINICA_HORARIO;
  const slots = [];
  for (let m = inicio * 60; m < fin * 60; m += slotMinutos) {
    slots.push(minutesToTime(m));
  }
  return slots;
}

export function suggestSalaId({ tipoServicioId, veterinarioId, salas, salaTipos, vetPreferida }) {
  const allowed = salas.filter((s) =>
    salaTipos.some((st) => st.salaId === s.id && st.tipoServicioId === tipoServicioId)
  );
  if (allowed.length === 0) return salas[0]?.id ?? null;
  if (vetPreferida?.salaId) {
    const pref = allowed.find((s) => s.id === vetPreferida.salaId);
    if (pref) return pref.id;
  }
  return allowed[0].id;
}
