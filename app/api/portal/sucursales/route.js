import { NextResponse } from "next/server";
import { getSession, requireCliente } from "@/lib/auth";
import { listSucursalesPortal } from "@/lib/repos";

export async function GET() {
  const session = await getSession();
  try {
    requireCliente(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  const sucursales = await listSucursalesPortal();
  return NextResponse.json({ sucursales });
}
