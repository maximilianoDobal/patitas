import { NextResponse } from "next/server";
import {
  createSessionToken,
  getSession,
  requireStaff,
  ROLES_OPERATIVO,
  sessionCookieOptions,
} from "@/lib/auth";
import { COOKIE_SESSION } from "@/lib/constants";
import { switchSucursalActiva } from "@/lib/repos";

export async function POST(request) {
  const session = await getSession();
  try {
    requireStaff(session, ROLES_OPERATIVO);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  try {
    const body = await request.json();
    const updated = await switchSucursalActiva(session, body.sucursalId);
    const token = await createSessionToken({
      sub: updated.userId,
      rol: updated.rol,
      sucursalId: updated.sucursalId,
      nombre: updated.nombre,
    });
    const res = NextResponse.json({
      session: {
        userId: updated.userId,
        rol: updated.rol,
        sucursalId: updated.sucursalId,
        nombre: updated.nombre,
      },
    });
    res.cookies.set(COOKIE_SESSION, token, sessionCookieOptions());
    return res;
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 400 });
  }
}
