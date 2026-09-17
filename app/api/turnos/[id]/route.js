import { NextResponse } from "next/server";
import { getSession, requireStaff } from "@/lib/auth";
import { getTurnoById, updateTurno } from "@/lib/repos/mockStore";

export async function GET(_request, { params }) {
  const { id } = await params;
  const session = await getSession();
  try {
    requireStaff(session, ["recepcionista", "veterinario"]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  const turno = getTurnoById(id);
  if (!turno) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  if (session.rol === "veterinario" && turno.veterinarioId !== session.userId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }
  return NextResponse.json({ turno });
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const session = await getSession();
  try {
    requireStaff(session, ["recepcionista", "veterinario"]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  try {
    const body = await request.json();
    const turno = updateTurno(id, body, session);
    return NextResponse.json({ turno });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
