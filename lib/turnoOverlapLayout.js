import { getTurnoRange, rangesOverlap } from "@/lib/scheduling";

/** Misma regla que Conflicto de agenda: solapamiento temporal + mismo vet o sala. */
export function turnosAgendaConflict(a, b) {
  if (a.fecha !== b.fecha) return false;
  if (a.estado === "cancelado" || b.estado === "cancelado") return false;
  const sameVet = a.veterinarioId === b.veterinarioId;
  const sameSala = a.salaId === b.salaId;
  if (!sameVet && !sameSala) return false;
  return rangesOverlap(getTurnoRange(a), getTurnoRange(b));
}

/**
 * Asigna columna horizontal a turnos del mismo día que se pisan en el tiempo.
 * @returns {Map<string, { column: number, columnCount: number }>}
 */
export function layoutTurnosOverlapColumns(turnos) {
  const active = turnos.filter((t) => t.estado !== "cancelado");
  const sorted = [...active].sort((a, b) => getTurnoRange(a).start - getTurnoRange(b).start);
  const columnById = new Map();

  for (const t of sorted) {
    const range = getTurnoRange(t);
    const used = new Set();
    for (const other of sorted) {
      if (other.id === t.id || !columnById.has(other.id)) continue;
      if (turnosAgendaConflict(t, other)) {
        used.add(columnById.get(other.id));
      }
    }
    let col = 0;
    while (used.has(col)) col++;
    columnById.set(t.id, col);
  }

  const placements = new Map();
  for (const t of sorted) {
    const range = getTurnoRange(t);
    const clusterIds = new Set([t.id]);
    let changed = true;
    while (changed) {
      changed = false;
      for (const other of sorted) {
        if (clusterIds.has(other.id)) continue;
        for (const inCluster of clusterIds) {
          const a = sorted.find((x) => x.id === inCluster);
          if (turnosAgendaConflict(a, other)) {
            clusterIds.add(other.id);
            changed = true;
            break;
          }
        }
      }
    }
    let maxCol = 0;
    for (const id of clusterIds) {
      maxCol = Math.max(maxCol, columnById.get(id) ?? 0);
    }
    const columnCount = maxCol + 1;
    placements.set(t.id, { column: columnById.get(t.id) ?? 0, columnCount });
  }

  return placements;
}

/** Agrupa turnos del día para filas con tarjetas lado a lado cuando hay solapamiento. */
export function groupTurnosByOverlap(turnos) {
  const sorted = [...turnos].sort(
    (a, b) => a.horaInicio.localeCompare(b.horaInicio) || String(a.id).localeCompare(String(b.id))
  );
  const active = sorted.filter((t) => t.estado !== "cancelado");
  const assigned = new Set();
  const groups = [];

  for (const t of sorted) {
    if (assigned.has(t.id)) continue;
    assigned.add(t.id);

    if (t.estado === "cancelado") {
      groups.push({ kind: "single", turno: t });
      continue;
    }

    const cluster = [t];
    let i = 0;
    while (i < cluster.length) {
      const range = getTurnoRange(cluster[i]);
      for (const other of active) {
        if (assigned.has(other.id)) continue;
        if (turnosAgendaConflict(t, other)) {
          cluster.push(other);
          assigned.add(other.id);
        }
      }
      i++;
    }

    if (cluster.length === 1) {
      groups.push({ kind: "single", turno: t });
    } else {
      groups.push({
        kind: "overlap",
        turnos: cluster.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)),
      });
    }
  }

  return groups;
}
