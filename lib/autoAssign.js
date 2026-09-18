import { assertNoOverlap, getTurnoRange, suggestSalaId } from "@/lib/scheduling";
import { getTipoServicio } from "@/lib/constants";

/**
 * Cuenta minutos ocupados por veterinario en una fecha (turnos no cancelados).
 */
export function minutosOcupadosPorVet(turnosDelDia, veterinarioId) {
  let total = 0;
  for (const t of turnosDelDia) {
    if (t.estado === "cancelado" || t.veterinarioId !== veterinarioId) continue;
    total += getTurnoRange(t).duration;
  }
  return total;
}

/**
 * Elige veterinario habilitado sin conflicto en la franja; desempate por menor carga ese día.
 */
export function pickVeterinarioAutomatico({
  tipoServicioId,
  fecha,
  horaInicio,
  duracionMinutos,
  turnosDelDia,
  veterinariosHabilitados,
  sucursalId,
}) {
  const tipo = getTipoServicio(tipoServicioId);
  const duration = duracionMinutos ?? tipo?.duracionMinutos ?? 30;
  const candidatos = [];

  for (const vetId of veterinariosHabilitados) {
    const probe = {
      id: "__probe__",
      sucursalId,
      fecha,
      horaInicio,
      duracionMinutos: duration,
      tipoServicioId,
      veterinarioId: vetId,
      salaId: null,
      estado: "programado",
    };
    try {
      assertNoOverlap(probe, turnosDelDia);
      candidatos.push({
        veterinarioId: vetId,
        minutosOcupados: minutosOcupadosPorVet(turnosDelDia, vetId),
      });
    } catch {
      /* conflicto — excluido */
    }
  }

  if (candidatos.length === 0) return null;

  candidatos.sort((a, b) => a.minutosOcupados - b.minutosOcupados);
  return candidatos[0].veterinarioId;
}

export function proponerSalaParaVet({
  tipoServicioId,
  veterinarioId,
  salas,
  salaTipos,
  vetPreferida,
}) {
  return suggestSalaId({
    tipoServicioId,
    veterinarioId,
    salas,
    salaTipos,
    vetPreferida,
  });
}
