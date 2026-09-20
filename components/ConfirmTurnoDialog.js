"use client";

import { useState } from "react";
import { ExcepcionAgendaFields } from "@/components/ExcepcionAgendaFields";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";

export function ConfirmTurnoDialog({ turno, salas, onConfirm, onCancel }) {
  const [salaId, setSalaId] = useState(turno.salaId);
  const [excepcion, setExcepcion] = useState({
    excepcionAgenda: turno.excepcionAgenda ?? false,
    categoriaExcepcionAgenda: turno.categoriaExcepcionAgenda,
    motivoExcepcionAgenda: turno.motivoExcepcionAgenda,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="h-1.5 w-full bg-brand" />
        <div className="space-y-4 p-6">
          <h3 className="text-lg font-bold text-slate-800">Confirmar turno</h3>
          <p className="text-sm text-slate-500">Revisá la sala antes de confirmar.</p>
          <label className="block text-sm font-medium text-slate-700">
            Sala
            <Select className="mt-1.5" value={salaId} onChange={(e) => setSalaId(e.target.value)}>
              {salas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </label>
          <ExcepcionAgendaFields compact value={excepcion} onChange={setExcepcion} />
          <div className="flex gap-2 pt-1">
            <Button
              type="button"
              className="flex-1"
              onClick={() => onConfirm({ estado: "confirmado", salaId, ...excepcion })}
            >
              Confirmar
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
