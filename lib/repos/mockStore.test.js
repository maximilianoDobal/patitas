import { beforeEach, describe, expect, it } from "vitest";
import {
  createMascota,
  createTurno,
  getTurnoById,
  resetMockStore,
  updateTurno,
  upsertConsultaForTurno,
} from "@/lib/repos/mockStore";

const recep = { userId: "u_recep1", rol: "recepcionista", sucursalId: "suc1" };
const vet1 = { userId: "u_vet1", rol: "veterinario", sucursalId: "suc1" };
const vet2 = { userId: "u_vet2", rol: "veterinario", sucursalId: "suc1" };

beforeEach(() => {
  resetMockStore();
});

describe("mockStore turnos", () => {
  it("asigna sala automática al crear turno", () => {
    const turno = createTurno(
      {
        sucursalId: "suc1",
        mascotaId: "m1",
        tipoServicioId: "consulta_general",
        veterinarioId: "u_vet1",
        fecha: "2026-12-01",
        horaInicio: "11:00",
      },
      recep
    );
    expect(turno.salaId).toBe("sala1");
  });

  it("rechaza veterinario sin función habilitada", () => {
    expect(() =>
      createTurno(
        {
          sucursalId: "suc1",
          mascotaId: "m1",
          tipoServicioId: "estetica",
          veterinarioId: "u_vet1",
          fecha: "2026-12-01",
          horaInicio: "12:00",
        },
        recep
      )
    ).toThrow(/habilitado/);
  });

  it("permite reprogramar fecha y hora del turno", () => {
    const turno = createTurno(
      {
        sucursalId: "suc1",
        mascotaId: "m1",
        tipoServicioId: "vacunacion",
        veterinarioId: "u_vet1",
        fecha: "2026-12-02",
        horaInicio: "08:30",
      },
      recep
    );
    const updated = updateTurno(
      turno.id,
      { fecha: "2026-12-03", horaInicio: "09:00", estado: "confirmado", salaId: "sala1" },
      recep
    );
    expect(updated.fecha).toBe("2026-12-03");
    expect(updated.horaInicio).toBe("09:00");
    expect(updated.estado).toBe("confirmado");
  });

  it("impide que veterinario cancele turnos", () => {
    const turno = createTurno(
      {
        sucursalId: "suc1",
        mascotaId: "m1",
        tipoServicioId: "consulta_general",
        veterinarioId: "u_vet1",
        fecha: "2026-12-04",
        horaInicio: "14:00",
        estado: "confirmado",
      },
      recep
    );
    expect(() => updateTurno(turno.id, { estado: "cancelado" }, vet1)).toThrow(/Transición|No autorizado/);
  });

  it("marca no_asistio desde recepción", () => {
    const turno = createTurno(
      {
        sucursalId: "suc1",
        mascotaId: "m2",
        tipoServicioId: "consulta_general",
        veterinarioId: "u_vet1",
        fecha: "2026-12-05",
        horaInicio: "15:00",
        estado: "confirmado",
      },
      recep
    );
    const updated = updateTurno(turno.id, { estado: "no_asistio" }, recep);
    expect(updated.estado).toBe("no_asistio");
  });
});

describe("mockStore mascotas y consultas", () => {
  it("crea historia clínica al registrar mascota", () => {
    const { mascota, historiaClinica } = createMascota({
      clienteId: "c1",
      nombre: "Firulais",
    });
    expect(historiaClinica.mascotaId).toBe(mascota.id);
  });

  it("solo el veterinario asignado puede cargar consulta y cierra atendido", () => {
    const turno = createTurno(
      {
        sucursalId: "suc1",
        mascotaId: "m1",
        tipoServicioId: "consulta_general",
        veterinarioId: "u_vet1",
        fecha: "2026-12-06",
        horaInicio: "16:00",
        estado: "en_atencion",
      },
      recep
    );
    expect(() =>
      upsertConsultaForTurno(
        turno.id,
        { titulo: "Control", diagnostico: "OK", tratamiento: "Reposo" },
        vet2
      )
    ).toThrow(/asignado/);

    upsertConsultaForTurno(
      turno.id,
      { titulo: "Control anual", diagnostico: "Sano", tratamiento: "—" },
      vet1
    );
    expect(getTurnoById(turno.id).estado).toBe("atendido");
  });
});
