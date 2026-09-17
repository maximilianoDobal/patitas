-- Esquema PostgreSQL — Clínica Veterinaria Patitas
-- Runtime MVP: PostgreSQL obligatorio (DATABASE_URL). Fixtures solo vía db:setup.
-- IDs de entidad: UUID. tipos_servicio.id permanece TEXT (catálogo).
-- Seed desde fixtures: UUID v5 determinísticos (scripts/fixture-uuid.mjs).

CREATE TABLE sucursales (
  id UUID PRIMARY KEY,
  codigo_interno TEXT NOT NULL UNIQUE,
  nombre_comercial TEXT NOT NULL,
  direccion TEXT,
  localidad TEXT
);

CREATE TABLE usuarios (
  id UUID PRIMARY KEY,
  sucursal_id UUID NOT NULL REFERENCES sucursales (id),
  nombre TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  telefono TEXT,
  password_hash TEXT NOT NULL,
  rol TEXT NOT NULL CHECK (rol IN ('recepcionista', 'veterinario', 'administrador', 'cliente'))
);

CREATE TABLE recepcionistas (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios (id)
);

CREATE TABLE veterinarios (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios (id),
  matricula TEXT,
  especialidad_profesional TEXT
);

CREATE TABLE clientes (
  usuario_id UUID PRIMARY KEY REFERENCES usuarios (id),
  dni TEXT
);

CREATE TABLE salas (
  id UUID PRIMARY KEY,
  sucursal_id UUID NOT NULL REFERENCES sucursales (id),
  nombre TEXT NOT NULL
);

CREATE TABLE tipos_servicio (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  duracion_minutos INT NOT NULL
);

CREATE TABLE sala_tipos_servicio (
  sala_id UUID NOT NULL REFERENCES salas (id),
  tipo_servicio_id TEXT NOT NULL REFERENCES tipos_servicio (id),
  PRIMARY KEY (sala_id, tipo_servicio_id)
);

CREATE TABLE veterinario_tipos_servicio (
  veterinario_id UUID NOT NULL REFERENCES veterinarios (usuario_id),
  tipo_servicio_id TEXT NOT NULL REFERENCES tipos_servicio (id),
  PRIMARY KEY (veterinario_id, tipo_servicio_id)
);

CREATE TABLE veterinario_sala_preferida (
  veterinario_id UUID PRIMARY KEY REFERENCES veterinarios (usuario_id),
  sala_id UUID NOT NULL REFERENCES salas (id)
);

CREATE TABLE mascotas (
  id UUID PRIMARY KEY,
  cliente_id UUID NOT NULL REFERENCES clientes (usuario_id),
  nombre TEXT NOT NULL,
  especie TEXT,
  raza TEXT,
  sexo TEXT,
  fecha_nacimiento DATE,
  peso_kg NUMERIC(6, 2)
);

CREATE TABLE historias_clinicas (
  id UUID PRIMARY KEY,
  mascota_id UUID NOT NULL UNIQUE REFERENCES mascotas (id),
  fecha_apertura DATE NOT NULL,
  alergias TEXT,
  condiciones_cronicas TEXT
);

CREATE TABLE turnos (
  id UUID PRIMARY KEY,
  sucursal_id UUID NOT NULL REFERENCES sucursales (id),
  mascota_id UUID NOT NULL REFERENCES mascotas (id),
  tipo_servicio_id TEXT NOT NULL REFERENCES tipos_servicio (id),
  veterinario_id UUID NOT NULL REFERENCES veterinarios (usuario_id),
  sala_id UUID NOT NULL REFERENCES salas (id),
  fecha DATE NOT NULL,
  hora_inicio TIME NOT NULL,
  duracion_minutos INT NOT NULL,
  estado TEXT NOT NULL,
  notas_recepcion TEXT,
  creado_por UUID REFERENCES usuarios (id)
);

CREATE TABLE consultas (
  id UUID PRIMARY KEY,
  historia_clinica_id UUID NOT NULL REFERENCES historias_clinicas (id),
  turno_id UUID UNIQUE REFERENCES turnos (id),
  titulo TEXT,
  motivo TEXT,
  diagnostico TEXT,
  tratamiento TEXT,
  peso_kg NUMERIC(6, 2),
  evolucion TEXT,
  tipo_servicio_id TEXT,
  fecha DATE
);

CREATE TABLE comprobantes (
  id UUID PRIMARY KEY,
  turno_id UUID REFERENCES turnos (id),
  consulta_id UUID REFERENCES consultas (id),
  monto NUMERIC(12, 2),
  estado TEXT DEFAULT 'borrador',
  creado_en TIMESTAMPTZ DEFAULT now()
);
