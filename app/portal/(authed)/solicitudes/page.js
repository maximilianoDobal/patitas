"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { TIPOS_SERVICIO } from "@/lib/constants";
import { portalCardMeta, portalCardText, portalError, portalPageTitle } from "@/lib/portalUi";

function tipoNombre(id) {
  return TIPOS_SERVICIO.find((t) => t.id === id)?.nombre ?? id;
}

export default function PortalSolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState([]);
  const [mascotas, setMascotas] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [form, setForm] = useState({
    mascotaId: "",
    tipoServicioId: TIPOS_SERVICIO[0].id,
    sucursalId: "",
    fechaPreferida: "",
    horaInicioPreferida: "09:00",
  });
  const [error, setError] = useState("");
  const [fechaCerrada, setFechaCerrada] = useState(false);
  const [slots, setSlots] = useState([]);
  const [fechasCerradas, setFechasCerradas] = useState(new Set());

  async function load() {
    const [sRes, mRes, sucRes] = await Promise.all([
      fetch("/api/portal/solicitudes"),
      fetch("/api/portal/mascotas"),
      fetch("/api/portal/sucursales"),
    ]);
    setSolicitudes((await sRes.json()).solicitudes || []);
    const ms = (await mRes.json()).mascotas || [];
    setMascotas(ms);
    const sucs = (await sucRes.json()).sucursales || [];
    setSucursales(sucs);
    if (!form.mascotaId && ms[0]) setForm((f) => ({ ...f, mascotaId: ms[0].id }));
    if (!form.sucursalId && sucs[0]) setForm((f) => ({ ...f, sucursalId: sucs[0].id }));
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!form.sucursalId) return;
    const hoy = new Date().toISOString().slice(0, 10);
    const hasta = new Date(`${hoy}T12:00:00`);
    hasta.setDate(hasta.getDate() + 120);
    const hastaIso = hasta.toISOString().slice(0, 10);
    const qs = new URLSearchParams({
      mode: "calendar",
      sucursalId: form.sucursalId,
      desde: hoy,
      hasta: hastaIso,
    });
    fetch(`/api/portal/disponibilidad?${qs}`)
      .then((r) => r.json())
      .then((data) => setFechasCerradas(new Set(data.fechasCerradas || [])))
      .catch(() => setFechasCerradas(new Set()));
  }, [form.sucursalId]);

  useEffect(() => {
    if (!form.sucursalId || !form.fechaPreferida || !form.tipoServicioId) return;
    const qs = new URLSearchParams({
      sucursalId: form.sucursalId,
      fecha: form.fechaPreferida,
      tipoServicioId: form.tipoServicioId,
    });
    fetch(`/api/portal/disponibilidad?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) {
          setFechaCerrada(true);
          setSlots([]);
          return;
        }
        setFechaCerrada(!data.abierto);
        setSlots(data.slots || []);
        if (data.slots?.length && !data.slots.includes(form.horaInicioPreferida)) {
          setForm((f) => ({ ...f, horaInicioPreferida: data.slots[0] }));
        }
      })
      .catch(() => {
        setFechaCerrada(true);
        setSlots([]);
      });
  }, [form.sucursalId, form.fechaPreferida, form.tipoServicioId]);

  function onFechaChange(value) {
    if (fechasCerradas.has(value)) {
      setError("No hay disponibilidad en esa fecha.");
      return;
    }
    setError("");
    setForm((f) => ({ ...f, fechaPreferida: value }));
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/portal/solicitudes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al crear solicitud");
      return;
    }
    load();
  }

  return (
    <div className="space-y-4">
      <h1 className={portalPageTitle}>Solicitudes de turno</h1>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl font-bold text-slate-900">Nueva solicitud</CardTitle>
        </CardHeader>
        <CardContent>
          {error ? <p className={`mb-4 ${portalError}`}>{error}</p> : null}
          <form onSubmit={onSubmit} className="grid gap-4">
            <Select surface="portal" value={form.mascotaId} onChange={(e) => setForm({ ...form, mascotaId: e.target.value })} required>
              {mascotas.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.nombre}
                </option>
              ))}
            </Select>
            <Select
              surface="portal"
              value={form.tipoServicioId}
              onChange={(e) => setForm({ ...form, tipoServicioId: e.target.value })}
            >
              {TIPOS_SERVICIO.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
            <Select surface="portal" value={form.sucursalId} onChange={(e) => setForm({ ...form, sucursalId: e.target.value })} required>
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigoInterno} — {s.nombreComercial}
                </option>
              ))}
            </Select>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                surface="portal"
                type="date"
                required
                min={new Date().toISOString().slice(0, 10)}
                value={form.fechaPreferida}
                onChange={(e) => onFechaChange(e.target.value)}
              />
              <Select
                surface="portal"
                required
                value={form.horaInicioPreferida}
                onChange={(e) => setForm({ ...form, horaInicioPreferida: e.target.value })}
                disabled={!slots.length}
              >
                {slots.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
            </div>
            {fechaCerrada ? <p className="text-base text-slate-600">No hay disponibilidad en la fecha seleccionada.</p> : null}
            <Button type="submit" size="portal" disabled={!slots.length || fechaCerrada} className="w-full sm:w-auto">
              Enviar solicitud
            </Button>
          </form>
        </CardContent>
      </Card>
      <div className="space-y-2">
        {solicitudes.map((s) => (
          <Card key={s.id}>
            <CardContent className="py-4">
              <p className={`font-semibold ${portalCardText}`}>
                {tipoNombre(s.tipoServicioId)} · {s.fechaPreferida} {s.horaInicioPreferida}
              </p>
              <p className={`${portalCardMeta} capitalize`}>
                Estado: {s.estado}
                {s.motivoRechazo ? ` — ${s.motivoRechazo}` : ""}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
