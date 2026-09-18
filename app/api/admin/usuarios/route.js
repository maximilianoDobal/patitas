import { NextResponse } from "next/server";
import { getSession, requireAdministrador } from "@/lib/auth";
import { createStaffUsuario, listStaffUsuarios } from "@/lib/repos";

export async function GET() {
  const session = await getSession();
  try {
    requireAdministrador(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  const usuarios = await listStaffUsuarios();
  return NextResponse.json({ usuarios });
}

export async function POST(request) {
  const session = await getSession();
  try {
    requireAdministrador(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  try {
    const body = await request.json();
    const usuario = await createStaffUsuario(body);
    return NextResponse.json({ usuario }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
