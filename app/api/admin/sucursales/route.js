import { NextResponse } from "next/server";
import { getSession, requireAdministrador } from "@/lib/auth";
import { createSucursal, listSucursalesAdmin } from "@/lib/repos";

export async function GET() {
  const session = await getSession();
  try {
    requireAdministrador(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  const sucursales = await listSucursalesAdmin();
  return NextResponse.json({ sucursales });
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
    const sucursal = await createSucursal(body);
    return NextResponse.json({ sucursal }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
