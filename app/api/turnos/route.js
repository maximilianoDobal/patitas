import { NextResponse } from "next/server";
import { getSession, requireStaff } from "@/lib/auth";
import { createTurno, listTurnos } from "@/lib/repos";

export async function GET(request) {
  const session = await getSession();
  try {
    requireStaff(session, ["recepcionista", "veterinario"]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  const { searchParams } = new URL(request.url);
  const filters = {
    sucursalId: session.sucursalId,
    fecha: searchParams.get("fecha") || undefined,
    fechaDesde: searchParams.get("fechaDesde") || undefined,
    fechaHasta: searchParams.get("fechaHasta") || undefined,
    salaId: searchParams.get("salaId") || undefined,
    veterinarioId: searchParams.get("veterinarioId") || undefined,
    estado: searchParams.get("estado") || undefined,
  };

  if (session.rol === "veterinario" && !searchParams.get("veterinarioId")) {
    filters.veterinarioId = session.userId;
  }

  return NextResponse.json({ turnos: await listTurnos(filters) });
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
    const turno = await createTurno(
      {
        ...body,
        sucursalId: session.sucursalId,
      },
      session
    );
    return NextResponse.json({ turno }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
