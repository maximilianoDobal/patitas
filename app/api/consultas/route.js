import { NextResponse } from "next/server";
import { getSession, requireStaff } from "@/lib/auth";
import { listConsultasByMascota, upsertConsultaForTurno } from "@/lib/repos/mockStore";

export async function GET(request) {
  const session = await getSession();
  try {
    requireStaff(session, ["recepcionista", "veterinario"]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  const mascotaId = new URL(request.url).searchParams.get("mascotaId");
  if (!mascotaId) {
    return NextResponse.json({ error: "mascotaId requerido" }, { status: 400 });
  }
  return NextResponse.json({ consultas: listConsultasByMascota(mascotaId) });
}

export async function POST(request) {
  const session = await getSession();
  try {
    requireStaff(session, ["veterinario"]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  try {
    const body = await request.json();
    if (!body.turnoId) throw new Error("turnoId requerido");
    const consulta = upsertConsultaForTurno(body.turnoId, body, session);
    return NextResponse.json({ consulta }, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
