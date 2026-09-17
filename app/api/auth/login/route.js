import { NextResponse } from "next/server";
import { createSessionToken, sessionCookieOptions } from "@/lib/auth";
import { COOKIE_SESSION } from "@/lib/constants";
import { verifyStaffCredentials } from "@/lib/repos/mockStore";

export async function POST(request) {
  const body = await request.json();
  const email = body.email?.trim();
  const password = body.password ?? "";
  if (!email || !password) {
    return NextResponse.json({ error: "Email y contraseña requeridos" }, { status: 400 });
  }

  const user = await verifyStaffCredentials(email, password);
  if (!user) {
    return NextResponse.json({ error: "Credenciales inválidas" }, { status: 401 });
  }

  const token = await createSessionToken({
    sub: user.id,
    rol: user.rol,
    sucursalId: user.sucursalId,
    nombre: user.nombre,
  });

  const response = NextResponse.json({ user: { id: user.id, nombre: user.nombre, rol: user.rol } });
  response.cookies.set(COOKIE_SESSION, token, sessionCookieOptions());
  return response;
}
