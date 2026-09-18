import { NextResponse } from "next/server";
import { consumirTokenActivacion, solicitarActivacionPortal } from "@/lib/repos";

export async function POST(request) {
  const body = await request.json();

  if (body.token && body.password) {
    try {
      await consumirTokenActivacion(body.token, body.password);
      return NextResponse.json({ ok: true, message: "Portal activado. Ya puede iniciar sesión." });
    } catch (e) {
      return NextResponse.json({ error: e.message }, { status: 400 });
    }
  }

  const email = body.email?.trim();
  if (!email) {
    return NextResponse.json({ error: "Email requerido" }, { status: 400 });
  }

  try {
    const result = await solicitarActivacionPortal(email);
    return NextResponse.json(result);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
