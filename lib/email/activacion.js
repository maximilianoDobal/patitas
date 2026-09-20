import { appBaseUrl } from "@/lib/appBaseUrl";
import { sendEmailJs } from "@/lib/email/sendEmailJs";

const GENERIC_OK =
  "Si su email está registrado en la clínica, recibirá un enlace de activación en breve.";

export { GENERIC_OK };

export async function enviarEmailActivacion({ nombre, email, tokenPlano, sucursalNombre }) {
  const link = `${appBaseUrl()}/portal/activar?token=${encodeURIComponent(tokenPlano)}`;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;

  const result = await sendEmailJs({
    templateId,
    logLabel: "activación portal",
    templateParams: {
      email,
      to_email: email,
      nombre,
      link_activacion: link,
      sucursal: sucursalNombre || "Patitas",
    },
  });

  if (!result.sent) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[activación portal] EmailJS no configurado. Link de demo:", link);
    }
    return { sent: false, devLink: link };
  }

  return { sent: true };
}
