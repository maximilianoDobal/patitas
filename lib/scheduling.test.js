import { describe, expect, it } from "vitest";
import { assertNoOverlap, getTurnoRange, rangesOverlap, suggestSalaId } from "@/lib/scheduling";

describe("scheduling", () => {
  it("detecta solapamiento de rangos", () => {
    expect(rangesOverlap({ start: 540, end: 570 }, { start: 560, end: 590 })).toBe(true);
    expect(rangesOverlap({ start: 540, end: 570 }, { start: 570, end: 600 })).toBe(false);
  });

  it("rechaza dos turnos del mismo veterinario en la misma franja", () => {
    const existing = [
      {
        id: "t1",
        fecha: "2026-09-20",
        horaInicio: "09:00",
        duracionMinutos: 30,
        veterinarioId: "u_vet1",
        salaId: "sala1",
        estado: "confirmado",
        tipoServicioId: "consulta_general",
      },
    ];
    const nuevo = {
      id: "t2",
      fecha: "2026-09-20",
      horaInicio: "09:15",
      duracionMinutos: 30,
      veterinarioId: "u_vet1",
      salaId: "sala2",
      estado: "programado",
      tipoServicioId: "consulta_general",
    };
    expect(() => assertNoOverlap(nuevo, existing)).toThrow(/veterinario/);
  });

  it("rechaza dos turnos en la misma sala en la misma franja", () => {
    const existing = [
      {
        id: "t1",
        fecha: "2026-09-20",
        horaInicio: "10:00",
        duracionMinutos: 60,
        veterinarioId: "u_vet1",
        salaId: "sala1",
        estado: "confirmado",
        tipoServicioId: "cirugia",
      },
    ];
    const nuevo = {
      id: "t2",
      fecha: "2026-09-20",
      horaInicio: "10:30",
      duracionMinutos: 30,
      veterinarioId: "u_vet2",
      salaId: "sala1",
      estado: "programado",
      tipoServicioId: "consulta_general",
    };
    expect(() => assertNoOverlap(nuevo, existing)).toThrow(/sala/);
  });

  it("ignora turnos cancelados al validar solapamiento", () => {
    const existing = [
      {
        id: "t1",
        fecha: "2026-09-20",
        horaInicio: "09:00",
        duracionMinutos: 30,
        veterinarioId: "u_vet1",
        salaId: "sala1",
        estado: "cancelado",
        tipoServicioId: "consulta_general",
      },
    ];
    const nuevo = {
      id: "t2",
      fecha: "2026-09-20",
      horaInicio: "09:00",
      duracionMinutos: 30,
      veterinarioId: "u_vet1",
      salaId: "sala1",
      estado: "programado",
      tipoServicioId: "consulta_general",
    };
    expect(() => assertNoOverlap(nuevo, existing)).not.toThrow();
  });

  it("sugiere sala preferida del veterinario cuando es compatible", () => {
    const salaId = suggestSalaId({
      tipoServicioId: "consulta_general",
      veterinarioId: "u_vet1",
      salas: [
        { id: "sala1", nombre: "Box 1" },
        { id: "sala2", nombre: "Quirófano" },
      ],
      salaTipos: [
        { salaId: "sala1", tipoServicioId: "consulta_general" },
        { salaId: "sala2", tipoServicioId: "consulta_general" },
      ],
      vetPreferida: { salaId: "sala1" },
    });
    expect(salaId).toBe("sala1");
  });

  it("calcula duración default por tipo de servicio", () => {
    const range = getTurnoRange({
      horaInicio: "09:00",
      tipoServicioId: "cirugia",
    });
    expect(range.duration).toBe(60);
    expect(range.end - range.start).toBe(60);
  });
});
