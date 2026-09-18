import { NextResponse } from "next/server";
import { getSession, requireAdministrador } from "@/lib/auth";
import { updateSala } from "@/lib/repos";

export async function PATCH(request, { params }) {
  const session = await getSession();
  try {
    requireAdministrador(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  try {
    const { id } = await params;
    const body = await request.json();
    const sala = await updateSala(id, body);
    return NextResponse.json({ sala });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
