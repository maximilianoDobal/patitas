import { NextResponse } from "next/server";
import { getSession, requireAdministrador } from "@/lib/auth";
import { getHorarioSemanalSucursal, setHorarioSemanalSucursal } from "@/lib/repos/horarioSucursal";

export async function GET(request) {
  const session = await getSession();
  try {
    requireAdministrador(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  const sucursalId = request.nextUrl.searchParams.get("sucursalId");
  if (!sucursalId) {
    return NextResponse.json({ error: "sucursalId es obligatorio." }, { status: 400 });
  }
  const horario = await getHorarioSemanalSucursal(sucursalId);
  return NextResponse.json(horario);
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
    if (!body.sucursalId) {
      return NextResponse.json({ error: "sucursalId es obligatorio." }, { status: 400 });
    }
    const result = await setHorarioSemanalSucursal(body.sucursalId, body.dias);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
