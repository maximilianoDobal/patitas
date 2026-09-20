/**
 * Envío server-side vía EmailJS (mismo patrón que activación portal).
 */
export async function sendEmailJs({ templateId, templateParams, logLabel }) {
  const serviceId = process.env.EMAILJS_SERVICE_ID;
  const publicKey = process.env.EMAILJS_PUBLIC_KEY;
  const privateKey = process.env.EMAILJS_PRIVATE_KEY;

  if (!serviceId || !templateId || !publicKey || !privateKey) {
    if (process.env.NODE_ENV !== "production") {
      console.info(`[${logLabel}] EmailJS no configurado. Params:`, templateParams);
    }
    return { sent: false };
  }

  const res = await fetch("https://api.emailjs.com/api/v1.0/email/send", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      service_id: serviceId,
      template_id: templateId,
      user_id: publicKey,
      accessToken: privateKey,
      template_params: templateParams,
    }),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`EmailJS (${logLabel}) ${res.status}: ${text}`);
  }

  return { sent: true };
}
