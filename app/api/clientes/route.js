import { NextResponse } from "next/server";
import { getSession, requireStaff } from "@/lib/auth";
import { createCliente, listClientes } from "@/lib/repos";

export async function GET() {
  const session = await getSession();
  try {
    requireStaff(session, ["recepcionista"]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  const clientes = await listClientes(session.sucursalId);
  return NextResponse.json({ clientes });
}

export async function POST(request) {
  const session = await getSession();
  try {
    requireStaff(session, ["recepcionista"]);
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
