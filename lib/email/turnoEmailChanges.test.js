import { describe, expect, it } from "vitest";
import { turnoWasCancelled, turnoWasReprogrammed } from "@/lib/email/turnoEmailChanges";

describe("turnoWasCancelled", () => {
  it("detecta transición a cancelado", () => {
    expect(turnoWasCancelled({ estado: "confirmado" }, { estado: "cancelado" })).toBe(true);
    expect(turnoWasCancelled({ estado: "cancelado" }, { estado: "cancelado" })).toBe(false);
  });
});

describe("turnoWasReprogrammed", () => {
  const base = {
    fecha: "2026-09-20",
    horaInicio: "09:00",
    veterinarioId: "v1",
    salaId: "s1",
    tipoServicioId: "consulta_general",
    sucursalId: "su1",
  };

  it("detecta cambio de fecha", () => {
    expect(turnoWasReprogrammed(base, { ...base, fecha: "2026-09-21" })).toBe(true);
  });

  it("ignora sin cambios relevantes", () => {
    expect(turnoWasReprogrammed(base, { ...base, notasRecepcion: "x" })).toBe(false);
  });

  it("no trata programado→confirmado como reprogramación", () => {
    expect(
      turnoWasReprogrammed(
        { ...base, estado: "programado" },
        { ...base, estado: "confirmado" }
      )
    ).toBe(false);
  });
});
