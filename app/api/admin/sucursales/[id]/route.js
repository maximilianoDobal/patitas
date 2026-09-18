import { NextResponse } from "next/server";
import { getSession, requireAdministrador } from "@/lib/auth";
import { updateSucursal } from "@/lib/repos";

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
    const sucursal = await updateSucursal(id, body);
    return NextResponse.json({ sucursal });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
