import fs from "fs";
import path from "path";
import bcrypt from "bcryptjs";
import { assertNoOverlap, suggestSalaId } from "@/lib/scheduling";
import { getTipoServicio } from "@/lib/constants";

const FIXTURES_DIR = path.join(process.cwd(), "data", "fixtures");

function readJson(name) {
  const raw = fs.readFileSync(path.join(FIXTURES_DIR, name), "utf8");
  return JSON.parse(raw);
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

let cache = null;

function loadStore() {
  if (cache) return cache;
  cache = {
    sucursales: readJson("sucursales.json"),
    salas: readJson("salas.json"),
    salaTiposServicio: readJson("sala_tipos_servicio.json"),
    veterinarioTiposServicio: readJson("veterinario_tipos_servicio.json"),
    veterinarioSalaPreferida: readJson("veterinario_sala_preferida.json"),
    usuarios: readJson("usuarios.json"),
    clientes: readJson("clientes.json"),
    mascotas: readJson("mascotas.json"),
    historiasClinicas: readJson("historias_clinicas.json"),
    consultas: readJson("consultas.json"),
    turnos: readJson("turnos.json"),
    comprobantes: readJson("comprobantes.json"),
  };
  return cache;
}

export function resetMockStore() {
  cache = null;
  return loadStore();
}

export function getStore() {
  return loadStore();
}

export async function verifyStaffCredentials(email, password) {
  const store = loadStore();
  const user = store.usuarios.find(
    (u) => u.email.toLowerCase() === email.toLowerCase() && (u.rol === "recepcionista" || u.rol === "veterinario")
  );
  if (!user) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return {
    id: user.id,
    nombre: user.nombre,
    email: user.email,
    rol: user.rol,
    sucursalId: user.sucursalId,
  };
}

function nextId(prefix, items) {
  const nums = items
    .map((i) => i.id)
    .filter((id) => typeof id === "string" && id.startsWith(prefix))
    .map((id) => Number(id.slice(prefix.length)))
    .filter((n) => !Number.isNaN(n));
  const max = nums.length ? Math.max(...nums) : 0;
  return `${prefix}${max + 1}`;
}

export function listTurnos(filters = {}) {
  const store = loadStore();
  let rows = clone(store.turnos);
  if (filters.sucursalId) rows = rows.filter((t) => t.sucursalId === filters.sucursalId);
  if (filters.veterinarioId) rows = rows.filter((t) => t.veterinarioId === filters.veterinarioId);
  if (filters.salaId) rows = rows.filter((t) => t.salaId === filters.salaId);
  if (filters.fecha) rows = rows.filter((t) => t.fecha === filters.fecha);
  if (filters.fechaDesde) rows = rows.filter((t) => t.fecha >= filters.fechaDesde);
  if (filters.fechaHasta) rows = rows.filter((t) => t.fecha <= filters.fechaHasta);
  if (filters.estado) rows = rows.filter((t) => t.estado === filters.estado);
  return rows.sort((a, b) => (a.fecha + a.horaInicio).localeCompare(b.fecha + b.horaInicio));
}

export function getTurnoById(id) {
  return loadStore().turnos.find((t) => t.id === id) ?? null;
}

export function createTurno(input, session) {
  const store = loadStore();
  const tipo = getTipoServicio(input.tipoServicioId);
  if (!tipo) throw new Error("Tipo de servicio inválido");

  const vetOk = store.veterinarioTiposServicio.some(
    (vt) => vt.veterinarioId === input.veterinarioId && vt.tipoServicioId === input.tipoServicioId
  );
  if (!vetOk) throw new Error("El veterinario no tiene habilitado ese tipo de servicio.");

  let salaId = input.salaId;
  if (!salaId) {
    const preferida = store.veterinarioSalaPreferida.find((v) => v.veterinarioId === input.veterinarioId);
    salaId = suggestSalaId({
      tipoServicioId: input.tipoServicioId,
      veterinarioId: input.veterinarioId,
      salas: store.salas.filter((s) => s.sucursalId === input.sucursalId),
      salaTipos: store.salaTiposServicio,
      vetPreferida: preferida,
    });
  }
  if (!salaId) throw new Error("Debe asignarse una sala.");

  const turno = {
    id: nextId("t", store.turnos),
    sucursalId: input.sucursalId ?? session.sucursalId,
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
  };

  assertNoOverlap(turno, store.turnos);
  store.turnos.push(turno);
  return clone(turno);
}

export function updateTurno(id, patch, session) {
  const store = loadStore();
  const idx = store.turnos.findIndex((t) => t.id === id);
  if (idx === -1) throw new Error("Turno no encontrado");
  const current = store.turnos[idx];

  if (session.rol === "veterinario") {
    const allowed = ["estado"];
    const keys = Object.keys(patch);
    if (keys.some((k) => !allowed.includes(k))) throw new Error("No autorizado");
    if (current.veterinarioId !== session.userId) throw new Error("Solo puede actuar sobre sus turnos.");
    if (patch.estado && !["en_atencion", "atendido", "no_asistio"].includes(patch.estado)) {
      throw new Error("Transición de estado no permitida.");
    }
  }

  if (session.rol === "recepcionista") {
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

  const updated = { ...current, ...patch };
  if (patch.tipoServicioId) {
    const tipo = getTipoServicio(patch.tipoServicioId);
    if (tipo) updated.duracionMinutos = patch.duracionMinutos ?? tipo.duracionMinutos;
  }
  if (patch.tipoServicioId || patch.veterinarioId) {
    const tipoId = patch.tipoServicioId ?? current.tipoServicioId;
    const vetId = patch.veterinarioId ?? current.veterinarioId;
    const vetOk = store.veterinarioTiposServicio.some(
      (vt) => vt.veterinarioId === vetId && vt.tipoServicioId === tipoId
    );
    if (!vetOk) throw new Error("El veterinario no tiene habilitado ese tipo de servicio.");
  }

  assertNoOverlap(updated, store.turnos, { ignoreTurnoId: id });
  store.turnos[idx] = updated;
  return clone(updated);
}

export function listClientes() {
  return clone(loadStore().clientes);
}

export function createCliente(input) {
  const store = loadStore();
  if (!input.nombre?.trim() || !input.telefono?.trim() || !input.email?.trim()) {
    throw new Error("Nombre, teléfono y email son obligatorios.");
  }
  const cliente = {
    id: nextId("c", store.clientes),
    sucursalId: input.sucursalId,
    nombre: input.nombre.trim(),
    telefono: input.telefono.trim(),
    email: input.email.trim().toLowerCase(),
    dni: input.dni?.trim() || null,
  };
  store.clientes.push(cliente);
  return clone(cliente);
}

export function listMascotas(filters = {}) {
  let rows = clone(loadStore().mascotas);
  if (filters.clienteId) rows = rows.filter((m) => m.clienteId === filters.clienteId);
  return rows;
}

export function createMascota(input) {
  const store = loadStore();
  if (!input.clienteId || !input.nombre?.trim()) throw new Error("Cliente y nombre de mascota son obligatorios.");
  const mascota = {
    id: nextId("m", store.mascotas),
    clienteId: input.clienteId,
    nombre: input.nombre.trim(),
    especie: input.especie?.trim() || "Canino",
    raza: input.raza?.trim() || "",
    sexo: input.sexo?.trim() || "",
    fechaNacimiento: input.fechaNacimiento || null,
    pesoKg: input.pesoKg ?? null,
  };
  store.mascotas.push(mascota);
  const historia = {
    id: nextId("hc", store.historiasClinicas),
    mascotaId: mascota.id,
    fechaApertura: new Date().toISOString().slice(0, 10),
    alergias: input.alergias?.trim() || "",
    condicionesCronicas: input.condicionesCronicas?.trim() || "",
  };
  store.historiasClinicas.push(historia);
  return { mascota: clone(mascota), historiaClinica: clone(historia) };
}

export function getHistoriaByMascotaId(mascotaId) {
  return loadStore().historiasClinicas.find((h) => h.mascotaId === mascotaId) ?? null;
}

export function listConsultasByMascota(mascotaId) {
  const historia = getHistoriaByMascotaId(mascotaId);
  if (!historia) return [];
  return clone(loadStore().consultas.filter((c) => c.historiaClinicaId === historia.id));
}

export function upsertConsultaForTurno(turnoId, input, session) {
  const store = loadStore();
  const turno = store.turnos.find((t) => t.id === turnoId);
  if (!turno) throw new Error("Turno no encontrado");
  if (session.rol !== "veterinario" || turno.veterinarioId !== session.userId) {
    throw new Error("Solo el veterinario asignado puede cargar la consulta.");
  }

  const historia = getHistoriaByMascotaId(turno.mascotaId);
  if (!historia) throw new Error("Historia clínica no encontrada");

  let consulta = store.consultas.find((c) => c.turnoId === turnoId);
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

  if (!consulta) {
    consulta = { id: nextId("q", store.consultas), ...payload };
    store.consultas.push(consulta);
  } else {
    Object.assign(consulta, payload);
  }

  if (turno.estado !== "atendido") {
    turno.estado = "atendido";
  }

  return clone(consulta);
}

export function getCatalog(session) {
  const store = loadStore();
  const sucursalId = session.sucursalId;
  return {
    sucursal: store.sucursales.find((s) => s.id === sucursalId),
    salas: store.salas.filter((s) => s.sucursalId === sucursalId),
    veterinarios: store.usuarios
      .filter((u) => u.rol === "veterinario" && u.sucursalId === sucursalId)
      .map(({ passwordHash, ...rest }) => rest),
    salaTiposServicio: store.salaTiposServicio,
    veterinarioTiposServicio: store.veterinarioTiposServicio,
    veterinarioSalaPreferida: store.veterinarioSalaPreferida,
    clientes: store.clientes.filter((c) => c.sucursalId === sucursalId),
    mascotas: store.mascotas,
  };
}
