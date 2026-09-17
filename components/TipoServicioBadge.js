import clsx from "clsx";
import { AlertTriangle, Scissors, Stethoscope, Syringe } from "lucide-react";
import { getTipoServicio } from "@/lib/constants";

const ICONS = {
  consulta_general: Stethoscope,
  vacunacion: Syringe,
  cirugia: AlertTriangle,
  estetica: Scissors,
};

export function TipoServicioBadge({ tipoServicioId, showIcon = true, size = "sm" }) {
  const tipo = getTipoServicio(tipoServicioId);
  if (!tipo) return <span className="text-xs">—</span>;
  const Icon = ICONS[tipoServicioId] ?? Stethoscope;
  const large = size === "md";

  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 font-semibold border",
        large ? "text-sm px-3 py-1 rounded-full" : "text-xs px-2.5 py-0.5 rounded-full",
        tipo.color.bg,
        tipo.color.text,
        tipo.color.border
      )}
    >
      {showIcon ? <Icon size={large ? 16 : 13} className="shrink-0" /> : null}
      {tipo.nombre}
    </span>
  );
}

export function getTipoServicioHex(tipoServicioId) {
  return getTipoServicio(tipoServicioId)?.color?.hex ?? "#4A90E2";
}
