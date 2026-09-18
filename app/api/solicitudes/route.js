import { NextResponse } from "next/server";
import { getSession, requireStaff, ROLES_OPERATIVO } from "@/lib/auth";
import { listSolicitudesPendientes } from "@/lib/repos";

export async function GET() {
  const session = await getSession();
  try {
    requireStaff(session, ROLES_OPERATIVO);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  const solicitudes = await listSolicitudesPendientes(session.sucursalId);
  return NextResponse.json({ solicitudes });
}
