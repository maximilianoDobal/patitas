import { NextResponse } from "next/server";
import { getSession, requireAdministrador } from "@/lib/auth";
import { createSala, listSalasAdmin } from "@/lib/repos";

export async function GET(request) {
  const session = await getSession();
  try {
    requireAdministrador(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  const sucursalId = request.nextUrl.searchParams.get("sucursalId");
  if (!sucursalId) {
    return NextResponse.json({ error: "sucursalId requerido" }, { status: 400 });
  }
  const salas = await listSalasAdmin(sucursalId);
  return NextResponse.json({ salas });
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
    const sala = await createSala(body);
    return NextResponse.json({ sala }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
