"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/input";
import { TIPOS_SERVICIO } from "@/lib/constants";

function tipoNombre(id) {
  return TIPOS_SERVICIO.find((t) => t.id === id)?.nombre ?? id;
}

export default function SolicitudesStaffPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [error, setError] = useState("");
  const [confirmando, setConfirmando] = useState(null);
  const [propuesta, setPropuesta] = useState(null);
  const [override, setOverride] = useState({ veterinarioId: "", salaId: "" });

  async function load() {
    const res = await fetch("/api/solicitudes");
    setSolicitudes((await res.json()).solicitudes || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function abrirConfirmar(id) {
    setError("");
    setConfirmando(id);
    const res = await fetch(`/api/solicitudes/${id}/propuesta`);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al cargar propuesta");
      return;
    }
    setPropuesta(data.propuesta);
    setOverride({
      veterinarioId: data.propuesta.veterinarioId || "",
      salaId: data.propuesta.salaId || "",
    });
  }

  async function confirmar() {
    setError("");
    const res = await fetch(`/api/solicitudes/${confirmando}/confirmar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        veterinarioId: override.veterinarioId || undefined,
        salaId: override.salaId || undefined,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo confirmar");
      return;
    }
    setConfirmando(null);
    setPropuesta(null);
    load();
  }

  async function rechazar(id) {
    const motivo = window.prompt("Motivo de rechazo (opcional):") ?? "";
    const res = await fetch(`/api/solicitudes/${id}/rechazar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ motivo }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al rechazar");
      return;
    }
    load();
  }

  async function cancelar(id) {
    if (!window.confirm("¿Cancelar esta solicitud pendiente?")) return;
    const res = await fetch(`/api/solicitudes/${id}/cancelar`, { method: "POST" });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error al cancelar");
      return;
    }
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">Solicitudes pendientes</h2>
      <p className="text-sm text-slate-500">Sucursal activa — confirmación crea turno con asignación automática.</p>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {solicitudes.length === 0 ? (
        <p className="text-sm text-slate-500">No hay solicitudes pendientes.</p>
      ) : (
        solicitudes.map((s) => (
          <Card key={s.id}>
            <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
              <div>
                <p className="font-semibold text-slate-800">
                  {s.clienteNombre} — {s.mascotaNombre}
                </p>
                <p className="text-sm text-slate-500">
                  {tipoNombre(s.tipoServicioId)} · {s.fechaPreferida} {s.horaInicioPreferida}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" size="sm" onClick={() => abrirConfirmar(s.id)}>
                  Confirmar
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => rechazar(s.id)}>
                  Rechazar
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => cancelar(s.id)}>
                  Cancelar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))
      )}
      {confirmando && propuesta ? (
        <Card>
          <CardContent className="space-y-3 py-4">
            <p className="font-semibold text-slate-800">Confirmar solicitud</p>
            <label className="block text-sm">
              Veterinario
              <Select
                className="mt-1"
                value={override.veterinarioId}
                onChange={(e) => setOverride({ ...override, veterinarioId: e.target.value })}
              >
                <option value="">— automático —</option>
                {propuesta.veterinarios?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </Select>
            </label>
            <label className="block text-sm">
              Sala
              <Select
                className="mt-1"
                value={override.salaId}
                onChange={(e) => setOverride({ ...override, salaId: e.target.value })}
              >
                <option value="">— sugerida —</option>
                {propuesta.salas?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Select>
            </label>
            <div className="flex gap-2">
              <Button type="button" onClick={confirmar}>
                Crear turno
              </Button>
              <Button type="button" variant="outline" onClick={() => setConfirmando(null)}>
                Cerrar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
