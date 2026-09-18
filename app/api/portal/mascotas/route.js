import { NextResponse } from "next/server";
import { getSession, requireCliente } from "@/lib/auth";
import { listMascotasForCliente } from "@/lib/repos";

export async function GET() {
  const session = await getSession();
  try {
    requireCliente(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  const mascotas = await listMascotasForCliente(session.userId);
  return NextResponse.json({ mascotas });
}
