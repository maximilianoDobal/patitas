import { NextResponse } from "next/server";
import { getSession, requireAdministrador } from "@/lib/auth";
import { getMatricesAdmin, setSalaTipos, setVeterinarioTipos } from "@/lib/repos";

export async function GET() {
  const session = await getSession();
  try {
    requireAdministrador(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  const matrices = await getMatricesAdmin();
  return NextResponse.json(matrices);
}

export async function PUT(request) {
  const session = await getSession();
  try {
    requireAdministrador(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  try {
    const body = await request.json();
    if (body.veterinarioId && Array.isArray(body.tipoServicioIds)) {
      await setVeterinarioTipos(body.veterinarioId, body.tipoServicioIds);
    }
    if (body.salaId && Array.isArray(body.tipoServicioIds)) {
      await setSalaTipos(body.salaId, body.tipoServicioIds);
    }
    const matrices = await getMatricesAdmin();
    return NextResponse.json(matrices);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
