/**
 * UUID v5 determinísticos para IDs de data/fixtures/ (p. ej. suc1 → uuid fijo).
 * Mismo algoritmo que usará el repositorio Postgres cuando reemplace el mock.
 */
import { createHash } from "crypto";

/** Namespace fijo del proyecto (no cambiar: invalidaría seeds existentes). */
export const FIXTURE_UUID_NAMESPACE = "7c9e6679-7425-40de-944b-e07fc1f90ae7";

function namespaceBytes(uuid) {
  return Buffer.from(uuid.replace(/-/g, ""), "hex");
}

export function fixtureUuid(fixtureKey) {
  const hash = createHash("sha1")
    .update(namespaceBytes(FIXTURE_UUID_NAMESPACE))
    .update(String(fixtureKey), "utf8")
    .digest();
  const bytes = Buffer.from(hash.subarray(0, 16));
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

export function sqlUuid(fixtureKey) {
  if (fixtureKey === null || fixtureKey === undefined) return "NULL";
  return `'${fixtureUuid(fixtureKey)}'::uuid`;
}
