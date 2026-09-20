import { CLINICA_HORARIO } from "@/lib/constants";
import { minutesToTime, parseTimeToMinutes } from "@/lib/scheduling";

/** ISO weekday: 1 = lunes … 7 = domingo */
export const DIAS_SEMANA = [1, 2, 3, 4, 5, 6, 7];

export const DEFAULT_HORARIO_SEMANAL = DIAS_SEMANA.map((diaSemana) => ({
  diaSemana,
  cerrado: diaSemana >= 6,
  tramos: diaSemana <= 5 ? [{ horaInicio: "09:00", horaFin: "18:00" }] : [],
}));

export function diaSemanaFromIsoDate(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay();
  return day === 0 ? 7 : day;
}

export function normalizeTramo(tramo) {
  return {
    horaInicio: String(tramo.horaInicio).slice(0, 5),
    horaFin: String(tramo.horaFin).slice(0, 5),
  };
}

export function validateTramos(tramos, { cerrado } = {}) {
  if (cerrado) {
    if (tramos?.length) throw new Error("Un día cerrado no puede tener tramos.");
    return [];
  }
  if (!tramos?.length) throw new Error("Un día abierto debe tener al menos un tramo.");

  const sorted = tramos.map(normalizeTramo).sort((a, b) => parseTimeToMinutes(a.horaInicio) - parseTimeToMinutes(b.horaInicio));

  let prevEnd = null;
  for (const t of sorted) {
    const start = parseTimeToMinutes(t.horaInicio);
    const end = parseTimeToMinutes(t.horaFin);
    if (start >= end) throw new Error("Cada tramo debe tener hora de inicio anterior a la de fin.");
    if (prevEnd != null && start < prevEnd) {
      throw new Error("Los tramos no pueden solaparse.");
    }
    prevEnd = end;
  }
  return sorted;
}

export function validateHorarioSemanal(dias) {
  if (!Array.isArray(dias) || dias.length !== 7) {
    throw new Error("El horario semanal debe incluir los 7 días.");
  }
  const seen = new Set();
  return dias.map((d) => {
    const diaSemana = Number(d.diaSemana);
    if (!DIAS_SEMANA.includes(diaSemana)) throw new Error("Día de semana inválido.");
    if (seen.has(diaSemana)) throw new Error("Día de semana duplicado.");
    seen.add(diaSemana);
    const cerrado = d.cerrado === true;
    const tramos = validateTramos(d.tramos ?? [], { cerrado });
    return { diaSemana, cerrado, tramos };
  });
}

export function isFechaEnCierre(isoDate, cierres) {
  return (cierres ?? []).some((c) => isoDate >= c.fechaDesde && isoDate <= c.fechaHasta);
}

export function tramosParaDiaSemana(diaSemana, horarioSemanal) {
  const dia = horarioSemanal.find((d) => d.diaSemana === diaSemana);
  if (!dia || dia.cerrado) return [];
  return dia.tramos ?? [];
}

export function tramosParaFecha(isoDate, horarioSemanal, cierres) {
  if (isFechaEnCierre(isoDate, cierres)) return [];
  return tramosParaDiaSemana(diaSemanaFromIsoDate(isoDate), horarioSemanal);
}

export function isFechaAbierta(isoDate, horarioSemanal, cierres) {
  return tramosParaFecha(isoDate, horarioSemanal, cierres).length > 0;
}

export function buildSlotsFromTramos(tramos, { slotMinutos = CLINICA_HORARIO.slotMinutos, duracionMinutos }) {
  const slots = [];
  const dur = duracionMinutos ?? 30;
  for (const tramo of tramos) {
    const start = parseTimeToMinutes(tramo.horaInicio);
    const end = parseTimeToMinutes(tramo.horaFin);
    for (let m = start; m + dur <= end; m += slotMinutos) {
      slots.push(minutesToTime(m));
    }
  }
  return [...new Set(slots)];
}

export function turnoCabeEnTramos(horaInicio, duracionMinutos, tramos) {
  const start = parseTimeToMinutes(horaInicio);
  const end = start + duracionMinutos;
  return tramos.some((t) => {
    const tStart = parseTimeToMinutes(t.horaInicio);
    const tEnd = parseTimeToMinutes(t.horaFin);
    return start >= tStart && end <= tEnd;
  });
}

export function assertTurnoDentroHorarioSucursal({ fecha, horaInicio, duracionMinutos }, horarioSemanal, cierres) {
  const tramos = tramosParaFecha(fecha, horarioSemanal, cierres);
  if (!tramos.length) {
    throw new Error("La sucursal no atiende en la fecha seleccionada.");
  }
  if (!turnoCabeEnTramos(horaInicio, duracionMinutos, tramos)) {
    throw new Error("La hora del turno queda fuera del horario de atención de la sucursal.");
  }
}

export function computeGridHourBounds(horarioSemanal, weekDates, cierres) {
  let minMin = null;
  let maxMin = null;
  for (const fecha of weekDates) {
    for (const t of tramosParaFecha(fecha, horarioSemanal, cierres)) {
      const s = parseTimeToMinutes(t.horaInicio);
      const e = parseTimeToMinutes(t.horaFin);
      minMin = minMin == null ? s : Math.min(minMin, s);
      maxMin = maxMin == null ? e : Math.max(maxMin, e);
    }
  }
  if (minMin == null) {
    return { inicio: CLINICA_HORARIO.inicio, fin: CLINICA_HORARIO.fin };
  }
  return {
    inicio: Math.floor(minMin / 60),
    fin: Math.ceil(maxMin / 60),
  };
}

export function fechasCerradasEnRango(desde, hasta, horarioSemanal, cierres) {
  const out = [];
  let cur = desde;
  while (cur <= hasta) {
    if (!isFechaAbierta(cur, horarioSemanal, cierres)) out.push(cur);
    const d = new Date(`${cur}T12:00:00`);
    d.setDate(d.getDate() + 1);
    cur = d.toISOString().slice(0, 10);
  }
  return out;
}

export function intervalosFueraDeTramos(tramos, gridStartMin, gridEndMin) {
  const open = (tramos ?? [])
    .map((t) => [parseTimeToMinutes(t.horaInicio), parseTimeToMinutes(t.horaFin)])
    .sort((a, b) => a[0] - b[0]);
  const closed = [];
  let cur = gridStartMin;
  for (const [s, e] of open) {
    if (cur < s) closed.push([cur, s]);
    cur = Math.max(cur, e);
  }
  if (cur < gridEndMin) closed.push([cur, gridEndMin]);
  return closed;
}

export function turnoFueraDeHorarioSemanal(turno, horarioSemanal, cierres) {
  if (turno.estado === "cancelado") return false;
  const tramos = tramosParaFecha(turno.fecha, horarioSemanal, cierres);
  if (!tramos.length) return true;
  const dur = turno.duracionMinutos ?? 30;
  return !turnoCabeEnTramos(turno.horaInicio, dur, tramos);
}
