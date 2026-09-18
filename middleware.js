import { NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { COOKIE_SESSION, isRolOperativo } from "@/lib/constants";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    return new TextEncoder().encode("patitas-dev-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico" ||
    pathname === "/login" ||
    pathname === "/api/auth/login"
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_SESSION)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const rol = payload.rol;

    const recepOnlyPage = pathname === "/clientes" || pathname === "/mascotas";
    const vetOnlyPage = pathname === "/consultas";
    if (recepOnlyPage && rol === "veterinario") {
      return NextResponse.redirect(new URL("/sin-acceso", request.url));
    }
    if (vetOnlyPage && rol !== "veterinario") {
      return NextResponse.redirect(new URL("/agenda", request.url));
    }

    const operativo = isRolOperativo(rol);
    if (pathname.startsWith("/api/clientes") && !operativo) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (pathname.startsWith("/api/mascotas") && request.method !== "GET" && !operativo) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (pathname.startsWith("/api/auth/switch-sucursal") && !operativo) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (pathname.startsWith("/api/consultas") && rol !== "veterinario") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    return NextResponse.next();
  } catch {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Sesión inválida" }, { status: 401 });
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
