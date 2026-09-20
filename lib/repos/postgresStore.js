import bcrypt from "bcryptjs";
import { randomBytes, randomUUID } from "crypto";
import { query, withTransaction } from "@/lib/db/pool";
import { normalizeExcepcionAgendaFields, validateExcepcionAgendaFields } from "@/lib/excepcionAgenda";
import { assertNoOverlap, suggestSalaId } from "@/lib/scheduling";
import { getTipoServicio, isRolOperativo } from "@/lib/constants";

function formatDate(value) {
  if (!value) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return String(value).slice(0, 10);
}

function formatTime(value) {
  if (!value) return "";
  return String(value).slice(0, 5);
}

function mapTurno(row) {
  if (!row) return null;
  return {
    id: row.id,
    sucursalId: row.sucursal_id,
    mascotaId: row.mascota_id,
    tipoServicioId: row.tipo_servicio_id,
    veterinarioId: row.veterinario_id,
    salaId: row.sala_id,
    fecha: formatDate(row.fecha),
    horaInicio: formatTime(row.hora_inicio),
    duracionMinutos: row.duracion_minutos,
    estado: row.estado,
    notasRecepcion: row.notas_recepcion ?? "",
    excepcionAgenda: row.excepcion_agenda === true,
    categoriaExcepcionAgenda: row.categoria_excepcion_agenda ?? null,
    motivoExcepcionAgenda: row.motivo_excepcion_agenda ?? null,
    creadoPor: row.creado_por,
  };
}

function mapCliente(row) {
  return {
    id: row.id,
    sucursalId: row.sucursal_id,
    sucursalPrimeraAltaId: row.sucursal_id,
    nombre: row.nombre,
    telefono: row.telefono ?? "",
    email: row.email,
    dni: row.dni ?? null,
  };
}

function mapSucursal(row) {
  return {
    id: row.id,
    codigoInterno: row.codigo_interno,
    nombreComercial: row.nombre_comercial,
    direccion: row.direccion,
    localidad: row.localidad,
  };
}

function mapMascota(row) {
  return {
    id: row.id,
    clienteId: row.cliente_id,
    nombre: row.nombre,
    especie: row.especie ?? "",
    raza: row.raza ?? "",
    sexo: row.sexo ?? "",
    fechaNacimiento: row.fecha_nacimiento ? formatDate(row.fecha_nacimiento) : null,
    pesoKg: row.peso_kg != null ? Number(row.peso_kg) : null,
  };
}

function mapConsulta(row) {
  return {
    id: row.id,
    historiaClinicaId: row.historia_clinica_id,
    turnoId: row.turno_id,
    titulo: row.titulo ?? "",
    motivo: row.motivo ?? "",
    diagnostico: row.diagnostico ?? "",
    tratamiento: row.tratamiento ?? "",
    pesoKg: row.peso_kg != null ? Number(row.peso_kg) : null,
    evolucion: row.evolucion ?? "",
    tipoServicioId: row.tipo_servicio_id,
    fecha: row.fecha ? formatDate(row.fecha) : null,
  };
}

function mapHistoria(row) {
  return {
    id: row.id,
    mascotaId: row.mascota_id,
    fechaApertura: formatDate(row.fecha_apertura),
    alergias: row.alergias ?? "",
    condicionesCronicas: row.condiciones_cronicas ?? "",
  };
}

async function loadSchedulingContext(sucursalId) {
  const [salasRes, salaTiposRes, vetPreferidaRes, vetTiposRes] = await Promise.all([
    query("SELECT id, sucursal_id, nombre FROM salas WHERE sucursal_id = $1", [sucursalId]),
    query("SELECT sala_id, tipo_servicio_id FROM sala_tipos_servicio"),
    query(
      `SELECT vsp.veterinario_id, vsp.sala_id FROM veterinario_sala_preferida vsp
       JOIN usuarios u ON u.id = vsp.veterinario_id WHERE u.sucursal_id = $1`,
      [sucursalId]
    ),
    query(
      `SELECT veterinario_id, tipo_servicio_id FROM veterinario_tipos_servicio vts
       JOIN usuarios u ON u.id = vts.veterinario_id WHERE u.sucursal_id = $1`,
      [sucursalId]
    ),
  ]);

  return {
    salas: salasRes.rows.map((r) => ({ id: r.id, sucursalId: r.sucursal_id, nombre: r.nombre })),
    salaTiposServicio: salaTiposRes.rows.map((r) => ({
      salaId: r.sala_id,
      tipoServicioId: r.tipo_servicio_id,
    })),
    veterinarioSalaPreferida: vetPreferidaRes.rows.map((r) => ({
      veterinarioId: r.veterinario_id,
      salaId: r.sala_id,
    })),
    veterinarioTiposServicio: vetTiposRes.rows.map((r) => ({
      veterinarioId: r.veterinario_id,
      tipoServicioId: r.tipo_servicio_id,
    })),
  };
}

async function turnosForOverlap(sucursalId, fecha) {
  const { rows } = await query(
    "SELECT * FROM turnos WHERE sucursal_id = $1 AND fecha = $2::date",
    [sucursalId, fecha]
  );
  return rows.map(mapTurno);
}

export async function verifyStaffCredentials(email, password) {
  const { rows } = await query(
    `SELECT id, nombre, email, rol, sucursal_id, password_hash, activo FROM usuarios
     WHERE lower(email) = lower($1) AND rol IN ('recepcionista', 'veterinario', 'administrador')`,
    [email]
  );
  const user = rows[0];
  if (!user || user.activo === false) return null;
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

export async function listTurnos(filters = {}) {
  const clauses = [];
  const params = [];
  let n = 1;

  if (filters.sucursalId) {
    clauses.push(`sucursal_id = $${n++}`);
    params.push(filters.sucursalId);
  }
  if (filters.veterinarioId) {
    clauses.push(`veterinario_id = $${n++}`);
    params.push(filters.veterinarioId);
  }
  if (filters.salaId) {
    clauses.push(`sala_id = $${n++}`);
    params.push(filters.salaId);
  }
  if (filters.fecha) {
    clauses.push(`fecha = $${n++}::date`);
    params.push(filters.fecha);
  }
  if (filters.fechaDesde) {
    clauses.push(`fecha >= $${n++}::date`);
    params.push(filters.fechaDesde);
  }
  if (filters.fechaHasta) {
    clauses.push(`fecha <= $${n++}::date`);
    params.push(filters.fechaHasta);
  }
  if (filters.estado) {
    clauses.push(`estado = $${n++}`);
    params.push(filters.estado);
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT * FROM turnos ${where} ORDER BY fecha, hora_inicio`,
    params
  );
  return rows.map(mapTurno);
}

export async function getTurnoById(id) {
  const { rows } = await query("SELECT * FROM turnos WHERE id = $1", [id]);
  return mapTurno(rows[0]);
}

export async function createTurno(input, session) {
  const tipo = getTipoServicio(input.tipoServicioId);
  if (!tipo) throw new Error("Tipo de servicio inválido");

  const ctx = await loadSchedulingContext(input.sucursalId ?? session.sucursalId);
  const vetOk = ctx.veterinarioTiposServicio.some(
    (vt) => vt.veterinarioId === input.veterinarioId && vt.tipoServicioId === input.tipoServicioId
  );
  if (!vetOk) throw new Error("El veterinario no tiene habilitado ese tipo de servicio.");

  let salaId = input.salaId;
  if (!salaId) {
    const preferida = ctx.veterinarioSalaPreferida.find((v) => v.veterinarioId === input.veterinarioId);
    salaId = suggestSalaId({
      tipoServicioId: input.tipoServicioId,
      veterinarioId: input.veterinarioId,
      salas: ctx.salas,
      salaTipos: ctx.salaTiposServicio,
      vetPreferida: preferida,
    });
  }
  if (!salaId) throw new Error("Debe asignarse una sala.");

  const sucursalId = input.sucursalId ?? session.sucursalId;
  const turno = {
    id: randomUUID(),
    sucursalId,
    mascotaId: input.mascotaId,
    tipoServicioId: input.tipoServicioId,
    veterinarioId: input.veterinarioId,
    salaId,
    fecha: input.fecha,
    horaInicio: input.horaInicio,
    duracionMinutos: input.duracionMinutos ?? tipo.duracionMinutos,
    estado: input.estado ?? "programado",
    notasRecepcion: input.notasRecepcion ?? "",
    creadoPor: session.userId,
    ...normalizeExcepcionAgendaFields(input),
  };

  validateExcepcionAgendaFields(turno);

  const existing = await turnosForOverlap(sucursalId, turno.fecha);
  assertNoOverlap(turno, existing);

  await query(
    `INSERT INTO turnos (
      id, sucursal_id, mascota_id, tipo_servicio_id, veterinario_id, sala_id,
      fecha, hora_inicio, duracion_minutos, estado, notas_recepcion,
      excepcion_agenda, categoria_excepcion_agenda, motivo_excepcion_agenda, creado_por
    ) VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8::time,$9,$10,$11,$12,$13,$14,$15)`,
    [
      turno.id,
      turno.sucursalId,
      turno.mascotaId,
      turno.tipoServicioId,
      turno.veterinarioId,
      turno.salaId,
      turno.fecha,
      turno.horaInicio,
      turno.duracionMinutos,
      turno.estado,
      turno.notasRecepcion,
      turno.excepcionAgenda,
      turno.categoriaExcepcionAgenda,
      turno.motivoExcepcionAgenda,
      turno.creadoPor,
    ]
  );

  return turno;
}

export async function updateTurno(id, patch, session) {
  const current = await getTurnoById(id);
  if (!current) throw new Error("Turno no encontrado");

  if (session.rol === "veterinario") {
    const allowed = ["estado"];
    const keys = Object.keys(patch);
    if (keys.some((k) => !allowed.includes(k))) throw new Error("No autorizado");
    if (current.veterinarioId !== session.userId) throw new Error("Solo puede actuar sobre sus turnos.");
    if (patch.estado && !["en_atencion", "atendido", "no_asistio"].includes(patch.estado)) {
      throw new Error("Transición de estado no permitida.");
    }
  }

  if (session.rol === "recepcionista" || session.rol === "administrador") {
    if (patch.estado === "en_atencion" || patch.estado === "atendido") {
      throw new Error("Recepción no puede marcar estados clínicos.");
    }
    if (["cancelado", "atendido"].includes(current.estado)) {
      const reprogramKeys = ["fecha", "horaInicio", "veterinarioId", "salaId", "tipoServicioId"];
      if (reprogramKeys.some((k) => patch[k] !== undefined)) {
        throw new Error("No se puede reprogramar un turno cancelado o atendido.");
      }
    }
  }

  const excepcionKeys = ["excepcionAgenda", "categoriaExcepcionAgenda", "motivoExcepcionAgenda"];
  if (session.rol === "veterinario" && excepcionKeys.some((k) => patch[k] !== undefined)) {
    throw new Error("No autorizado");
  }

  const updated = {
    ...current,
    ...patch,
    ...normalizeExcepcionAgendaFields(patch, current),
  };
  if (patch.tipoServicioId) {
    const tipo = getTipoServicio(patch.tipoServicioId);
    if (tipo) updated.duracionMinutos = patch.duracionMinutos ?? tipo.duracionMinutos;
  }
  if (patch.tipoServicioId || patch.veterinarioId) {
    const ctx = await loadSchedulingContext(current.sucursalId);
    const tipoId = patch.tipoServicioId ?? current.tipoServicioId;
    const vetId = patch.veterinarioId ?? current.veterinarioId;
    const vetOk = ctx.veterinarioTiposServicio.some(
      (vt) => vt.veterinarioId === vetId && vt.tipoServicioId === tipoId
    );
    if (!vetOk) throw new Error("El veterinario no tiene habilitado ese tipo de servicio.");
  }

  validateExcepcionAgendaFields(updated);

  const existing = await turnosForOverlap(updated.sucursalId, updated.fecha);
  assertNoOverlap(updated, existing, { ignoreTurnoId: id });

  await query(
    `UPDATE turnos SET
      mascota_id = $2,
      tipo_servicio_id = $3,
      veterinario_id = $4,
      sala_id = $5,
      fecha = $6::date,
      hora_inicio = $7::time,
      duracion_minutos = $8,
      estado = $9,
      notas_recepcion = $10,
      excepcion_agenda = $11,
      categoria_excepcion_agenda = $12,
      motivo_excepcion_agenda = $13
     WHERE id = $1`,
    [
      id,
      updated.mascotaId,
      updated.tipoServicioId,
      updated.veterinarioId,
      updated.salaId,
      updated.fecha,
      updated.horaInicio,
      updated.duracionMinutos,
      updated.estado,
      updated.notasRecepcion,
      updated.excepcionAgenda,
      updated.categoriaExcepcionAgenda,
      updated.motivoExcepcionAgenda,
    ]
  );

  return updated;
}

export async function listClientes(filters = {}) {
  const clauses = [];
  const params = [];
  let n = 1;

  const q = filters.q?.trim();
  if (q) {
    clauses.push(
      `(lower(u.email) LIKE lower($${n}) OR lower(u.nombre) LIKE lower($${n}) OR c.dni LIKE $${n})`
    );
    params.push(`%${q}%`);
    n++;
  }

  const where = clauses.length ? `WHERE ${clauses.join(" AND ")}` : "";
  const { rows } = await query(
    `SELECT u.id, u.sucursal_id, u.nombre, u.email, u.telefono, c.dni
     FROM clientes c
     JOIN usuarios u ON u.id = c.usuario_id
     ${where}
     ORDER BY u.nombre`,
    params
  );
  return rows.map(mapCliente);
}

export async function createCliente(input) {
  if (!input.nombre?.trim() || !input.telefono?.trim() || !input.email?.trim()) {
    throw new Error("Nombre, teléfono y email son obligatorios.");
  }

  const nombre = input.nombre.trim();
  const telefono = input.telefono.trim();
  const email = input.email.trim().toLowerCase();
  const dni = input.dni?.trim() || null;
  const id = randomUUID();
  const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 10);

  try {
    await withTransaction(async (client) => {
      await client.query(
        `INSERT INTO usuarios (id, sucursal_id, nombre, email, telefono, password_hash, rol)
         VALUES ($1, $2, $3, $4, $5, $6, 'cliente')`,
        [id, input.sucursalId, nombre, email, telefono, passwordHash]
      );
      await client.query("INSERT INTO clientes (usuario_id, dni) VALUES ($1, $2)", [id, dni]);
    });
  } catch (e) {
    if (e.code === "23505") {
      throw new Error("Ya existe un usuario con ese email.");
    }
    throw e;
  }

  return { id, sucursalId: input.sucursalId, nombre, telefono, email, dni };
}

export async function listMascotas(filters = {}) {
  if (filters.clienteId) {
    const { rows } = await query("SELECT * FROM mascotas WHERE cliente_id = $1 ORDER BY nombre", [
      filters.clienteId,
    ]);
    return rows.map(mapMascota);
  }
  const { rows } = await query("SELECT * FROM mascotas ORDER BY nombre");
  return rows.map(mapMascota);
}

export async function createMascota(input) {
  if (!input.clienteId || !input.nombre?.trim()) throw new Error("Cliente y nombre de mascota son obligatorios.");

  const mascotaId = randomUUID();
  const historiaId = randomUUID();
  const hoy = new Date().toISOString().slice(0, 10);
  const mascota = {
    id: mascotaId,
    clienteId: input.clienteId,
    nombre: input.nombre.trim(),
    especie: input.especie?.trim() || "Canino",
    raza: input.raza?.trim() || "",
    sexo: input.sexo?.trim() || "",
    fechaNacimiento: input.fechaNacimiento || null,
    pesoKg: input.pesoKg ?? null,
  };
  const historia = {
    id: historiaId,
    mascotaId,
    fechaApertura: hoy,
    alergias: input.alergias?.trim() || "",
    condicionesCronicas: input.condicionesCronicas?.trim() || "",
  };

  await withTransaction(async (client) => {
    const { rowCount } = await client.query("SELECT 1 FROM clientes WHERE usuario_id = $1", [input.clienteId]);
    if (!rowCount) throw new Error("Cliente no encontrado.");

    await client.query(
      `INSERT INTO mascotas (id, cliente_id, nombre, especie, raza, sexo, fecha_nacimiento, peso_kg)
       VALUES ($1,$2,$3,$4,$5,$6,$7::date,$8)`,
      [
        mascota.id,
        mascota.clienteId,
        mascota.nombre,
        mascota.especie,
        mascota.raza,
        mascota.sexo,
        mascota.fechaNacimiento,
        mascota.pesoKg,
      ]
    );
    await client.query(
      `INSERT INTO historias_clinicas (id, mascota_id, fecha_apertura, alergias, condiciones_cronicas)
       VALUES ($1,$2,$3::date,$4,$5)`,
      [historia.id, historia.mascotaId, historia.fechaApertura, historia.alergias, historia.condicionesCronicas]
    );
  });

  return { mascota, historiaClinica: historia };
}

async function getHistoriaByMascotaId(mascotaId) {
  const { rows } = await query("SELECT * FROM historias_clinicas WHERE mascota_id = $1", [mascotaId]);
  return mapHistoria(rows[0]);
}

export async function listConsultasByMascota(mascotaId) {
  const historia = await getHistoriaByMascotaId(mascotaId);
  if (!historia) return [];
  const { rows } = await query(
    "SELECT * FROM consultas WHERE historia_clinica_id = $1 ORDER BY fecha DESC NULLS LAST",
    [historia.id]
  );
  return rows.map(mapConsulta);
}

export async function upsertConsultaForTurno(turnoId, input, session) {
  const turno = await getTurnoById(turnoId);
  if (!turno) throw new Error("Turno no encontrado");
  if (session.rol !== "veterinario" || turno.veterinarioId !== session.userId) {
    throw new Error("Solo el veterinario asignado puede cargar la consulta.");
  }

  const historia = await getHistoriaByMascotaId(turno.mascotaId);
  if (!historia) throw new Error("Historia clínica no encontrada");

  const payload = {
    historiaClinicaId: historia.id,
    turnoId,
    titulo: input.titulo?.trim() || "",
    motivo: input.motivo?.trim() || "",
    diagnostico: input.diagnostico?.trim() || "",
    tratamiento: input.tratamiento?.trim() || "",
    pesoKg: input.pesoKg ?? null,
    evolucion: input.evolucion?.trim() || "",
    tipoServicioId: turno.tipoServicioId,
    fecha: input.fecha || turno.fecha,
  };

  let consulta;

  await withTransaction(async (client) => {
    const existing = await client.query("SELECT id FROM consultas WHERE turno_id = $1", [turnoId]);
    if (existing.rows[0]) {
      const consultaId = existing.rows[0].id;
      await client.query(
        `UPDATE consultas SET
          historia_clinica_id = $2, titulo = $3, motivo = $4, diagnostico = $5,
          tratamiento = $6, peso_kg = $7, evolucion = $8, tipo_servicio_id = $9, fecha = $10::date
         WHERE id = $1`,
        [
          consultaId,
          payload.historiaClinicaId,
          payload.titulo,
          payload.motivo,
          payload.diagnostico,
          payload.tratamiento,
          payload.pesoKg,
          payload.evolucion,
          payload.tipoServicioId,
          payload.fecha,
        ]
      );
      consulta = { id: consultaId, ...payload };
    } else {
      const consultaId = randomUUID();
      await client.query(
        `INSERT INTO consultas (
          id, historia_clinica_id, turno_id, titulo, motivo, diagnostico, tratamiento,
          peso_kg, evolucion, tipo_servicio_id, fecha
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11::date)`,
        [
          consultaId,
          payload.historiaClinicaId,
          payload.turnoId,
          payload.titulo,
          payload.motivo,
          payload.diagnostico,
          payload.tratamiento,
          payload.pesoKg,
          payload.evolucion,
          payload.tipoServicioId,
          payload.fecha,
        ]
      );
      consulta = { id: consultaId, ...payload };
    }

    if (turno.estado !== "atendido") {
      await client.query("UPDATE turnos SET estado = 'atendido' WHERE id = $1", [turnoId]);
    }
  });

  return consulta;
}

async function listSucursalesOperables(session) {
  if (session.rol === "veterinario") {
    const { rows } = await query(
      "SELECT id, codigo_interno, nombre_comercial, direccion, localidad FROM sucursales WHERE id = $1",
      [session.sucursalId]
    );
    return rows.map(mapSucursal);
  }
  const { rows } = await query(
    "SELECT id, codigo_interno, nombre_comercial, direccion, localidad FROM sucursales ORDER BY codigo_interno"
  );
  return rows.map(mapSucursal);
}

export async function switchSucursalActiva(session, sucursalId) {
  if (!isRolOperativo(session.rol)) {
    const err = new Error("Solo recepción o administración pueden cambiar la sucursal activa.");
    err.status = 403;
    throw err;
  }
  if (!sucursalId) {
    const err = new Error("Sucursal inválida.");
    err.status = 400;
    throw err;
  }
  const { rows } = await query("SELECT id FROM sucursales WHERE id = $1", [sucursalId]);
  if (!rows[0]) {
    const err = new Error("Sucursal no encontrada.");
    err.status = 404;
    throw err;
  }
  return { ...session, sucursalId };
}

export async function getCatalog(session) {
  const sucursalId = session.sucursalId;

  const [
    sucursalRes,
    sucursalesOperablesRes,
    salasRes,
    vetsRes,
    salaTiposRes,
    vetTiposRes,
    vetSalaRes,
    clientesRows,
    mascotasRes,
  ] = await Promise.all([
    query("SELECT id, codigo_interno, nombre_comercial, direccion, localidad FROM sucursales WHERE id = $1", [
      sucursalId,
    ]),
    listSucursalesOperables(session),
    query("SELECT id, sucursal_id, nombre FROM salas WHERE sucursal_id = $1 ORDER BY nombre", [sucursalId]),
    query(
      `SELECT id, sucursal_id, nombre, email, telefono, rol FROM usuarios
       WHERE sucursal_id = $1 AND rol = 'veterinario' ORDER BY nombre`,
      [sucursalId]
    ),
    query("SELECT sala_id, tipo_servicio_id FROM sala_tipos_servicio"),
    query(
      `SELECT vts.veterinario_id, vts.tipo_servicio_id FROM veterinario_tipos_servicio vts
       JOIN usuarios u ON u.id = vts.veterinario_id WHERE u.sucursal_id = $1`,
      [sucursalId]
    ),
    query(
      `SELECT vsp.veterinario_id, vsp.sala_id FROM veterinario_sala_preferida vsp
       JOIN usuarios u ON u.id = vsp.veterinario_id WHERE u.sucursal_id = $1`,
      [sucursalId]
    ),
    query(
      `SELECT u.id, u.sucursal_id, u.nombre, u.email, u.telefono, c.dni
       FROM clientes c JOIN usuarios u ON u.id = c.usuario_id
       ORDER BY u.nombre`
    ),
    query("SELECT * FROM mascotas ORDER BY nombre"),
  ]);

  const suc = sucursalRes.rows[0];
  return {
    sucursal: suc ? mapSucursal(suc) : null,
    sucursales: sucursalesOperablesRes,
    salas: salasRes.rows.map((r) => ({ id: r.id, sucursalId: r.sucursal_id, nombre: r.nombre })),
    veterinarios: vetsRes.rows.map((r) => ({
      id: r.id,
      sucursalId: r.sucursal_id,
      nombre: r.nombre,
      email: r.email,
      telefono: r.telefono,
      rol: r.rol,
    })),
    salaTiposServicio: salaTiposRes.rows.map((r) => ({
      salaId: r.sala_id,
      tipoServicioId: r.tipo_servicio_id,
    })),
    veterinarioTiposServicio: vetTiposRes.rows.map((r) => ({
      veterinarioId: r.veterinario_id,
      tipoServicioId: r.tipo_servicio_id,
    })),
    veterinarioSalaPreferida: vetSalaRes.rows.map((r) => ({
      veterinarioId: r.veterinario_id,
      salaId: r.sala_id,
    })),
    clientes: clientesRows.rows.map(mapCliente),
    mascotas: mascotasRes.rows.map(mapMascota),
  };
}
