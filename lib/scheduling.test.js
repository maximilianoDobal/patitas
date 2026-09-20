import { describe, expect, it } from "vitest";
import { assertNoOverlap } from "@/lib/scheduling";
import { layoutTurnosOverlapColumns, turnosAgendaConflict } from "@/lib/turnoOverlapLayout";

const base = {
  fecha: "2026-09-20",
  horaInicio: "10:00",
  duracionMinutos: 30,
  veterinarioId: "vet-1",
  salaId: "sala-1",
  estado: "confirmado",
  excepcionAgenda: false,
};

describe("assertNoOverlap", () => {
  it("rechaza solapamiento normal mismo veterinario", () => {
    const incoming = { ...base, id: "t-new" };
    const existing = [{ ...base, id: "t-1" }];
    expect(() => assertNoOverlap(incoming, existing)).toThrow(/Conflicto de agenda/);
  });

  it("permite solapamiento cuando el turno entrante tiene excepción de agenda", () => {
    const incoming = { ...base, id: "t-new", excepcionAgenda: true };
    const existing = [{ ...base, id: "t-1" }];
    expect(() => assertNoOverlap(incoming, existing)).not.toThrow();
  });

  it("rechaza turno normal sobre uno existente con excepción", () => {
    const incoming = { ...base, id: "t-new", excepcionAgenda: false };
    const existing = [{ ...base, id: "t-1", excepcionAgenda: true }];
    expect(() => assertNoOverlap(incoming, existing)).toThrow(/Conflicto de agenda/);
  });

  it("ignora turnos cancelados", () => {
    const incoming = { ...base, id: "t-new" };
    const existing = [{ ...base, id: "t-1", estado: "cancelado" }];
    expect(() => assertNoOverlap(incoming, existing)).not.toThrow();
  });
});

describe("turnosAgendaConflict", () => {
  it("no agrupa turnos que solo comparten horario sin vet ni sala", () => {
    const a = { ...base, id: "a", veterinarioId: "vet-1", salaId: "sala-1" };
    const b = { ...base, id: "b", veterinarioId: "vet-2", salaId: "sala-2" };
    expect(turnosAgendaConflict(a, b)).toBe(false);
  });
});

describe("layoutTurnosOverlapColumns", () => {
  it("asigna dos columnas a turnos solapados", () => {
    const turnos = [
      { ...base, id: "a" },
      { ...base, id: "b", horaInicio: "10:15" },
    ];
    const layout = layoutTurnosOverlapColumns(turnos);
    expect(layout.get("a").columnCount).toBe(2);
    expect(layout.get("b").columnCount).toBe(2);
    expect(layout.get("a").column).not.toBe(layout.get("b").column);
  });
});
