import { NextResponse } from "next/server";
import { getSession, requireStaff, ROLES_OPERATIVO } from "@/lib/auth";
import { proponerAsignacionSolicitud } from "@/lib/repos";

export async function GET(_request, { params }) {
  const session = await getSession();
  try {
    requireStaff(session, ROLES_OPERATIVO);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  try {
    const { id } = await params;
    const propuesta = await proponerAsignacionSolicitud(id, session.sucursalId);
    return NextResponse.json({ propuesta });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
