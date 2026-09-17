import { NextResponse } from "next/server";
import { getSession, requireStaff } from "@/lib/auth";
import { createCliente, listClientes } from "@/lib/repos/mockStore";

export async function GET() {
  const session = await getSession();
  try {
    requireStaff(session, ["recepcionista"]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  const clientes = listClientes().filter((c) => c.sucursalId === session.sucursalId);
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
    const cliente = createCliente({ ...body, sucursalId: session.sucursalId });
    return NextResponse.json({ cliente }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
