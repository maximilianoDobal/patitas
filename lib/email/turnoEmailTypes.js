export const TURNO_EMAIL_TIPO = {
  AGENDADO: "turno_agendado",
  REPROGRAMADO: "turno_reprogramado",
  CANCELADO: "turno_cancelado",
  RECORDATORIO_24H: "recordatorio_24h",
};

/** Tipos que solo pueden enviarse una vez por turno (índice único parcial en DB). */
export const TURNO_EMAIL_ONCE_PER_TURNO = new Set([
  TURNO_EMAIL_TIPO.AGENDADO,
  TURNO_EMAIL_TIPO.CANCELADO,
  TURNO_EMAIL_TIPO.RECORDATORIO_24H,
]);

export const REPROGRAM_TURNO_KEYS = [
  "fecha",
  "horaInicio",
  "veterinarioId",
  "salaId",
  "tipoServicioId",
];

export const TURNO_TZ = "America/Argentina/Buenos_Aires";
