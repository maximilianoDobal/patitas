"use client";

import { CATEGORIAS_EXCEPCION_AGENDA, MOTIVO_EXCEPCION_MIN_LENGTH } from "@/lib/excepcionAgenda";
import { Input, Select } from "@/components/ui/input";

const LABELS = {
  emergencia: "Emergencia",
  imprevisto: "Imprevisto",
  otro: "Otro",
};

export function ExcepcionAgendaFields({ value, onChange, compact = false }) {
  const { excepcionAgenda, categoriaExcepcionAgenda, motivoExcepcionAgenda } = value;

  return (
    <div className={compact ? "space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3" : "col-span-full space-y-2 rounded-xl border border-amber-200 bg-amber-50/50 p-3 md:col-span-4 lg:col-span-7"}>
      <label className="flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
        <input
          type="checkbox"
          checked={!!excepcionAgenda}
          onChange={(e) =>
            onChange({
              excepcionAgenda: e.target.checked,
              categoriaExcepcionAgenda: e.target.checked ? categoriaExcepcionAgenda || "emergencia" : null,
              motivoExcepcionAgenda: e.target.checked ? motivoExcepcionAgenda || "" : null,
            })
          }
          className="size-4 rounded border-slate-300"
        />
        Excepción de agenda (permite solapamiento)
      </label>
      {excepcionAgenda ? (
        <>
          <label className="block text-sm font-medium text-slate-700">
            Categoría
            <Select
              className="mt-1.5"
              value={categoriaExcepcionAgenda || "emergencia"}
              onChange={(e) => onChange({ ...value, categoriaExcepcionAgenda: e.target.value })}
            >
              {CATEGORIAS_EXCEPCION_AGENDA.map((id) => (
                <option key={id} value={id}>
                  {LABELS[id]}
                </option>
              ))}
            </Select>
          </label>
          <label className="block text-sm font-medium text-slate-700">
            Motivo
            <Input
              className="mt-1.5"
              value={motivoExcepcionAgenda || ""}
              onChange={(e) => onChange({ ...value, motivoExcepcionAgenda: e.target.value })}
              placeholder={`Mínimo ${MOTIVO_EXCEPCION_MIN_LENGTH} caracteres`}
            />
          </label>
        </>
      ) : null}
    </div>
  );
}

export function SolapadoBadge({ turno, showMotivo = false, inCluster = false }) {
  if (!turno.excepcionAgenda && !inCluster) return null;
  const title = turno.motivoExcepcionAgenda
    ? `${turno.categoriaExcepcionAgenda}: ${turno.motivoExcepcionAgenda}`
    : "Excepción de agenda";
  return (
    <span className="inline-flex max-w-full flex-col gap-0.5">
      <span
        title={title}
        className="inline-flex w-fit rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-900"
      >
        Solapado
      </span>
      {showMotivo && turno.motivoExcepcionAgenda ? (
        <span className="text-[10px] leading-tight text-amber-900/90">{turno.motivoExcepcionAgenda}</span>
      ) : null}
    </span>
  );
}
