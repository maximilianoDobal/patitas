import { appBaseUrl } from "@/lib/appBaseUrl";
import { getTipoServicio } from "@/lib/constants";
import { formatFechaHoraTurno } from "@/lib/email/turnoEmailTime";
import { TURNO_EMAIL_TIPO } from "@/lib/email/turnoEmailTypes";

function sucursalLinea(ctx) {
  const parts = [ctx.sucursal_nombre];
  if (ctx.sucursal_direccion) parts.push(ctx.sucursal_direccion);
  if (ctx.sucursal_localidad) parts.push(ctx.sucursal_localidad);
  return parts.filter(Boolean).join(" — ");
}

function servicioNombre(tipoServicioId) {
  return getTipoServicio(tipoServicioId)?.nombre ?? tipoServicioId;
}

function detalleTurno(ctx) {
  const { fechaStr, horaStr } = formatFechaHoraTurno(ctx.fecha, ctx.hora_inicio);
  const servicio = servicioNombre(ctx.tipo_servicio_id);
  return {
    fechaStr,
    horaStr,
    servicio,
    mascota: ctx.mascota_nombre,
    sucursal: sucursalLinea(ctx),
    veterinario: ctx.veterinario_nombre,
    link_portal: `${appBaseUrl()}/portal/turnos`,
  };
}

export function buildTurnoEmailContent(tipo, ctx) {
  const d = detalleTurno(ctx);
  const nombre = ctx.cliente_nombre || "Cliente";

  switch (tipo) {
    case TURNO_EMAIL_TIPO.AGENDADO:
      return {
        subject: `Turno agendado — ${d.mascota}`,
        titulo: "Tu turno fue agendado",
        mensaje: `Hola ${nombre}, registramos un turno para ${d.mascota}.`,
        ...d,
      };
    case TURNO_EMAIL_TIPO.REPROGRAMADO:
      return {
        subject: `Turno reprogramado — ${d.mascota}`,
        titulo: "Tu turno fue reprogramado",
        mensaje: `Hola ${nombre}, actualizamos la cita de ${d.mascota}. Por favor tené en cuenta la nueva fecha y hora.`,
        ...d,
      };
    case TURNO_EMAIL_TIPO.CANCELADO:
      return {
        subject: `Turno cancelado — ${d.mascota}`,
        titulo: "Tu turno fue cancelado",
        mensaje: `Hola ${nombre}, la cita de ${d.mascota} fue cancelada. Contactá a la clínica para reagendar si lo necesitás.`,
        ...d,
      };
    case TURNO_EMAIL_TIPO.RECORDATORIO_24H:
      return {
        subject: `Recordatorio: turno mañana — ${d.mascota}`,
        titulo: "Recordatorio de turno",
        mensaje: `Hola ${nombre}, te recordamos que mañana tenés turno para ${d.mascota}.`,
        ...d,
      };
    default:
      throw new Error(`Tipo de email de turno desconocido: ${tipo}`);
  }
}
