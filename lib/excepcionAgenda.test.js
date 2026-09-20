import { describe, expect, it } from "vitest";
import { normalizeExcepcionAgendaFields, validateExcepcionAgendaFields } from "@/lib/excepcionAgenda";

describe("excepcionAgenda", () => {
  it("exige categoría y motivo cuando la excepción está activa", () => {
    expect(() =>
      validateExcepcionAgendaFields({
        excepcionAgenda: true,
        categoriaExcepcionAgenda: "emergencia",
        motivoExcepcionAgenda: "corto",
      })
    ).toThrow(/10 caracteres/);
  });

  it("limpia campos al desactivar excepción", () => {
    const fields = normalizeExcepcionAgendaFields(
      { excepcionAgenda: false },
      {
        excepcionAgenda: true,
        categoriaExcepcionAgenda: "otro",
        motivoExcepcionAgenda: "motivo largo previo",
      }
    );
    expect(fields).toEqual({
      excepcionAgenda: false,
      categoriaExcepcionAgenda: null,
      motivoExcepcionAgenda: null,
    });
  });
});
