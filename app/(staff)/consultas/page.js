"use client";

import { useCallback, useEffect, useState } from "react";
import { TipoServicioBadge } from "@/components/TipoServicioBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ConsultasPage() {
  const [turnos, setTurnos] = useState([]);
  const [catalog, setCatalog] = useState(null);
  const [selected, setSelected] = useState(null);
  const [form, setForm] = useState({
    titulo: "",
    motivo: "",
    diagnostico: "",
    tratamiento: "",
    pesoKg: "",
    evolucion: "",
  });
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  const load = useCallback(async () => {
    const fecha = new Date().toISOString().slice(0, 10);
    const [tRes, cRes] = await Promise.all([fetch(`/api/turnos?fecha=${fecha}`), fetch("/api/catalog")]);
    const nextTurnos = (await tRes.json()).turnos || [];
    setTurnos(nextTurnos);
    setCatalog(await cRes.json());
    setSelected((prev) => {
      if (!prev) return null;
      return nextTurnos.find((t) => t.id === prev.id) ?? null;
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const mascotasById = Object.fromEntries((catalog?.mascotas || []).map((m) => [m.id, m]));

  async function patchEstado(turnoId, estado) {
    setError("");
    const res = await fetch(`/api/turnos/${turnoId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ estado }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo actualizar el turno");
      return;
    }
    await load();
  }

  function openTurno(t) {
    setSelected(t);
    setForm({
      titulo: "",
      motivo: "",
      diagnostico: "",
      tratamiento: "",
      pesoKg: "",
      evolucion: "",
    });
    setOk("");
    setError("");
  }

  async function guardar(e) {
    e.preventDefault();
    if (!selected) return;
    setError("");
    setOk("");
    const res = await fetch("/api/consultas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        turnoId: selected.id,
        ...form,
        pesoKg: form.pesoKg ? Number(form.pesoKg) : null,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo guardar");
      return;
    }
    setOk("Consulta guardada y turno marcado como atendido.");
    setSelected(null);
    load();
  }

  const pendientes = turnos.filter((t) => ["confirmado", "en_atencion"].includes(t.estado));

  return (
    <div className="mx-auto max-w-5xl space-y-4">
      <div>
        <h2 className="text-2xl font-bold text-slate-800">Consultas del día</h2>
        <p className="text-sm text-slate-500">Solo tus turnos asignados.</p>
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {ok ? <p className="text-sm font-medium text-emerald-700">{ok}</p> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card className="divide-y divide-slate-50 p-0">
          {pendientes.map((t) => (
            <div key={t.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-semibold text-slate-800">
                  {mascotasById[t.mascotaId]?.nombre} — {t.horaInicio}
                </p>
                <TipoServicioBadge tipoServicioId={t.tipoServicioId} />
              </div>
              <div className="flex flex-wrap gap-2">
                {t.estado === "confirmado" ? (
                  <Button type="button" size="sm" variant="outline" className="min-h-[44px] sm:min-h-0" onClick={() => patchEstado(t.id, "en_atencion")}>
                    En atención
                  </Button>
                ) : null}
                <Button type="button" size="sm" variant="secondary" className="min-h-[44px] sm:min-h-0" onClick={() => openTurno(t)}>
                  Atender
                </Button>
              </div>
            </div>
          ))}
          {pendientes.length === 0 ? (
            <p className="p-8 text-center text-slate-400">No hay turnos pendientes hoy.</p>
          ) : null}
        </Card>

        {selected ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Historia clínica — {mascotasById[selected.mascotaId]?.nombre}</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={guardar} className="space-y-3">
                <Input placeholder="Título *" required value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
                <Input placeholder="Motivo" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
                <Input placeholder="Diagnóstico" value={form.diagnostico} onChange={(e) => setForm({ ...form, diagnostico: e.target.value })} />
                <Input placeholder="Tratamiento" value={form.tratamiento} onChange={(e) => setForm({ ...form, tratamiento: e.target.value })} />
                <Input placeholder="Peso (kg)" value={form.pesoKg} onChange={(e) => setForm({ ...form, pesoKg: e.target.value })} />
                <textarea
                  placeholder="Evolución / notas clínicas"
                  rows={4}
                  value={form.evolucion}
                  onChange={(e) => setForm({ ...form, evolucion: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:outline-none"
                />
                <Button type="submit" className="min-h-[44px] w-full">
                  Guardar consulta
                </Button>
              </form>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center border-dashed p-8 text-slate-400">
            Elegí un turno para cargar la consulta.
          </Card>
        )}
      </div>
    </div>
  );
}
