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

function isPublicPath(pathname) {
  if (pathname === "/login" || pathname === "/admin/ingreso") return true;
  if (pathname === "/portal/ingreso" || pathname === "/portal/activar") return true;
  if (pathname === "/api/auth/login") return true;
  if (pathname === "/api/auth/login-portal") return true;
  if (pathname === "/api/auth/login-admin") return true;
  if (pathname === "/api/auth/activacion") return true;
  if (pathname === "/api/auth/logout") return true;
  if (pathname === "/api/cron/recordatorios-turnos") return true;
  return false;
}

export async function middleware(request) {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname === "/favicon.ico") {
    return NextResponse.next();
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(COOKIE_SESSION)?.value;
  if (!token) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    if (pathname.startsWith("/portal")) {
      return NextResponse.redirect(new URL("/portal/ingreso", request.url));
    }
    if (pathname.startsWith("/admin")) {
      return NextResponse.redirect(new URL("/admin/ingreso", request.url));
    }
    return NextResponse.redirect(new URL("/login", request.url));
  }

  try {
    const { payload } = await jwtVerify(token, getSecret());
    const rol = payload.rol;

    if (rol === "cliente") {
      const allowedPage = pathname.startsWith("/portal");
      const allowedApi =
        pathname.startsWith("/api/portal") ||
        pathname.startsWith("/api/auth/logout") ||
        pathname.startsWith("/api/me");
      if (pathname.startsWith("/api/") && !allowedApi) {
        return NextResponse.json({ error: "No autorizado" }, { status: 403 });
      }
      if (!pathname.startsWith("/api/") && !allowedPage) {
        return NextResponse.redirect(new URL("/portal/inicio", request.url));
      }
      return NextResponse.next();
    }

    if (pathname.startsWith("/portal")) {
      return NextResponse.redirect(new URL("/agenda", request.url));
    }

    const recepOnlyPage = pathname === "/clientes" || pathname === "/mascotas" || pathname === "/solicitudes";
    const vetOnlyPage = pathname === "/consultas";
    const adminOnlyPage = pathname.startsWith("/admin");

    if (recepOnlyPage && rol === "veterinario") {
      return NextResponse.redirect(new URL("/sin-acceso", request.url));
    }
    if (vetOnlyPage && rol !== "veterinario") {
      return NextResponse.redirect(new URL("/agenda", request.url));
    }
    if (adminOnlyPage && rol !== "administrador") {
      return NextResponse.redirect(new URL("/sin-acceso", request.url));
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
    if (pathname.startsWith("/api/solicitudes") && !operativo) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (pathname.startsWith("/api/admin") && rol !== "administrador") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (pathname.startsWith("/api/consultas") && rol !== "veterinario") {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    if (pathname.startsWith("/api/portal")) {
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
