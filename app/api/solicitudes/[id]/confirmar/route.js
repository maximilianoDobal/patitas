import { NextResponse } from "next/server";
import { getSession, requireStaff, ROLES_OPERATIVO } from "@/lib/auth";
import { confirmarSolicitud } from "@/lib/repos";

export async function POST(request, { params }) {
  const session = await getSession();
  try {
    requireStaff(session, ROLES_OPERATIVO);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  try {
    const { id } = await params;
    const body = await request.json().catch(() => ({}));
    const result = await confirmarSolicitud(id, body, session);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
