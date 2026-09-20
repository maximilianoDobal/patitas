export const CATEGORIAS_EXCEPCION_AGENDA = ["emergencia", "imprevisto", "otro"];

export const MOTIVO_EXCEPCION_MIN_LENGTH = 10;

export function normalizeExcepcionAgendaFields(input, existing = {}) {
  if (input.excepcionAgenda === undefined) {
    return {
      excepcionAgenda: existing.excepcionAgenda ?? false,
      categoriaExcepcionAgenda: existing.categoriaExcepcionAgenda ?? null,
      motivoExcepcionAgenda: existing.motivoExcepcionAgenda ?? null,
    };
  }
  if (!input.excepcionAgenda) {
    return {
      excepcionAgenda: false,
      categoriaExcepcionAgenda: null,
      motivoExcepcionAgenda: null,
    };
  }
  const motivoRaw = input.motivoExcepcionAgenda ?? existing.motivoExcepcionAgenda ?? "";
  return {
    excepcionAgenda: true,
    categoriaExcepcionAgenda: input.categoriaExcepcionAgenda ?? existing.categoriaExcepcionAgenda ?? null,
    motivoExcepcionAgenda: String(motivoRaw).trim(),
  };
}

export function validateExcepcionAgendaFields(turno) {
  if (!turno.excepcionAgenda) return;
  if (!CATEGORIAS_EXCEPCION_AGENDA.includes(turno.categoriaExcepcionAgenda)) {
    throw new Error("Elegí una categoría de excepción de agenda.");
  }
  const motivo = (turno.motivoExcepcionAgenda ?? "").trim();
  if (motivo.length < MOTIVO_EXCEPCION_MIN_LENGTH) {
    throw new Error(`El motivo de excepción debe tener al menos ${MOTIVO_EXCEPCION_MIN_LENGTH} caracteres.`);
  }
}
