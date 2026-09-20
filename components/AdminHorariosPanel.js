"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

const DAY_LABELS = { 1: "Lunes", 2: "Martes", 3: "Miércoles", 4: "Jueves", 5: "Viernes", 6: "Sábado", 7: "Domingo" };

function emptyDias() {
  return [1, 2, 3, 4, 5, 6, 7].map((diaSemana) => ({
    diaSemana,
    cerrado: diaSemana >= 6,
    tramos: diaSemana <= 5 ? [{ horaInicio: "09:00", horaFin: "18:00" }] : [],
  }));
}

export function AdminHorariosPanel({ sucursales }) {
  const [sucursalId, setSucursalId] = useState("");
  const [dias, setDias] = useState(emptyDias());
  const [cierres, setCierres] = useState([]);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [cierreForm, setCierreForm] = useState({
    fechaDesde: "",
    fechaHasta: "",
    motivo: "",
    todasSucursales: false,
  });

  useEffect(() => {
    if (!sucursalId && sucursales[0]) setSucursalId(sucursales[0].id);
  }, [sucursales, sucursalId]);

  async function loadHorario(sid) {
    if (!sid) return;
    const res = await fetch(`/api/admin/horarios?sucursalId=${encodeURIComponent(sid)}`);
    const data = await res.json();
    if (res.ok && data.dias?.length === 7) setDias(data.dias);
    else setDias(emptyDias());

    const cRes = await fetch(`/api/admin/cierres?sucursalId=${encodeURIComponent(sid)}`);
    setCierres((await cRes.json()).cierres || []);
  }

  useEffect(() => {
    loadHorario(sucursalId);
  }, [sucursalId]);

  function patchDia(diaSemana, patch) {
    setDias((prev) =>
      prev.map((d) => {
        if (d.diaSemana !== diaSemana) return d;
        const next = { ...d, ...patch };
        if (patch.cerrado === true) next.tramos = [];
        if (patch.cerrado === false && !next.tramos?.length) {
          next.tramos = [{ horaInicio: "09:00", horaFin: "18:00" }];
        }
        return next;
      })
    );
  }

  function patchTramo(diaSemana, idx, field, value) {
    setDias((prev) =>
      prev.map((d) => {
        if (d.diaSemana !== diaSemana) return d;
        const tramos = d.tramos.map((t, i) => (i === idx ? { ...t, [field]: value } : t));
        return { ...d, tramos };
      })
    );
  }

  function addTramo(diaSemana) {
    setDias((prev) =>
      prev.map((d) => {
        if (d.diaSemana !== diaSemana) return d;
        return { ...d, tramos: [...d.tramos, { horaInicio: "14:00", horaFin: "18:00" }] };
      })
    );
  }

  function removeTramo(diaSemana, idx) {
    setDias((prev) =>
      prev.map((d) => {
        if (d.diaSemana !== diaSemana) return d;
        const tramos = d.tramos.filter((_, i) => i !== idx);
        return { ...d, tramos };
      })
    );
  }

  async function guardarHorario(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    const res = await fetch("/api/admin/horarios", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sucursalId, dias }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al guardar");
      return;
    }
    const w = data.warnings;
    if (w?.turnosFuera || w?.solicitudesFuera) {
      setMsg(
        `Guardado. Atención: ${w.turnosFuera} turno(s) y ${w.solicitudesFuera} solicitud(es) pendientes quedan fuera del horario.`
      );
    } else {
      setMsg("Horario semanal guardado.");
    }
    setDias(data.dias);
  }

  async function crearCierre(e) {
    e.preventDefault();
    setError("");
    setMsg("");
    const res = await fetch("/api/admin/cierres", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...cierreForm, sucursalId: cierreForm.todasSucursales ? undefined : sucursalId }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error");
      return;
    }
    const w = data.warnings;
    setMsg(
      w?.turnosFuera || w?.solicitudesFuera
        ? `Cierre registrado. ${w.turnosFuera} turno(s) y ${w.solicitudesFuera} solicitud(es) afectados.`
        : "Cierre registrado."
    );
    setCierreForm({ fechaDesde: "", fechaHasta: "", motivo: "", todasSucursales: false });
    loadHorario(sucursalId);
  }

  async function borrarCierre(id) {
    await fetch(`/api/admin/cierres?id=${encodeURIComponent(id)}`, { method: "DELETE" });
    loadHorario(sucursalId);
  }

  return (
    <div className="space-y-4">
      <Select value={sucursalId} onChange={(e) => setSucursalId(e.target.value)}>
        {sucursales.map((s) => (
          <option key={s.id} value={s.id}>
            {s.codigoInterno} — {s.nombreComercial}
          </option>
        ))}
      </Select>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {msg ? <p className="text-sm text-amber-700">{msg}</p> : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Horario semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={guardarHorario} className="space-y-4">
            {dias.map((d) => (
              <div key={d.diaSemana} className="rounded-lg border border-slate-100 p-3 text-sm">
                <div className="mb-2 flex flex-wrap items-center gap-3">
                  <span className="min-w-24 font-semibold text-slate-800">{DAY_LABELS[d.diaSemana]}</span>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={d.cerrado}
                      onChange={(e) => patchDia(d.diaSemana, { cerrado: e.target.checked })}
                    />
                    Cerrado
                  </label>
                </div>
                {!d.cerrado ? (
                  <div className="space-y-2">
                    {d.tramos.map((t, idx) => (
                      <div key={idx} className="flex flex-wrap items-center gap-2">
                        <Input
                          type="time"
                          value={t.horaInicio}
                          onChange={(e) => patchTramo(d.diaSemana, idx, "horaInicio", e.target.value)}
                          required
                        />
                        <span className="text-slate-400">—</span>
                        <Input
                          type="time"
                          value={t.horaFin}
                          onChange={(e) => patchTramo(d.diaSemana, idx, "horaFin", e.target.value)}
                          required
                        />
                        <Button type="button" size="sm" variant="outline" onClick={() => removeTramo(d.diaSemana, idx)}>
                          Quitar
                        </Button>
                      </div>
                    ))}
                    <Button type="button" size="sm" variant="secondary" onClick={() => addTramo(d.diaSemana)}>
                      Agregar tramo
                    </Button>
                  </div>
                ) : null}
              </div>
            ))}
            <Button type="submit">Guardar horario</Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Cierres por fecha</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={crearCierre} className="grid gap-2 md:grid-cols-2">
            <Input
              type="date"
              required
              value={cierreForm.fechaDesde}
              onChange={(e) => setCierreForm({ ...cierreForm, fechaDesde: e.target.value })}
            />
            <Input
              type="date"
              required
              value={cierreForm.fechaHasta}
              onChange={(e) => setCierreForm({ ...cierreForm, fechaHasta: e.target.value })}
            />
            <Input
              placeholder="Motivo (solo staff)"
              className="md:col-span-2"
              value={cierreForm.motivo}
              onChange={(e) => setCierreForm({ ...cierreForm, motivo: e.target.value })}
            />
            <label className="flex items-center gap-2 text-sm md:col-span-2">
              <input
                type="checkbox"
                checked={cierreForm.todasSucursales}
                onChange={(e) => setCierreForm({ ...cierreForm, todasSucursales: e.target.checked })}
              />
              Aplicar a todas las sucursales
            </label>
            <Button type="submit" className="md:col-span-2">
              Registrar cierre
            </Button>
          </form>
          <ul className="divide-y text-sm">
            {cierres.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2">
                <span>
                  {c.fechaDesde}
                  {c.fechaHasta !== c.fechaDesde ? ` → ${c.fechaHasta}` : ""}
                  {c.motivo ? ` · ${c.motivo}` : ""}
                </span>
                <Button type="button" size="sm" variant="outline" onClick={() => borrarCierre(c.id)}>
                  Eliminar
                </Button>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
