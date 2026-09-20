/**
 * Aplica solo la tabla emails_turno_enviados (sin drop/recreate de la base).
 * Usá esto si ya tenías patitas creada antes del feature de mails de turno.
 *
 *   node --env-file=.env.local scripts/patch-emails-turno-enviados.mjs
 */
import pg from "pg";

const { Client } = pg;

const DDL = `
CREATE TABLE IF NOT EXISTS emails_turno_enviados (
  id UUID PRIMARY KEY,
  turno_id UUID NOT NULL REFERENCES turnos (id) ON DELETE CASCADE,
  tipo TEXT NOT NULL CHECK (
    tipo IN ('turno_agendado', 'turno_reprogramado', 'turno_cancelado', 'recordatorio_24h')
  ),
  enviado_en TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS emails_turno_enviados_once_idx ON emails_turno_enviados (turno_id, tipo)
  WHERE tipo IN ('turno_agendado', 'turno_cancelado', 'recordatorio_24h');

CREATE INDEX IF NOT EXISTS emails_turno_enviados_turno_idx ON emails_turno_enviados (turno_id);
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("DATABASE_URL no definida. Ejecutá con: node --env-file=.env.local scripts/patch-emails-turno-enviados.mjs");
    process.exit(1);
  }
  const client = new Client({ connectionString: url });
  await client.connect();
  try {
    await client.query(DDL);
    const { rows } = await client.query(
      `SELECT to_regclass('public.emails_turno_enviados') AS reg`
    );
    console.log("OK: emails_turno_enviados →", rows[0]?.reg ?? "no creada");
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
