import { NextResponse } from "next/server";
import { getSession, requireStaff } from "@/lib/auth";
import { createMascota, listMascotas } from "@/lib/repos/mockStore";

export async function GET(request) {
  const session = await getSession();
  try {
    requireStaff(session, ["recepcionista", "veterinario"]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  const { searchParams } = new URL(request.url);
  const clienteId = searchParams.get("clienteId") || undefined;
  return NextResponse.json({ mascotas: listMascotas({ clienteId }) });
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
    const result = createMascota(body);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
