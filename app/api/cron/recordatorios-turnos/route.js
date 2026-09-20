import { NextResponse } from "next/server";
import { dispatchRecordatoriosTurno } from "@/lib/email/turnoNotify";

function authorizeCron(request) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return { ok: false, status: 503, error: "CRON_SECRET no configurado" };
  }
  const header = request.headers.get("authorization");
  const bearer = header?.startsWith("Bearer ") ? header.slice(7).trim() : null;
  const querySecret = request.nextUrl.searchParams.get("secret")?.trim();
  const provided = bearer || querySecret;
  if (!provided || provided !== secret) {
    return { ok: false, status: 401, error: "No autorizado" };
  }
  return { ok: true };
}

export async function POST(request) {
  const auth = authorizeCron(request);
  if (!auth.ok) {
    return NextResponse.json({ error: auth.error }, { status: auth.status });
  }

  const results = await dispatchRecordatoriosTurno();
  return NextResponse.json({ ok: true, ...results });
}
