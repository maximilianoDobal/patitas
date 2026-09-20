import { NextResponse } from "next/server";
import { getSession, requireCliente } from "@/lib/auth";
import { getTipoServicio } from "@/lib/constants";
import { getCalendarioSucursal, getSlotsSucursal } from "@/lib/repos/horarioSucursal";

export async function GET(request) {
  const session = await getSession();
  try {
    requireCliente(session);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }

  const sp = request.nextUrl.searchParams;
  const sucursalId = sp.get("sucursalId");
  if (!sucursalId) {
    return NextResponse.json({ error: "sucursalId es obligatorio." }, { status: 400 });
  }

  const mode = sp.get("mode") || "slots";

  try {
    if (mode === "calendar") {
      const desde = sp.get("desde");
      const hasta = sp.get("hasta");
      if (!desde || !hasta) {
        return NextResponse.json({ error: "desde y hasta son obligatorios." }, { status: 400 });
      }
      return NextResponse.json(await getCalendarioSucursal({ sucursalId, desde, hasta }));
    }

    const fecha = sp.get("fecha");
    const tipoId = sp.get("tipoServicioId");
    if (!fecha || !tipoId) {
      return NextResponse.json({ error: "fecha y tipoServicioId son obligatorios." }, { status: 400 });
    }
    const tipo = getTipoServicio(tipoId);
    if (!tipo) return NextResponse.json({ error: "Tipo de servicio inválido." }, { status: 400 });
    const slots = await getSlotsSucursal({ sucursalId, fecha, duracionMinutos: tipo.duracionMinutos });
    return NextResponse.json(slots);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
