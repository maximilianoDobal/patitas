import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { query, withTransaction } from "@/lib/db/pool";
import { seedDefaultHorarioSucursal } from "@/lib/repos/horarioSucursal";

function mapUsuarioStaff(row) {
  return {
    id: row.id,
    nombre: row.nombre,
    email: row.email,
    telefono: row.telefono ?? "",
    rol: row.rol,
    sucursalId: row.sucursal_id,
    activo: row.activo !== false,
    matricula: row.matricula ?? null,
    especialidadProfesional: row.especialidad_profesional ?? null,
  };
}

export async function listStaffUsuarios() {
  const { rows } = await query(
    `SELECT u.id, u.nombre, u.email, u.telefono, u.rol, u.sucursal_id, u.activo,
            v.matricula, v.especialidad_profesional
     FROM usuarios u
     LEFT JOIN veterinarios v ON v.usuario_id = u.id
     WHERE u.rol IN ('recepcionista', 'veterinario')
     ORDER BY u.nombre`
  );
  return rows.map(mapUsuarioStaff);
}

export async function createStaffUsuario(input) {
  const rol = input.rol;
  if (!["recepcionista", "veterinario"].includes(rol)) {
    throw new Error("Rol de staff inválido.");
  }
  if (!input.nombre?.trim() || !input.email?.trim() || !input.password || !input.sucursalId) {
    throw new Error("Nombre, email, contraseña y sucursal son obligatorios.");
  }

  const id = randomUUID();
  const passwordHash = await bcrypt.hash(input.password, 10);

  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO usuarios (id, sucursal_id, nombre, email, telefono, password_hash, rol, activo)
         VALUES ($1,$2,$3,$4,$5,$6,$7,true)`,
        [
          id,
          input.sucursalId,
          input.nombre.trim(),
          input.email.trim().toLowerCase(),
          input.telefono?.trim() || null,
          passwordHash,
          rol,
        ]
      );
      if (rol === "recepcionista") {
        await client.query("INSERT INTO recepcionistas (usuario_id) VALUES ($1)", [id]);
      } else {
        await client.query(
          "INSERT INTO veterinarios (usuario_id, matricula, especialidad_profesional) VALUES ($1,$2,$3)",
          [id, input.matricula?.trim() || null, input.especialidadProfesional?.trim() || null]
        );
      }
    });
  } catch (e) {
    if (e.code === "23505") throw new Error("Ya existe un usuario con ese email.");
    throw e;
  }

  return mapUsuarioStaff({
    id,
    nombre: input.nombre.trim(),
    email: input.email.trim().toLowerCase(),
    telefono: input.telefono,
    rol,
    sucursal_id: input.sucursalId,
    activo: true,
    matricula: input.matricula,
    especialidad_profesional: input.especialidadProfesional,
  });
}

export async function updateStaffUsuario(id, patch) {
  const { rows } = await query(
    `SELECT u.*, v.matricula, v.especialidad_profesional FROM usuarios u
     LEFT JOIN veterinarios v ON v.usuario_id = u.id
     WHERE u.id = $1 AND u.rol IN ('recepcionista', 'veterinario')`,
    [id]
  );
  const user = rows[0];
  if (!user) throw new Error("Usuario no encontrado.");

  await withTransaction(async (client) => {
    if (patch.nombre !== undefined || patch.telefono !== undefined || patch.sucursalId !== undefined || patch.activo !== undefined) {
      await client.query(
        `UPDATE usuarios SET
          nombre = COALESCE($2, nombre),
          telefono = COALESCE($3, telefono),
          sucursal_id = COALESCE($4, sucursal_id),
          activo = COALESCE($5, activo)
         WHERE id = $1`,
        [
          id,
          patch.nombre?.trim() || null,
          patch.telefono?.trim() || null,
          patch.sucursalId || null,
          patch.activo,
        ]
      );
    }
    if (user.rol === "veterinario" && (patch.matricula !== undefined || patch.especialidadProfesional !== undefined)) {
      await client.query(
        `UPDATE veterinarios SET
          matricula = COALESCE($2, matricula),
          especialidad_profesional = COALESCE($3, especialidad_profesional)
         WHERE usuario_id = $1`,
        [id, patch.matricula?.trim() || null, patch.especialidadProfesional?.trim() || null]
      );
    }
    if (patch.password) {
      const passwordHash = await bcrypt.hash(patch.password, 10);
      await client.query("UPDATE usuarios SET password_hash = $2 WHERE id = $1", [id, passwordHash]);
    }
  });

  const { rows: updated } = await query(
    `SELECT u.id, u.nombre, u.email, u.telefono, u.rol, u.sucursal_id, u.activo,
            v.matricula, v.especialidad_profesional
     FROM usuarios u LEFT JOIN veterinarios v ON v.usuario_id = u.id WHERE u.id = $1`,
    [id]
  );
  return mapUsuarioStaff(updated[0]);
}

export async function listSucursalesAdmin() {
  const { rows } = await query(
    "SELECT id, codigo_interno, nombre_comercial, direccion, localidad FROM sucursales ORDER BY codigo_interno"
  );
  return rows.map((r) => ({
    id: r.id,
    codigoInterno: r.codigo_interno,
    nombreComercial: r.nombre_comercial,
    direccion: r.direccion,
    localidad: r.localidad,
  }));
}

export async function createSucursal(input) {
  if (!input.codigoInterno?.trim() || !input.nombreComercial?.trim()) {
    throw new Error("Código interno y nombre comercial son obligatorios.");
  }
  const id = randomUUID();
  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO sucursales (id, codigo_interno, nombre_comercial, direccion, localidad)
         VALUES ($1,$2,$3,$4,$5)`,
        [
          id,
          input.codigoInterno.trim().toUpperCase(),
          input.nombreComercial.trim(),
          input.direccion?.trim() || null,
          input.localidad?.trim() || null,
        ]
      );
      await seedDefaultHorarioSucursal(id, client);
    });
  } catch (e) {
    if (e.code === "23505") throw new Error("Ya existe una sucursal con ese código.");
    throw e;
  }
  return {
    id,
    codigoInterno: input.codigoInterno.trim().toUpperCase(),
    nombreComercial: input.nombreComercial.trim(),
    direccion: input.direccion?.trim() || null,
    localidad: input.localidad?.trim() || null,
  };
}

export async function updateSucursal(id, patch) {
  const { rowCount } = await query(
    `UPDATE sucursales SET
      codigo_interno = COALESCE($2, codigo_interno),
      nombre_comercial = COALESCE($3, nombre_comercial),
      direccion = COALESCE($4, direccion),
      localidad = COALESCE($5, localidad)
     WHERE id = $1`,
    [
      id,
      patch.codigoInterno?.trim()?.toUpperCase() || null,
      patch.nombreComercial?.trim() || null,
      patch.direccion?.trim() || null,
      patch.localidad?.trim() || null,
    ]
  );
  if (!rowCount) throw new Error("Sucursal no encontrada.");
  const { rows } = await query(
    "SELECT id, codigo_interno, nombre_comercial, direccion, localidad FROM sucursales WHERE id = $1",
    [id]
  );
  const r = rows[0];
  return {
    id: r.id,
    codigoInterno: r.codigo_interno,
    nombreComercial: r.nombre_comercial,
    direccion: r.direccion,
    localidad: r.localidad,
  };
}

export async function listSalasAdmin(sucursalId) {
  const { rows } = await query(
    "SELECT id, sucursal_id, nombre FROM salas WHERE sucursal_id = $1 ORDER BY nombre",
    [sucursalId]
  );
  return rows.map((r) => ({ id: r.id, sucursalId: r.sucursal_id, nombre: r.nombre }));
}

export async function createSala(input) {
  if (!input.sucursalId || !input.nombre?.trim()) {
    throw new Error("Sucursal y nombre de sala son obligatorios.");
  }
  const id = randomUUID();
  await query("INSERT INTO salas (id, sucursal_id, nombre) VALUES ($1,$2,$3)", [
    id,
    input.sucursalId,
    input.nombre.trim(),
  ]);
  return { id, sucursalId: input.sucursalId, nombre: input.nombre.trim() };
}

export async function updateSala(id, patch) {
  const { rowCount } = await query("UPDATE salas SET nombre = COALESCE($2, nombre) WHERE id = $1", [
    id,
    patch.nombre?.trim() || null,
  ]);
  if (!rowCount) throw new Error("Sala no encontrada.");
  const { rows } = await query("SELECT id, sucursal_id, nombre FROM salas WHERE id = $1", [id]);
  const r = rows[0];
  return { id: r.id, sucursalId: r.sucursal_id, nombre: r.nombre };
}

export async function setVeterinarioTipos(veterinarioId, tipoIds) {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM veterinario_tipos_servicio WHERE veterinario_id = $1", [veterinarioId]);
    for (const tipoId of tipoIds) {
      await client.query(
        "INSERT INTO veterinario_tipos_servicio (veterinario_id, tipo_servicio_id) VALUES ($1,$2)",
        [veterinarioId, tipoId]
      );
    }
  });
}

export async function setSalaTipos(salaId, tipoIds) {
  await withTransaction(async (client) => {
    await client.query("DELETE FROM sala_tipos_servicio WHERE sala_id = $1", [salaId]);
    for (const tipoId of tipoIds) {
      await client.query(
        "INSERT INTO sala_tipos_servicio (sala_id, tipo_servicio_id) VALUES ($1,$2)",
        [salaId, tipoId]
      );
    }
  });
}

export async function getMatricesAdmin() {
  const [vetTipos, salaTipos] = await Promise.all([
    query("SELECT veterinario_id, tipo_servicio_id FROM veterinario_tipos_servicio"),
    query("SELECT sala_id, tipo_servicio_id FROM sala_tipos_servicio"),
  ]);
  return {
    veterinarioTiposServicio: vetTipos.rows.map((r) => ({
      veterinarioId: r.veterinario_id,
      tipoServicioId: r.tipo_servicio_id,
    })),
    salaTiposServicio: salaTipos.rows.map((r) => ({
      salaId: r.sala_id,
      tipoServicioId: r.tipo_servicio_id,
    })),
  };
}
