import { describe, expect, it } from "vitest";
import {
  assertTurnoDentroHorarioSucursal,
  buildSlotsFromTramos,
  DEFAULT_HORARIO_SEMANAL,
  diaSemanaFromIsoDate,
  isFechaAbierta,
  tramosParaFecha,
  validateTramos,
} from "@/lib/horarioSucursal";

describe("horarioSucursal", () => {
  it("mapea jueves ISO correctamente", () => {
    expect(diaSemanaFromIsoDate("2026-09-17")).toBe(4);
  });

  it("rechaza tramos solapados", () => {
    expect(() =>
      validateTramos([
        { horaInicio: "09:00", horaFin: "12:00" },
        { horaInicio: "11:00", horaFin: "13:00" },
      ])
    ).toThrow(/solaparse/);
  });

  it("permite tramos contiguos", () => {
    const tramos = validateTramos([
      { horaInicio: "09:00", horaFin: "12:00" },
      { horaInicio: "12:00", horaFin: "18:00" },
    ]);
    expect(tramos).toHaveLength(2);
  });

  it("aplica cierre por fecha sobre horario semanal", () => {
    const cierres = [{ fechaDesde: "2026-09-17", fechaHasta: "2026-09-17", motivo: "Feriado" }];
    expect(tramosParaFecha("2026-09-17", DEFAULT_HORARIO_SEMANAL, cierres)).toEqual([]);
    expect(isFechaAbierta("2026-09-17", DEFAULT_HORARIO_SEMANAL, cierres)).toBe(false);
  });

  it("genera slots respetando duración del servicio", () => {
    const tramos = [{ horaInicio: "09:00", horaFin: "10:00" }];
    expect(buildSlotsFromTramos(tramos, { duracionMinutos: 30, slotMinutos: 15 })).toEqual(["09:00", "09:15", "09:30"]);
    expect(buildSlotsFromTramos(tramos, { duracionMinutos: 60, slotMinutos: 15 })).toEqual(["09:00"]);
  });

  it("valida turno dentro del tramo", () => {
    expect(() =>
      assertTurnoDentroHorarioSucursal(
        { fecha: "2026-09-18", horaInicio: "17:45", duracionMinutos: 30 },
        DEFAULT_HORARIO_SEMANAL,
        []
      )
    ).toThrow(/fuera del horario/);

    expect(() =>
      assertTurnoDentroHorarioSucursal(
        { fecha: "2026-09-18", horaInicio: "17:30", duracionMinutos: 30 },
        DEFAULT_HORARIO_SEMANAL,
        []
      )
    ).not.toThrow();
  });
});
