import bcrypt from "bcryptjs";
import { createHash, randomBytes, randomUUID } from "crypto";
import { query, withTransaction } from "@/lib/db/pool";
import { enviarEmailActivacion, GENERIC_OK } from "@/lib/email/activacion";

const TOKEN_BYTES = 32;
const EXPIRY_HOURS = 48;

function hashToken(token) {
  return createHash("sha256").update(token).digest("hex");
}

export { GENERIC_OK };

export async function clienteTienePortalActivado(usuarioId) {
  const { rows } = await query(
    "SELECT 1 FROM activaciones_portal WHERE usuario_id = $1 AND usado_en IS NOT NULL LIMIT 1",
    [usuarioId]
  );
  return rows.length > 0;
}

async function findClienteByEmail(email) {
  const { rows } = await query(
    `SELECT u.id, u.nombre, u.email, u.sucursal_id, s.nombre_comercial AS sucursal_nombre
     FROM usuarios u
     JOIN clientes c ON c.usuario_id = u.id
     JOIN sucursales s ON s.id = u.sucursal_id
     WHERE lower(u.email) = lower($1) AND u.rol = 'cliente'`,
    [email.trim()]
  );
  return rows[0] ?? null;
}

export async function solicitarActivacionPortalPorClienteId(clienteId) {
  const { rows } = await query(
    `SELECT u.id, u.nombre, u.email, s.nombre_comercial AS sucursal_nombre
     FROM usuarios u
     JOIN clientes c ON c.usuario_id = u.id
     JOIN sucursales s ON s.id = u.sucursal_id
     WHERE u.id = $1 AND u.rol = 'cliente'`,
    [clienteId]
  );
  const cliente = rows[0];
  if (!cliente) throw new Error("Cliente no encontrado.");

  const activado = await clienteTienePortalActivado(cliente.id);
  if (activado) throw new Error("Este cliente ya activó el portal.");

  await crearYEnviarTokenActivacion({
    usuarioId: cliente.id,
    nombre: cliente.nombre,
    email: cliente.email,
    sucursalNombre: cliente.sucursal_nombre,
  });
  return { ok: true };
}

export async function solicitarActivacionPortal(email) {
  const cliente = await findClienteByEmail(email);
  if (cliente) {
    const activado = await clienteTienePortalActivado(cliente.id);
    if (!activado) {
      await crearYEnviarTokenActivacion({
      usuarioId: cliente.id,
      nombre: cliente.nombre,
      email: cliente.email,
      sucursalNombre: cliente.sucursal_nombre,
      });
    }
  }
  return { message: GENERIC_OK };
}

export async function crearYEnviarTokenActivacion({ usuarioId, nombre, email, sucursalNombre }) {
  const tokenPlano = randomBytes(TOKEN_BYTES).toString("hex");
  const tokenHash = hashToken(tokenPlano);
  const expira = new Date(Date.now() + EXPIRY_HOURS * 60 * 60 * 1000);

  await query(
    `INSERT INTO activaciones_portal (id, token_hash, usuario_id, expira_en)
     VALUES ($1, $2, $3, $4)`,
    [randomUUID(), tokenHash, usuarioId, expira.toISOString()]
  );

  await enviarEmailActivacion({ nombre, email, tokenPlano, sucursalNombre });
}

export async function consumirTokenActivacion(tokenPlano, password) {
  if (!tokenPlano?.trim() || !password || password.length < 6) {
    throw new Error("Token inválido o contraseña demasiado corta (mínimo 6 caracteres).");
  }

  const tokenHash = hashToken(tokenPlano.trim());
  const { rows } = await query(
    `SELECT a.id, a.usuario_id, a.expira_en, a.usado_en, u.rol
     FROM activaciones_portal a
     JOIN usuarios u ON u.id = a.usuario_id
     WHERE a.token_hash = $1`,
    [tokenHash]
  );
  const row = rows[0];
  if (!row || row.rol !== "cliente") {
    throw new Error("El enlace de activación no es válido.");
  }
  if (row.usado_en) {
    throw new Error("Este enlace ya fue utilizado.");
  }
  const yaActivado = await clienteTienePortalActivado(row.usuario_id);
  if (yaActivado) {
    throw new Error("El portal ya está activado. Use recuperación de contraseña en mostrador.");
  }
  if (new Date(row.expira_en) < new Date()) {
    throw new Error("El enlace de activación expiró. Solicite uno nuevo.");
  }

  const passwordHash = await bcrypt.hash(password, 10);

  await withTransaction(async (client) => {
    await client.query("UPDATE usuarios SET password_hash = $2 WHERE id = $1", [
      row.usuario_id,
      passwordHash,
    ]);
    await client.query("UPDATE activaciones_portal SET usado_en = now() WHERE id = $1", [row.id]);
  });

  return { usuarioId: row.usuario_id };
}

export async function verifyClienteCredentials(email, password) {
  const { rows } = await query(
    `SELECT id, nombre, email, rol, sucursal_id, password_hash, activo FROM usuarios
     WHERE lower(email) = lower($1) AND rol = 'cliente'`,
    [email]
  );
  const user = rows[0];
  if (!user || user.activo === false) return null;

  const activado = await clienteTienePortalActivado(user.id);
  if (!activado) return null;

  const ok = await bcrypt.compare(password, user.password_hash);
  if (!ok) return null;

  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    sucursalId: user.sucursal_id,
  };
}
