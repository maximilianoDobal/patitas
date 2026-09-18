import { NextResponse } from "next/server";
import { getSession, requireCliente } from "@/lib/auth";
import { createSolicitudTurno, listSolicitudesCliente } from "@/lib/repos";

export async function GET() {
  const session = await getSession();
  try {
    requireCliente(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  const solicitudes = await listSolicitudesCliente(session.userId);
  return NextResponse.json({ solicitudes });
}

export async function POST(request) {
  const session = await getSession();
  try {
    requireCliente(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  try {
    const body = await request.json();
    const solicitud = await createSolicitudTurno(body, session.userId);
    return NextResponse.json({ solicitud }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
