/**
 * Crea la base patitas, aplica sql/schema.sql y carga data/fixtures/.
 * Requiere: PGPASSWORD (o trust local). Opcional: PGHOST, PGPORT, PGUSER, PG_BIN.
 */
import fs from "fs";
import path from "path";
import { spawnSync } from "child_process";
import { fileURLToPath } from "url";
import bcrypt from "bcryptjs";
import { sqlUuid } from "./fixture-uuid.mjs";

/** Hash no usable para portal; solo seed demo (mismo valor para todos los clientes fixture). */
const CLIENTE_SEED_PASSWORD_HASH = bcrypt.hashSync("patitas-seed-cliente-sin-portal", 10);

const TIPOS_SERVICIO = [
  { id: "consulta_general", nombre: "Consulta general", duracionMinutos: 30 },
  { id: "vacunacion", nombre: "Vacunación", duracionMinutos: 30 },
  { id: "cirugia", nombre: "Cirugía", duracionMinutos: 60 },
  { id: "estetica", nombre: "Estética", duracionMinutos: 60 },
];

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const FIXTURES = path.join(ROOT, "data", "fixtures");
const SCHEMA = path.join(ROOT, "sql", "schema.sql");
const DB_NAME = "patitas";

const PG_BIN =
  process.env.PG_BIN ??
  "C:\\Program Files\\PostgreSQL\\18\\bin\\psql.exe";

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(FIXTURES, name), "utf8"));
}

function sqlLiteral(value) {
  if (value === null || value === undefined) return "NULL";
  if (typeof value === "number") return String(value);
  if (typeof value === "boolean") return value ? "TRUE" : "FALSE";
  return `'${String(value).replace(/'/g, "''")}'`;
}

function runPsql(database, sql, { file } = {}) {
  const args = ["-U", process.env.PGUSER ?? "postgres", "-h", process.env.PGHOST ?? "localhost", "-p", process.env.PGPORT ?? "5432", "-d", database, "-v", "ON_ERROR_STOP=1"];
  if (file) args.push("-f", file);
  else args.push("-c", sql);

  const env = { ...process.env };
  const result = spawnSync(PG_BIN, args, { env, encoding: "utf8", shell: false });
  const out = (result.stdout ?? "") + (result.stderr ?? "");
  if (result.status !== 0) {
    throw new Error(`psql falló (${database}):\n${out}`);
  }
  return out;
}

function buildSeedSql() {
  const sucursales = readJson("sucursales.json");
  const salas = readJson("salas.json");
  const salaTipos = readJson("sala_tipos_servicio.json");
  const vetTipos = readJson("veterinario_tipos_servicio.json");
  const vetSala = readJson("veterinario_sala_preferida.json");
  const usuarios = readJson("usuarios.json");
  const clientes = readJson("clientes.json");
  const mascotas = readJson("mascotas.json");
  const historias = readJson("historias_clinicas.json");
  const turnos = readJson("turnos.json");
  const consultas = readJson("consultas.json");
  const comprobantes = readJson("comprobantes.json");

  const lines = [
    "-- Generado por scripts/setup-postgres.mjs",
    "-- IDs de entidad: UUID v5 desde claves de data/fixtures/ (scripts/fixture-uuid.mjs)",
    "BEGIN;",
  ];

  for (const t of TIPOS_SERVICIO) {
    lines.push(
      `INSERT INTO tipos_servicio (id, nombre, duracion_minutos) VALUES (${sqlLiteral(t.id)}, ${sqlLiteral(t.nombre)}, ${t.duracionMinutos});`
    );
  }

  for (const s of sucursales) {
    lines.push(
      `INSERT INTO sucursales (id, codigo_interno, nombre_comercial, direccion, localidad) VALUES (${sqlUuid(s.id)}, ${sqlLiteral(s.codigoInterno)}, ${sqlLiteral(s.nombreComercial)}, ${sqlLiteral(s.direccion ?? null)}, ${sqlLiteral(s.localidad ?? null)});`
    );
  }

  for (const s of sucursales) {
    for (let diaSemana = 1; diaSemana <= 7; diaSemana++) {
      const cerrado = diaSemana >= 6;
      lines.push(
        `INSERT INTO sucursal_horario_dia (sucursal_id, dia_semana, cerrado) VALUES (${sqlUuid(s.id)}, ${diaSemana}, ${cerrado ? "TRUE" : "FALSE"});`
      );
      if (!cerrado) {
        lines.push(
          `INSERT INTO sucursal_horario_tramo (id, sucursal_id, dia_semana, orden, hora_inicio, hora_fin) VALUES (${sqlUuid(`horario-${s.id}-${diaSemana}`)}, ${sqlUuid(s.id)}, ${diaSemana}, 0, '09:00', '18:00');`
        );
      }
    }
  }

  for (const u of usuarios) {
    lines.push(
      `INSERT INTO usuarios (id, sucursal_id, nombre, email, telefono, password_hash, rol) VALUES (${sqlUuid(u.id)}, ${sqlUuid(u.sucursalId)}, ${sqlLiteral(u.nombre)}, ${sqlLiteral(u.email)}, ${sqlLiteral(u.telefono ?? null)}, ${sqlLiteral(u.passwordHash)}, ${sqlLiteral(u.rol)});`
    );
    if (u.rol === "recepcionista") {
      lines.push(`INSERT INTO recepcionistas (usuario_id) VALUES (${sqlUuid(u.id)});`);
    }
    if (u.rol === "veterinario") {
      lines.push(
        `INSERT INTO veterinarios (usuario_id, matricula, especialidad_profesional) VALUES (${sqlUuid(u.id)}, ${sqlLiteral(u.matricula ?? null)}, ${sqlLiteral(u.especialidadProfesional ?? null)});`
      );
    }
  }

  for (const c of clientes) {
    lines.push(
      `INSERT INTO usuarios (id, sucursal_id, nombre, email, telefono, password_hash, rol) VALUES (${sqlUuid(c.id)}, ${sqlUuid(c.sucursalId)}, ${sqlLiteral(c.nombre)}, ${sqlLiteral(c.email)}, ${sqlLiteral(c.telefono)}, ${sqlLiteral(CLIENTE_SEED_PASSWORD_HASH)}, 'cliente');`
    );
    lines.push(`INSERT INTO clientes (usuario_id, dni) VALUES (${sqlUuid(c.id)}, ${sqlLiteral(c.dni ?? null)});`);
  }

  for (const m of mascotas) {
    lines.push(
      `INSERT INTO mascotas (id, cliente_id, nombre, especie, raza, sexo, fecha_nacimiento, peso_kg) VALUES (${sqlUuid(m.id)}, ${sqlUuid(m.clienteId)}, ${sqlLiteral(m.nombre)}, ${sqlLiteral(m.especie ?? null)}, ${sqlLiteral(m.raza ?? null)}, ${sqlLiteral(m.sexo ?? null)}, ${sqlLiteral(m.fechaNacimiento ?? null)}, ${m.pesoKg ?? "NULL"});`
    );
  }

  for (const h of historias) {
    lines.push(
      `INSERT INTO historias_clinicas (id, mascota_id, fecha_apertura, alergias, condiciones_cronicas) VALUES (${sqlUuid(h.id)}, ${sqlUuid(h.mascotaId)}, ${sqlLiteral(h.fechaApertura)}, ${sqlLiteral(h.alergias ?? null)}, ${sqlLiteral(h.condicionesCronicas ?? null)});`
    );
  }

  for (const s of salas) {
    lines.push(
      `INSERT INTO salas (id, sucursal_id, nombre) VALUES (${sqlUuid(s.id)}, ${sqlUuid(s.sucursalId)}, ${sqlLiteral(s.nombre)});`
    );
  }

  for (const st of salaTipos) {
    lines.push(
      `INSERT INTO sala_tipos_servicio (sala_id, tipo_servicio_id) VALUES (${sqlUuid(st.salaId)}, ${sqlLiteral(st.tipoServicioId)});`
    );
  }

  for (const vt of vetTipos) {
    lines.push(
      `INSERT INTO veterinario_tipos_servicio (veterinario_id, tipo_servicio_id) VALUES (${sqlUuid(vt.veterinarioId)}, ${sqlLiteral(vt.tipoServicioId)});`
    );
  }

  for (const vs of vetSala) {
    lines.push(
      `INSERT INTO veterinario_sala_preferida (veterinario_id, sala_id) VALUES (${sqlUuid(vs.veterinarioId)}, ${sqlUuid(vs.salaId)});`
    );
  }

  for (const t of turnos) {
    lines.push(
      `INSERT INTO turnos (id, sucursal_id, mascota_id, tipo_servicio_id, veterinario_id, sala_id, fecha, hora_inicio, duracion_minutos, estado, notas_recepcion, excepcion_agenda, categoria_excepcion_agenda, motivo_excepcion_agenda, creado_por) VALUES (${sqlUuid(t.id)}, ${sqlUuid(t.sucursalId)}, ${sqlUuid(t.mascotaId)}, ${sqlLiteral(t.tipoServicioId)}, ${sqlUuid(t.veterinarioId)}, ${sqlUuid(t.salaId)}, ${sqlLiteral(t.fecha)}, ${sqlLiteral(t.horaInicio)}, ${t.duracionMinutos}, ${sqlLiteral(t.estado)}, ${sqlLiteral(t.notasRecepcion ?? null)}, ${t.excepcionAgenda ? "TRUE" : "FALSE"}, ${sqlLiteral(t.categoriaExcepcionAgenda ?? null)}, ${sqlLiteral(t.motivoExcepcionAgenda ?? null)}, ${t.creadoPor ? sqlUuid(t.creadoPor) : "NULL"});`
    );
  }

  for (const q of consultas) {
    lines.push(
      `INSERT INTO consultas (id, historia_clinica_id, turno_id, titulo, motivo, diagnostico, tratamiento, peso_kg, evolucion, tipo_servicio_id, fecha) VALUES (${sqlUuid(q.id)}, ${sqlUuid(q.historiaClinicaId)}, ${q.turnoId ? sqlUuid(q.turnoId) : "NULL"}, ${sqlLiteral(q.titulo ?? null)}, ${sqlLiteral(q.motivo ?? null)}, ${sqlLiteral(q.diagnostico ?? null)}, ${sqlLiteral(q.tratamiento ?? null)}, ${q.pesoKg ?? "NULL"}, ${sqlLiteral(q.evolucion ?? null)}, ${sqlLiteral(q.tipoServicioId ?? null)}, ${sqlLiteral(q.fecha ?? null)});`
    );
  }

  for (const c of comprobantes) {
    lines.push(
      `INSERT INTO comprobantes (id, turno_id, consulta_id, monto, estado, creado_en) VALUES (${sqlUuid(c.id)}, ${c.turnoId ? sqlUuid(c.turnoId) : "NULL"}, ${c.consultaId ? sqlUuid(c.consultaId) : "NULL"}, ${c.monto ?? "NULL"}, ${sqlLiteral(c.estado ?? "borrador")}, ${sqlLiteral(c.creadoEn ?? null)});`
    );
  }

  lines.push("COMMIT;");
  return lines.join("\n");
}

function main() {
  if (!fs.existsSync(PG_BIN)) {
    console.error(`No se encontró psql en: ${PG_BIN}`);
    console.error("Definí PG_BIN con la ruta a psql.exe");
    process.exit(1);
  }
  if (!process.env.PGPASSWORD) {
    console.error("Definí PGPASSWORD en el entorno (no se guarda en el repo).");
    process.exit(1);
  }

  console.log("Terminando conexiones activas a patitas (si existe)…");
  runPsql("postgres", `
    SELECT pg_terminate_backend(pid)
    FROM pg_stat_activity
    WHERE datname = '${DB_NAME}' AND pid <> pg_backend_pid();
  `).trim();

  console.log("Recreando base…");
  runPsql("postgres", `DROP DATABASE IF EXISTS ${DB_NAME};`);
  runPsql("postgres", `CREATE DATABASE ${DB_NAME} ENCODING 'UTF8';`);

  console.log("Aplicando schema…");
  runPsql(DB_NAME, null, { file: SCHEMA });

  console.log("Cargando fixtures…");
  const seedPath = path.join(ROOT, "sql", "seed-fixtures.sql");
  fs.writeFileSync(seedPath, buildSeedSql() + "\n", "utf8");
  runPsql(DB_NAME, null, { file: seedPath });

  const counts = runPsql(
    DB_NAME,
    `SELECT 'sucursales' AS t, count(*)::text FROM sucursales
     UNION ALL SELECT 'usuarios', count(*)::text FROM usuarios
     UNION ALL SELECT 'turnos', count(*)::text FROM turnos;`
  );
  console.log(counts.trim());
  console.log(`Listo: base "${DB_NAME}" creada y sembrada.`);
}

main();
