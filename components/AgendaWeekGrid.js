"use client";

import clsx from "clsx";
import { CLINICA_HORARIO, getTipoServicio } from "@/lib/constants";
import { parseTimeToMinutes } from "@/lib/scheduling";
import { getTipoServicioHex } from "@/components/TipoServicioBadge";

const SLOT_PX = 52;
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function startOfWeek(isoDate) {
  const d = new Date(`${isoDate}T12:00:00`);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function addDays(isoDate, days) {
  const d = new Date(`${isoDate}T12:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export function weekRangeFromAnchor(anchorIso) {
  const start = startOfWeek(anchorIso);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

function TurnoCard({ turno, mascotaNombre, onClick }) {
  const tipo = getTipoServicio(turno.tipoServicioId);
  const hex = getTipoServicioHex(turno.tipoServicioId);
  const isProgramado = turno.estado === "programado";

  if (turno.estado === "cancelado") {
    return (
      <button
        type="button"
        onClick={onClick}
        className="w-full rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 text-left transition-colors hover:bg-gray-100"
      >
        <span className="text-[10px] font-mono text-gray-400">{turno.horaInicio}</span>
        <p className="truncate text-[11px] font-semibold text-gray-400 line-through">{mascotaNombre}</p>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "w-full rounded-lg px-2 py-1.5 text-left transition-all hover:shadow-md",
        isProgramado
          ? `border border-dashed ${tipo?.color.border} ${tipo?.color.bg}`
          : `${tipo?.color.bg} border border-transparent shadow-sm`
      )}
      style={isProgramado ? undefined : { borderLeft: `3px solid ${hex}` }}
    >
      <div className="mb-0.5 flex items-center justify-between">
        <span className="font-mono text-[10px] text-slate-500">{turno.horaInicio}</span>
        {isProgramado ? <span className="text-[9px] font-bold text-amber-500">Programado</span> : null}
      </div>
      <p className={clsx("truncate text-[11px] font-bold", tipo?.color.text)}>{mascotaNombre}</p>
    </button>
  );
}

export function AgendaWeekGrid({ anchorFecha, turnos, mascotasById, todayIso }) {
  const days = weekRangeFromAnchor(anchorFecha);
  const hours = [];
  for (let h = CLINICA_HORARIO.inicio; h < CLINICA_HORARIO.fin; h++) hours.push(h);
  const gridStartMin = CLINICA_HORARIO.inicio * 60;
  const gridHeight = (CLINICA_HORARIO.fin - CLINICA_HORARIO.inicio) * SLOT_PX;

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
      <div className="grid min-w-[920px] grid-cols-[56px_repeat(7,1fr)] border-b border-slate-100 bg-slate-50/60">
        <div />
        {days.map((fecha, idx) => {
          const isToday = todayIso && fecha === todayIso;
          return (
            <div
              key={fecha}
              className={clsx(
                "border-r border-slate-100 py-3 text-center last:border-r-0",
                isToday && "bg-brand/5"
              )}
            >
              <p className={clsx("text-[9px] font-bold uppercase tracking-widest", isToday ? "text-brand" : "text-slate-400")}>
                {DAY_LABELS[idx]}
              </p>
              <p className={clsx("text-sm font-bold", isToday ? "text-brand" : "text-slate-700")}>{fecha.slice(8)}</p>
            </div>
          );
        })}
      </div>
      <div className="min-w-[920px] overflow-x-auto">
        <div className="grid grid-cols-[56px_repeat(7,1fr)]">
          <div className="relative border-r border-slate-100" style={{ height: gridHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-0 left-0 pr-1 text-right text-[10px] text-slate-400"
                style={{ top: (h - CLINICA_HORARIO.inicio) * SLOT_PX - 6 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((fecha) => {
            const dayTurnos = turnos.filter((t) => t.fecha === fecha);
            return (
              <div key={fecha} className="relative border-r border-slate-100 bg-white last:border-r-0" style={{ height: gridHeight }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-0 left-0 border-t border-slate-100"
                    style={{ top: (h - CLINICA_HORARIO.inicio) * SLOT_PX }}
                  />
                ))}
                {dayTurnos.map((t) => {
                  const tipo = getTipoServicio(t.tipoServicioId);
                  const top = ((parseTimeToMinutes(t.horaInicio) - gridStartMin) / 60) * SLOT_PX;
                  const height = ((t.duracionMinutos ?? tipo?.duracionMinutos ?? 30) / 60) * SLOT_PX;
                  const mascota = mascotasById.get(t.mascotaId);
                  return (
                    <div
                      key={t.id}
                      className="absolute right-1 left-1"
                      style={{ top, height: Math.max(height, 36) }}
                    >
                      <TurnoCard turno={t} mascotaNombre={mascota?.nombre ?? "—"} />
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
