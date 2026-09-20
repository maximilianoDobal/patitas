import { REPROGRAM_TURNO_KEYS } from "@/lib/email/turnoEmailTypes";

export function turnoWasCancelled(before, patch) {
  return patch.estado === "cancelado" && before.estado !== "cancelado";
}

export function turnoWasReprogrammed(before, after) {
  for (const key of REPROGRAM_TURNO_KEYS) {
    if (before[key] !== after[key]) return true;
  }
  return false;
}
