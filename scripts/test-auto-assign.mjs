import { pickVeterinarioAutomatico, minutosOcupadosPorVet } from "../lib/autoAssign.js";

const turnosDelDia = [
  {
    id: "t1",
    fecha: "2026-09-20",
    horaInicio: "09:00",
    duracionMinutos: 30,
    tipoServicioId: "consulta_general",
    veterinarioId: "vet-a",
    salaId: "s1",
    estado: "confirmado",
  },
];

const vet = pickVeterinarioAutomatico({
  tipoServicioId: "consulta_general",
  fecha: "2026-09-20",
  horaInicio: "09:00",
  duracionMinutos: 30,
  turnosDelDia,
  veterinariosHabilitados: ["vet-a", "vet-b"],
  sucursalId: "suc1",
});

if (vet !== "vet-b") {
  console.error("Expected vet-b (vet-a busy), got", vet);
  process.exit(1);
}

const carga = minutosOcupadosPorVet(turnosDelDia, "vet-a");
if (carga !== 30) {
  console.error("Expected 30 min occupied, got", carga);
  process.exit(1);
}

console.log("auto-assign OK");
