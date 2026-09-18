import { NextResponse } from "next/server";
import { getSession, requireStaff, ROLES_OPERATIVO } from "@/lib/auth";
import { cancelarSolicitud } from "@/lib/repos";

export async function POST(_request, { params }) {
  const session = await getSession();
  try {
    requireStaff(session, ROLES_OPERATIVO);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  try {
    const { id } = await params;
    await cancelarSolicitud(id, session);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
