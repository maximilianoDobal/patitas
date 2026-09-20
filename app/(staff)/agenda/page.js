"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AgendaWeekGrid, weekRangeFromAnchor } from "@/components/AgendaWeekGrid";
import { ConfirmTurnoDialog } from "@/components/ConfirmTurnoDialog";
import { EstadoTurnoBadge } from "@/components/EstadoTurnoBadge";
import { ExcepcionAgendaFields, SolapadoBadge } from "@/components/ExcepcionAgendaFields";
import { ReprogramTurnoForm } from "@/components/ReprogramTurnoForm";
import { TipoServicioBadge } from "@/components/TipoServicioBadge";
import { groupTurnosByOverlap } from "@/lib/turnoOverlapLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

export default function AgendaPage() {
  const [catalog, setCatalog] = useState(null);
  const [session, setSession] = useState(null);
  const [fecha, setFecha] = useState(todayIso());
  const [vista, setVista] = useState("dia");
  const [filtroVet, setFiltroVet] = useState("");
  const [filtroSala, setFiltroSala] = useState("");
  const [turnos, setTurnos] = useState([]);
  const [weekTurnos, setWeekTurnos] = useState([]);
  const [error, setError] = useState("");
  const [confirmTarget, setConfirmTarget] = useState(null);
  const [reprogramTarget, setReprogramTarget] = useState(null);
  const [daySlots, setDaySlots] = useState([]);
  const [fechaCerrada, setFechaCerrada] = useState(false);
  const [semanaHorario, setSemanaHorario] = useState(null);
  const [form, setForm] = useState({
    mascotaId: "",
    tipoServicioId: "consulta_general",
    veterinarioId: "",
    salaId: "",
    horaInicio: "09:00",
    excepcionAgenda: false,
    categoriaExcepcionAgenda: null,
    motivoExcepcionAgenda: null,
  });

  const load = useCallback(async () => {
    const [meRes, catRes] = await Promise.all([fetch("/api/me"), fetch("/api/catalog")]);
    const me = await meRes.json();
    const cat = await catRes.json();
    setSession(me.session);
    setCatalog(cat);
    if (me.session?.rol === "veterinario") setFiltroVet(me.session.userId);
  }, []);

  const loadTurnos = useCallback(async () => {
    const qs = new URLSearchParams({ fecha });
    if (filtroVet) qs.set("veterinarioId", filtroVet);
    if (filtroSala) qs.set("salaId", filtroSala);
    const res = await fetch(`/api/turnos?${qs}`);
    setTurnos((await res.json()).turnos || []);
  }, [fecha, filtroVet, filtroSala]);

  const loadWeekTurnos = useCallback(async () => {
    const days = weekRangeFromAnchor(fecha);
    const qs = new URLSearchParams({ fechaDesde: days[0], fechaHasta: days[6] });
    if (filtroVet) qs.set("veterinarioId", filtroVet);
    if (filtroSala) qs.set("salaId", filtroSala);
    const res = await fetch(`/api/turnos?${qs}`);
    setWeekTurnos((await res.json()).turnos || []);
  }, [fecha, filtroVet, filtroSala]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!session) return;
    loadTurnos();
    if (vista === "semana") loadWeekTurnos();
  }, [session, loadTurnos, loadWeekTurnos, vista]);

  useEffect(() => {
    const recep = session?.rol === "recepcionista" || session?.rol === "administrador";
    if (!session || !recep) return;
    const qs = new URLSearchParams({ fecha, tipoServicioId: form.tipoServicioId });
    fetch(`/api/disponibilidad?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        setFechaCerrada(!data.abierto);
        setDaySlots(data.slots || []);
        if (data.slots?.length && !data.slots.includes(form.horaInicio)) {
          setForm((f) => ({ ...f, horaInicio: data.slots[0] }));
        }
      })
      .catch(() => {
        setDaySlots([]);
        setFechaCerrada(true);
      });
  }, [session, fecha, form.tipoServicioId]);

  useEffect(() => {
    if (!session || vista !== "semana") return;
    const qs = new URLSearchParams({ mode: "semana", fecha });
    fetch(`/api/disponibilidad?${qs}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.bounds) setSemanaHorario(data);
      })
      .catch(() => setSemanaHorario(null));
  }, [session, vista, fecha]);

  const mascotasById = useMemo(() => {
    const map = new Map();
    catalog?.mascotas?.forEach((m) => map.set(m.id, m));
    return map;
  }, [catalog]);

  const clientesById = useMemo(() => {
    const map = new Map();
    catalog?.clientes?.forEach((c) => map.set(c.id, c));
    return map;
  }, [catalog]);

  async function crearTurno(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/turnos", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, fecha, estado: "programado" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo crear el turno");
      return;
    }
    setForm((f) => ({
      ...f,
      mascotaId: "",
      salaId: "",
      excepcionAgenda: false,
      categoriaExcepcionAgenda: null,
      motivoExcepcionAgenda: null,
    }));
    loadTurnos();
    if (vista === "semana") loadWeekTurnos();
  }

  async function patchTurno(id, patch) {
    setError("");
    const res = await fetch(`/api/turnos/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo actualizar");
      return;
    }
    setConfirmTarget(null);
    setReprogramTarget(null);
    loadTurnos();
    if (vista === "semana") loadWeekTurnos();
  }

  const isRecep = session?.rol === "recepcionista" || session?.rol === "administrador";
  const today = todayIso();
  const dayGroups = useMemo(() => groupTurnosByOverlap(turnos), [turnos]);

  function renderTurnoActions(t) {
    const terminal = ["cancelado", "atendido"].includes(t.estado);
    return (
      <div className="flex flex-wrap gap-1.5">
        {isRecep && t.estado === "programado" ? (
          <Button type="button" size="sm" variant="secondary" onClick={() => setConfirmTarget(t)}>
            Confirmar
          </Button>
        ) : null}
        {isRecep && !terminal && t.estado !== "no_asistio" ? (
          <>
            <Button type="button" size="sm" variant="outline" onClick={() => setReprogramTarget(t)}>
              Reprogramar
            </Button>
            <Button type="button" size="sm" variant="secondary" onClick={() => patchTurno(t.id, { estado: "no_asistio" })}>
              No asistió
            </Button>
            <Button type="button" size="sm" variant="destructive" onClick={() => patchTurno(t.id, { estado: "cancelado" })}>
              Cancelar
            </Button>
          </>
        ) : null}
        {session?.rol === "veterinario" && t.estado === "confirmado" ? (
          <Button type="button" size="sm" onClick={() => patchTurno(t.id, { estado: "en_atencion" })}>
            En atención
          </Button>
        ) : null}
      </div>
    );
  }

  function renderTurnoRow(t) {
    const m = mascotasById.get(t.mascotaId);
    const vet = catalog?.veterinarios?.find((v) => v.id === t.veterinarioId);
    const sala = catalog?.salas?.find((s) => s.id === t.salaId);
    return (
      <>
        <td className="p-3 font-mono font-semibold text-slate-700">
          <div className="flex items-center gap-2">
            {t.horaInicio}
            <SolapadoBadge turno={t} showMotivo={!!t.excepcionAgenda} />
          </div>
        </td>
        <td className="p-3 font-medium text-slate-800">{m?.nombre ?? t.mascotaId}</td>
        <td className="p-3">
          <TipoServicioBadge tipoServicioId={t.tipoServicioId} />
        </td>
        <td className="p-3 text-slate-500">
          {vet?.nombre} · {sala?.nombre}
        </td>
        <td className="p-3">
          <EstadoTurnoBadge estado={t.estado} />
        </td>
        <td className="p-3">{renderTurnoActions(t)}</td>
      </>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800">Agenda</h2>
          <p className="text-sm text-slate-500">
            {catalog?.sucursal?.nombreComercial} · {catalog?.sucursal?.codigoInterno}
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
            <button
              type="button"
              className={cn("px-4 py-2 font-semibold transition-colors", vista === "dia" ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-50")}
              onClick={() => setVista("dia")}
            >
              Día
            </button>
            <button
              type="button"
              className={cn("px-4 py-2 font-semibold transition-colors", vista === "semana" ? "bg-brand text-white" : "text-slate-600 hover:bg-slate-50")}
              onClick={() => setVista("semana")}
            >
              Semana
            </button>
          </div>
          <label className="text-sm font-medium text-slate-600">
            Fecha
            <Input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className="ml-2 w-auto" />
          </label>
          {isRecep ? (
            <>
              <label className="text-sm font-medium text-slate-600">
                Veterinario
                <Select value={filtroVet} onChange={(e) => setFiltroVet(e.target.value)} className="ml-2 w-40">
                  <option value="">Todos</option>
                  {catalog?.veterinarios?.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.nombre}
                    </option>
                  ))}
                </Select>
              </label>
              <label className="text-sm font-medium text-slate-600">
                Sala
                <Select value={filtroSala} onChange={(e) => setFiltroSala(e.target.value)} className="ml-2 w-36">
                  <option value="">Todas</option>
                  {catalog?.salas?.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nombre}
                    </option>
                  ))}
                </Select>
              </label>
            </>
          ) : null}
        </div>
      </div>

      {error ? <p className="text-sm font-medium text-red-600">{error}</p> : null}

      {isRecep ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nuevo turno</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={crearTurno} className="grid grid-cols-2 items-end gap-3 md:grid-cols-4 lg:grid-cols-7">
              <Select required value={form.mascotaId} onChange={(e) => setForm({ ...form, mascotaId: e.target.value })} aria-label="Mascota">
                <option value="">Mascota</option>
                {catalog?.mascotas?.map((m) => {
                  const c = clientesById.get(m.clienteId);
                  return (
                    <option key={m.id} value={m.id}>
                      {m.nombre} ({c?.nombre})
                    </option>
                  );
                })}
              </Select>
              <Select value={form.tipoServicioId} onChange={(e) => setForm({ ...form, tipoServicioId: e.target.value })} aria-label="Tipo de servicio">
                {catalog?.tiposServicio?.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.nombre}
                  </option>
                ))}
              </Select>
              <Select required value={form.veterinarioId} onChange={(e) => setForm({ ...form, veterinarioId: e.target.value })} aria-label="Veterinario">
                <option value="">Veterinario</option>
                {catalog?.veterinarios?.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.nombre}
                  </option>
                ))}
              </Select>
              <Select value={form.salaId} onChange={(e) => setForm({ ...form, salaId: e.target.value })} aria-label="Sala">
                <option value="">Sala (auto)</option>
                {catalog?.salas?.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.nombre}
                  </option>
                ))}
              </Select>
              <Select
                value={form.horaInicio}
                onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                aria-label="Hora"
                disabled={!daySlots.length}
              >
                {daySlots.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </Select>
              <ExcepcionAgendaFields
                value={form}
                onChange={(excepcion) => setForm({ ...form, ...excepcion })}
              />
              {fechaCerrada ? (
                <p className="col-span-2 text-sm text-amber-700">La sucursal no atiende en esta fecha.</p>
              ) : null}
              <Button type="submit" className="col-span-2 lg:col-span-2" disabled={!daySlots.length}>
                Crear turno
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {vista === "semana" ? (
        <AgendaWeekGrid
          anchorFecha={fecha}
          turnos={weekTurnos}
          mascotasById={mascotasById}
          todayIso={today}
          semanaHorario={semanaHorario}
        />
      ) : (
        <Card className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="border-b border-slate-100 bg-slate-50/80 text-left">
                <tr>
                  <th className="p-3 font-semibold text-slate-600">Hora</th>
                  <th className="p-3 font-semibold text-slate-600">Mascota</th>
                  <th className="p-3 font-semibold text-slate-600">Tipo de servicio</th>
                  <th className="p-3 font-semibold text-slate-600">Vet / Sala</th>
                  <th className="p-3 font-semibold text-slate-600">Estado</th>
                  <th className="p-3 font-semibold text-slate-600">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {dayGroups.map((group) => {
                  if (group.kind === "single") {
                    const t = group.turno;
                    return (
                      <tr key={t.id} className="border-t border-slate-50 hover:bg-slate-50/50">
                        {renderTurnoRow(t)}
                      </tr>
                    );
                  }
                  return (
                    <tr key={group.turnos.map((t) => t.id).join("-")} className="border-t border-slate-50 hover:bg-slate-50/50">
                      <td colSpan={6} className="p-3">
                        <div className="flex flex-wrap gap-2">
                          {group.turnos.map((t) => {
                            const m = mascotasById.get(t.mascotaId);
                            const vet = catalog?.veterinarios?.find((v) => v.id === t.veterinarioId);
                            const sala = catalog?.salas?.find((s) => s.id === t.salaId);
                            return (
                              <div
                                key={t.id}
                                className="min-w-[220px] flex-1 rounded-xl border border-amber-200/80 bg-white p-3 shadow-sm"
                              >
                                <div className="mb-2 flex items-center justify-between gap-2">
                                  <span className="font-mono text-sm font-bold text-slate-700">{t.horaInicio}</span>
                                  <SolapadoBadge turno={t} inCluster showMotivo={!!t.excepcionAgenda} />
                                </div>
                                <p className="font-semibold text-slate-800">{m?.nombre ?? t.mascotaId}</p>
                                <div className="mt-1">
                                  <TipoServicioBadge tipoServicioId={t.tipoServicioId} />
                                </div>
                                <p className="mt-1 text-xs text-slate-500">
                                  {vet?.nombre} · {sala?.nombre}
                                </p>
                                <div className="mt-2 flex items-center justify-between gap-2">
                                  <EstadoTurnoBadge estado={t.estado} />
                                  {renderTurnoActions(t)}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {turnos.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-400">
                      Sin turnos para esta fecha y filtros.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {confirmTarget && catalog ? (
        <ConfirmTurnoDialog
          turno={confirmTarget}
          salas={catalog.salas}
          onConfirm={(patch) => patchTurno(confirmTarget.id, patch)}
          onCancel={() => setConfirmTarget(null)}
        />
      ) : null}

      {reprogramTarget && catalog ? (
        <ReprogramTurnoForm
          turno={reprogramTarget}
          catalog={catalog}
          onSave={(patch) => patchTurno(reprogramTarget.id, patch)}
          onCancel={() => setReprogramTarget(null)}
        />
      ) : null}
    </div>
  );
}
