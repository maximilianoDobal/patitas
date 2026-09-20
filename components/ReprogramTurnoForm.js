"use client";

import { useState } from "react";
import { ExcepcionAgendaFields } from "@/components/ExcepcionAgendaFields";
import { buildTimeSlots } from "@/lib/scheduling";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/input";

export function ReprogramTurnoForm({ turno, catalog, onSave, onCancel }) {
  const slots = buildTimeSlots();
  const [state, setState] = useState({
    fecha: turno.fecha,
    horaInicio: turno.horaInicio,
    veterinarioId: turno.veterinarioId,
    salaId: turno.salaId,
    tipoServicioId: turno.tipoServicioId,
    excepcionAgenda: turno.excepcionAgenda ?? false,
    categoriaExcepcionAgenda: turno.categoriaExcepcionAgenda,
    motivoExcepcionAgenda: turno.motivoExcepcionAgenda,
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
      <form
        className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl"
        onSubmit={(e) => {
          e.preventDefault();
          onSave(state);
        }}
      >
        <div className="h-1.5 w-full bg-brand" />
        <div className="space-y-3 p-6">
          <h3 className="text-lg font-bold text-slate-800">Reprogramar turno</h3>
          <label className="block text-sm font-medium text-slate-700">
            Fecha
            <Input
              type="date"
              className="mt-1.5"
              value={state.fecha}
              onChange={(e) => setState({ ...state, fecha: e.target.value })}
            />
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Hora
            <Select
              className="mt-1.5"
              value={state.horaInicio}
              onChange={(e) => setState({ ...state, horaInicio: e.target.value })}
            >
              {slots.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Tipo de servicio
            <Select
              className="mt-1.5"
              value={state.tipoServicioId}
              onChange={(e) => setState({ ...state, tipoServicioId: e.target.value })}
            >
              {catalog.tiposServicio.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nombre}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Veterinario
            <Select
              className="mt-1.5"
              value={state.veterinarioId}
              onChange={(e) => setState({ ...state, veterinarioId: e.target.value })}
            >
              {catalog.veterinarios.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.nombre}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Sala
            <Select
              className="mt-1.5"
              value={state.salaId}
              onChange={(e) => setState({ ...state, salaId: e.target.value })}
            >
              {catalog.salas.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nombre}
                </option>
              ))}
            </Select>
          </label>
          <ExcepcionAgendaFields
            compact
            value={state}
            onChange={(excepcion) => setState({ ...state, ...excepcion })}
          />
          <div className="flex gap-2 pt-2">
            <Button type="submit" className="flex-1">
              Guardar
            </Button>
            <Button type="button" variant="secondary" className="flex-1" onClick={onCancel}>
              Cerrar
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
