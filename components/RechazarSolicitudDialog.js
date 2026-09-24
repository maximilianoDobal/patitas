"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

export function RechazarSolicitudDialog({ solicitud, onConfirm, onCancel, submitting = false }) {
  const [motivo, setMotivo] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="rechazar-solicitud-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) onCancel();
      }}
    >
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1.5 w-full bg-red-500" />
        <form
          className="space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            onConfirm(motivo.trim());
          }}
        >
          <h3 id="rechazar-solicitud-title" className="text-lg font-bold text-slate-800">
            Rechazar solicitud
          </h3>
          {solicitud ? (
            <p className="text-sm text-slate-600">
              <span className="font-semibold text-slate-800">
                {solicitud.clienteNombre} — {solicitud.mascotaNombre}
              </span>
              <br />
              <span className="text-slate-500">
                {solicitud.fechaPreferida} · {solicitud.horaInicioPreferida}
              </span>
            </p>
          ) : null}
          <label className="block text-sm font-medium text-slate-700">
            Motivo de rechazo <span className="font-normal text-slate-400">(opcional)</span>
            <textarea
              className="mt-1.5 w-full resize-y rounded-xl border border-slate-200 bg-slate-50/80 px-3 py-2 text-sm text-slate-800 placeholder:text-slate-400 focus-visible:border-brand/40 focus-visible:ring-2 focus-visible:ring-brand/25 focus-visible:outline-none"
              rows={3}
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ej.: horario no disponible, servicio no ofrecido en sucursal…"
              disabled={submitting}
              autoFocus
            />
          </label>
          <div className="flex gap-2 pt-1">
            <Button type="submit" variant="destructive" className="flex-1" disabled={submitting}>
              {submitting ? "Rechazando…" : "Rechazar"}
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={onCancel} disabled={submitting}>
              Cerrar
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
