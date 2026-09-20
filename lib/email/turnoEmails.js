import { sendEmailJs } from "@/lib/email/sendEmailJs";
import { buildTurnoEmailContent } from "@/lib/email/turnoEmailContent";
import { TURNO_EMAIL_ONCE_PER_TURNO, TURNO_EMAIL_TIPO } from "@/lib/email/turnoEmailTypes";
import {
  loadTurnoEmailContext,
  registrarEnvioTurnoEmail,
  yaEnviadoTurnoEmail,
} from "@/lib/repos/turnoEmails";

function templateIdForTipo(tipo) {
  const map = {
    [TURNO_EMAIL_TIPO.AGENDADO]: process.env.EMAILJS_TEMPLATE_TURNO_AGENDADO_ID,
    [TURNO_EMAIL_TIPO.REPROGRAMADO]: process.env.EMAILJS_TEMPLATE_TURNO_REPROGRAMADO_ID,
    [TURNO_EMAIL_TIPO.CANCELADO]: process.env.EMAILJS_TEMPLATE_TURNO_CANCELADO_ID,
    [TURNO_EMAIL_TIPO.RECORDATORIO_24H]: process.env.EMAILJS_TEMPLATE_TURNO_RECORDATORIO_ID,
  };
  return map[tipo] || process.env.EMAILJS_TEMPLATE_TURNO_ID;
}

export async function enviarEmailTransaccionalTurno(turnoId, tipo) {
  const ctx = await loadTurnoEmailContext(turnoId);
  if (!ctx?.cliente_email?.trim()) {
    return { skipped: true, reason: "sin_email" };
  }

  if (TURNO_EMAIL_ONCE_PER_TURNO.has(tipo) && (await yaEnviadoTurnoEmail(turnoId, tipo))) {
    return { skipped: true, reason: "ya_enviado" };
  }

  const content = buildTurnoEmailContent(tipo, ctx);
  const email = ctx.cliente_email.trim().toLowerCase();

  const { sent } = await sendEmailJs({
    templateId: templateIdForTipo(tipo),
    logLabel: `turno/${tipo}`,
    templateParams: {
      email,
      to_email: email,
      nombre: ctx.cliente_nombre,
      subject: content.subject,
      titulo: content.titulo,
      mensaje: content.mensaje,
      mascota: content.mascota,
      servicio: content.servicio,
      fecha: content.fechaStr,
      hora: content.horaStr,
      sucursal: content.sucursal,
      veterinario: content.veterinario,
      link_portal: content.link_portal,
    },
  });

  if (!sent) {
    return { skipped: true, reason: "emailjs_no_configurado" };
  }

  await registrarEnvioTurnoEmail(turnoId, tipo);
  return { sent: true };
}
