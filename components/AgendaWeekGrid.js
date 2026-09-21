"use client";

import clsx from "clsx";
import { CLINICA_HORARIO, getTipoServicio } from "@/lib/constants";
import { SolapadoBadge } from "@/components/ExcepcionAgendaFields";
import { intervalosFueraDeTramos } from "@/lib/horarioSucursal";
import { parseTimeToMinutes } from "@/lib/scheduling";
import { layoutTurnosOverlapColumns } from "@/lib/turnoOverlapLayout";
import { weekRangeFromAnchor } from "@/lib/weekRange";
import { getTipoServicioHex } from "@/components/TipoServicioBadge";

export { weekRangeFromAnchor };

const SLOT_PX = 52;
/** Espacio superior/inferior para que etiquetas de hora y turnos a las 09:00 no se recorten. */
const GRID_PAD = 14;
const DAY_LABELS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];

function TurnoCard({ turno, mascotaNombre, onClick, inOverlapCluster = false }) {
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
      <div className="mb-0.5 flex items-center justify-between gap-1">
        <span className="font-mono text-[10px] text-slate-500">{turno.horaInicio}</span>
        <span className="flex shrink-0 items-center gap-0.5">
          <SolapadoBadge turno={turno} inCluster={inOverlapCluster} showMotivo={turno.excepcionAgenda} />
          {isProgramado ? <span className="text-[9px] font-bold text-amber-500">Programado</span> : null}
        </span>
      </div>
      <p className={clsx("truncate text-[11px] font-bold", tipo?.color.text)}>{mascotaNombre}</p>
    </button>
  );
}

export function AgendaWeekGrid({ anchorFecha, turnos, mascotasById, todayIso, semanaHorario, onTurnoSelect }) {
  const days = weekRangeFromAnchor(anchorFecha);
  const gridInicio = semanaHorario?.bounds?.inicio ?? CLINICA_HORARIO.inicio;
  const gridFin = semanaHorario?.bounds?.fin ?? CLINICA_HORARIO.fin;
  const hours = [];
  for (let h = gridInicio; h < gridFin; h++) hours.push(h);
  const gridStartMin = gridInicio * 60;
  const gridEndMin = gridFin * 60;
  const gridHeight = GRID_PAD * 2 + (gridFin - gridInicio) * SLOT_PX;

  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm">
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
      <div className="min-w-[920px]">
        <div className="grid grid-cols-[56px_repeat(7,1fr)]">
          <div className="relative border-r border-slate-100" style={{ height: gridHeight }}>
            {hours.map((h) => (
              <div
                key={h}
                className="absolute right-0 left-0 pr-1 text-right text-[10px] leading-none text-slate-400"
                style={{ top: GRID_PAD + (h - gridInicio) * SLOT_PX + 2 }}
              >
                {String(h).padStart(2, "0")}:00
              </div>
            ))}
          </div>
          {days.map((fecha) => {
            const dayTurnos = turnos.filter((t) => t.fecha === fecha);
            const overlapLayout = layoutTurnosOverlapColumns(dayTurnos);
            const dayHorario = semanaHorario?.dias?.[fecha];
            const diaCerrado = semanaHorario && dayHorario && !dayHorario.abierto;
            const fuera =
              semanaHorario && dayHorario?.abierto && dayHorario.tramos?.length
                ? intervalosFueraDeTramos(dayHorario.tramos, gridStartMin, gridEndMin)
                : [];
            return (
              <div key={fecha} className="relative border-r border-slate-100 bg-white last:border-r-0" style={{ height: gridHeight }}>
                {hours.map((h) => (
                  <div
                    key={h}
                    className="absolute right-0 left-0 border-t border-slate-100"
                    style={{ top: GRID_PAD + (h - gridInicio) * SLOT_PX }}
                  />
                ))}
                {diaCerrado ? (
                  <div className="pointer-events-none absolute inset-0 bg-slate-100/70" aria-hidden />
                ) : (
                  fuera.map(([from, to], i) => (
                    <div
                      key={`${fecha}-off-${i}`}
                      className="pointer-events-none absolute right-0 left-0 bg-slate-100/60"
                      style={{
                        top: GRID_PAD + ((from - gridStartMin) / 60) * SLOT_PX,
                        height: ((to - from) / 60) * SLOT_PX,
                      }}
                      aria-hidden
                    />
                  ))
                )}
                {dayTurnos.map((t) => {
                  const tipo = getTipoServicio(t.tipoServicioId);
                  const top = GRID_PAD + ((parseTimeToMinutes(t.horaInicio) - gridStartMin) / 60) * SLOT_PX;
                  const height = ((t.duracionMinutos ?? tipo?.duracionMinutos ?? 30) / 60) * SLOT_PX;
                  const mascota = mascotasById.get(t.mascotaId);
                  const placement = overlapLayout.get(t.id);
                  const columnCount = placement?.columnCount ?? 1;
                  const column = placement?.column ?? 0;
                  const inOverlapCluster = columnCount > 1;
                  const widthPct = 100 / columnCount;
                  return (
                    <div
                      key={t.id}
                      className="absolute px-0.5"
                      style={{
                        top,
                        height: Math.max(height, 36),
                        left: `${column * widthPct}%`,
                        width: `${widthPct}%`,
                      }}
                    >
                      <TurnoCard
                        turno={t}
                        mascotaNombre={mascota?.nombre ?? "—"}
                        inOverlapCluster={inOverlapCluster}
                        onClick={() => onTurnoSelect?.(t)}
                      />
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
