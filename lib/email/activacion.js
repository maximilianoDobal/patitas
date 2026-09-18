const GENERIC_OK =
  "Si su email está registrado en la clínica, recibirá un enlace de activación en breve.";

export { GENERIC_OK };

function appBaseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export async function enviarEmailActivacion({ nombre, email, tokenPlano, sucursalNombre }) {
  const link = `${appBaseUrl()}/portal/activar?token=${encodeURIComponent(tokenPlano)}`;

  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const templateId = process.env.EMAILJS_TEMPLATE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info("[activación portal] EmailJS no configurado. Link de demo:", link);
    }
    return { sent: false, devLink: link };
  }

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: {
        to_email: email,
        nombre,
        link_activacion: link,
        sucursal: sucursalNombre || "Patitas",
      },
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`No se pudo enviar el email de activación (${res.status}): ${text}`);
  }

  return { sent: true };
}
