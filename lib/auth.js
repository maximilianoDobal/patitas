import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { COOKIE_SESSION } from "@/lib/constants";

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET is required in production");
    }
    return new TextEncoder().encode("patitas-dev-secret-change-me");
  }
  return new TextEncoder().encode(secret);
}

export async function createSessionToken(payload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());
}

export async function verifySessionToken(token) {
  const { payload } = await jwtVerify(token, getSecret());
  return payload;
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_SESSION)?.value;
  if (!token) return null;
  try {
    const payload = await verifySessionToken(token);
    return {
      userId: payload.sub,
      rol: payload.rol,
      sucursalId: payload.sucursalId,
      nombre: payload.nombre,
    };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = 60 * 60 * 12) {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge,
  };
}

export { ROLES_OPERATIVO, isRolOperativo } from "@/lib/constants";

export function requireStaff(session, roles) {
  if (!session) {
    const err = new Error("No autenticado");
    err.status = 401;
    throw err;
  }
  if (roles && !roles.includes(session.rol)) {
    const err = new Error("No autorizado");
    err.status = 403;
    throw err;
  }
  return session;
}
