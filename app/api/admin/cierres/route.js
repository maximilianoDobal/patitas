import { NextResponse } from "next/server";
import { getSession, requireAdministrador } from "@/lib/auth";
import {
  createCierreSucursal,
  createCierreTodasSucursales,
  deleteCierreSucursal,
  listCierresAdmin,
} from "@/lib/repos/horarioSucursal";

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
  const cierres = await listCierresAdmin(sucursalId);
  return NextResponse.json({ cierres });
}

export async function POST(request) {
  const session = await getSession();
  try {
    requireAdministrador(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  try {
    const body = await request.json();
    const result = body.todasSucursales
      ? await createCierreTodasSucursales(body)
      : await createCierreSucursal(body);
    return NextResponse.json(result, { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}

export async function DELETE(request) {
  const session = await getSession();
  try {
    requireAdministrador(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "id es obligatorio." }, { status: 400 });
  }
  try {
    await deleteCierreSucursal(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
