import { NextResponse } from "next/server";
import { getSession, requireStaff, ROLES_OPERATIVO } from "@/lib/auth";
import { countSolicitudesPendientes } from "@/lib/repos";

export async function GET() {
  const session = await getSession();
  try {
    requireStaff(session, ROLES_OPERATIVO);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  const count = await countSolicitudesPendientes(session.sucursalId);
  return NextResponse.json({ count });
}
