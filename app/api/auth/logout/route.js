import { NextResponse } from "next/server";
import { COOKIE_SESSION } from "@/lib/constants";
import { sessionCookieOptions } from "@/lib/auth";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(COOKIE_SESSION, "", { ...sessionCookieOptions(0), maxAge: 0 });
  return response;
}
