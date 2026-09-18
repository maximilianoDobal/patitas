import { NextResponse } from "next/server";
import { getSession, requireStaff, ROLES_OPERATIVO } from "@/lib/auth";
import { createCliente, listClientes } from "@/lib/repos";

export async function GET(request) {
  const session = await getSession();
  try {
    requireStaff(session, ROLES_OPERATIVO);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  const q = request.nextUrl.searchParams.get("q") ?? undefined;
  const clientes = await listClientes({ q });
  return NextResponse.json({ clientes });
}

export async function POST(request) {
  const session = await getSession();
  try {
    requireStaff(session, ROLES_OPERATIVO);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  try {
    const body = await request.json();
    const cliente = await createCliente({ ...body, sucursalId: session.sucursalId });
    return NextResponse.json({ cliente }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
