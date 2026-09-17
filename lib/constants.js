export const TIPOS_SERVICIO = [
  {
    id: "consulta_general",
    nombre: "Consulta general",
    duracionMinutos: 30,
    color: { bg: "bg-sky-50", text: "text-sky-800", border: "border-sky-300", hex: "#4A90E2" },
  },
  {
    id: "vacunacion",
    nombre: "Vacunación",
    duracionMinutos: 30,
    color: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-300", hex: "#27AE60" },
  },
  {
    id: "cirugia",
    nombre: "Cirugía",
    duracionMinutos: 60,
    color: { bg: "bg-red-50", text: "text-red-800", border: "border-red-300", hex: "#E74C3C" },
  },
  {
    id: "estetica",
    nombre: "Estética",
    duracionMinutos: 60,
    color: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-300", hex: "#F5A623" },
  },
];

export const ESTADOS_TURNO = [
  "programado",
  "confirmado",
  "en_atencion",
  "atendido",
  "cancelado",
  "no_asistio",
];

export const CLINICA_HORARIO = {
  inicio: 8,
  fin: 18,
  slotMinutos: 15,
};

export const COOKIE_SESSION = "patitas_session";

export function getTipoServicio(id) {
  return TIPOS_SERVICIO.find((t) => t.id === id) ?? null;
}
