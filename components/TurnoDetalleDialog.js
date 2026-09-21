"use client";

import { EstadoTurnoBadge } from "@/components/EstadoTurnoBadge";
import { SolapadoBadge } from "@/components/ExcepcionAgendaFields";
import { TipoServicioBadge } from "@/components/TipoServicioBadge";
import { Button } from "@/components/ui/button";
import { getTipoServicio } from "@/lib/constants";

function DetailRow({ label, children }) {
  return (
    <div className="flex flex-col gap-0.5 sm:flex-row sm:gap-3">
      <dt className="shrink-0 text-xs font-bold uppercase tracking-wide text-slate-400 sm:w-28">{label}</dt>
      <dd className="text-sm font-medium text-slate-800">{children}</dd>
    </div>
  );
}

export function TurnoDetalleDialog({ turno, mascota, cliente, veterinario, sala, onClose, actions }) {
  const tipo = getTipoServicio(turno.tipoServicioId);
  const duracion = turno.duracionMinutos ?? tipo?.duracionMinutos ?? 30;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="turno-detalle-title"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl sm:max-w-md sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 w-full bg-brand" />
        <div className="space-y-4 p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 id="turno-detalle-title" className="text-lg font-bold text-slate-800">
                Detalle del turno
              </h3>
              <p className="mt-1 font-mono text-sm text-slate-500">
                {turno.fecha} · {turno.horaInicio}
              </p>
            </div>
            <EstadoTurnoBadge estado={turno.estado} />
          </div>

          <dl className="space-y-3 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <DetailRow label="Mascota">{mascota?.nombre ?? turno.mascotaId}</DetailRow>
            {cliente ? (
              <DetailRow label="Cliente">
                {cliente.nombre}
                {cliente.telefono ? ` · ${cliente.telefono}` : ""}
              </DetailRow>
            ) : null}
            <DetailRow label="Servicio">
              <TipoServicioBadge tipoServicioId={turno.tipoServicioId} />
            </DetailRow>
            <DetailRow label="Duración">{duracion} min</DetailRow>
            <DetailRow label="Veterinario">{veterinario?.nombre ?? "—"}</DetailRow>
            <DetailRow label="Sala">{sala?.nombre ?? "—"}</DetailRow>
            {turno.excepcionAgenda ? (
              <DetailRow label="Excepción">
                <span className="flex flex-wrap items-center gap-2">
                  <SolapadoBadge turno={turno} showMotivo />
                  {turno.categoriaExcepcionAgenda ? (
                    <span className="text-slate-600">{turno.categoriaExcepcionAgenda}</span>
                  ) : null}
                </span>
                {turno.motivoExcepcionAgenda ? (
                  <p className="mt-1 text-sm font-normal text-slate-600">{turno.motivoExcepcionAgenda}</p>
                ) : null}
              </DetailRow>
            ) : null}
          </dl>

          {actions ? <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">{actions}</div> : null}

          <Button type="button" variant="secondary" className="w-full" onClick={onClose}>
            Cerrar
          </Button>
        </div>
      </div>
    </div>
  );
}
