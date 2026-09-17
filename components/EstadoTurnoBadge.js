import clsx from "clsx";

const ESTADO_STYLE = {
  programado: "bg-amber-50 text-amber-700 border-amber-200",
  confirmado: "bg-emerald-50 text-emerald-700 border-emerald-200",
  en_atencion: "bg-sky-50 text-sky-700 border-sky-200",
  atendido: "bg-slate-100 text-slate-600 border-slate-200",
  cancelado: "bg-red-50 text-red-600 border-red-200",
  no_asistio: "bg-orange-50 text-orange-700 border-orange-200",
};

const ESTADO_LABEL = {
  programado: "Programado",
  confirmado: "Confirmado",
  en_atencion: "En atención",
  atendido: "Atendido",
  cancelado: "Cancelado",
  no_asistio: "No asistió",
};

export function EstadoTurnoBadge({ estado }) {
  return (
    <span
      className={clsx(
        "inline-flex text-xs font-semibold px-2.5 py-0.5 rounded-full border",
        ESTADO_STYLE[estado] ?? "bg-slate-50 text-slate-600"
      )}
    >
      {ESTADO_LABEL[estado] ?? estado}
    </span>
  );
}
