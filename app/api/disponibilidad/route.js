import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { getTipoServicio } from "@/lib/constants";
import { computeGridHourBounds, tramosParaFecha } from "@/lib/horarioSucursal";
import { getCalendarioSucursal, getHorarioContextoSucursal, getSlotsSucursal } from "@/lib/repos/horarioSucursal";
import { weekRangeFromAnchor } from "@/lib/weekRange";

export async function GET(request) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "No autenticado." }, { status: 401 });
  }

  const sp = request.nextUrl.searchParams;
  const mode = sp.get("mode") || "slots";
  const requestedSucursal = sp.get("sucursalId");
  const sucursalId = requestedSucursal || session.sucursalId;
  if (!sucursalId) {
    return NextResponse.json({ error: "sucursalId es obligatorio." }, { status: 400 });
  }

  const isCliente = session.rol === "cliente";
  const isStaff = ["recepcionista", "veterinario", "administrador"].includes(session.rol);
  if (!isCliente && !isStaff) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }
  if (isStaff && session.rol !== "administrador" && sucursalId !== session.sucursalId) {
    return NextResponse.json({ error: "No autorizado." }, { status: 403 });
  }

  try {
    if (mode === "calendar") {
      const desde = sp.get("desde");
      const hasta = sp.get("hasta");
      if (!desde || !hasta) {
        return NextResponse.json({ error: "desde y hasta son obligatorios." }, { status: 400 });
      }
      const cal = await getCalendarioSucursal({ sucursalId, desde, hasta });
      return NextResponse.json(cal);
    }

    if (mode === "semana") {
      const anchor = sp.get("fecha") || new Date().toISOString().slice(0, 10);
      const days = weekRangeFromAnchor(anchor);
      const ctx = await getHorarioContextoSucursal(sucursalId);
      const bounds = computeGridHourBounds(ctx.horarioSemanal, days, ctx.cierres);
      const dias = {};
      for (const fecha of days) {
        const tramos = tramosParaFecha(fecha, ctx.horarioSemanal, ctx.cierres);
        dias[fecha] = { tramos, abierto: tramos.length > 0 };
      }
      return NextResponse.json({ bounds, dias });
    }

    const fecha = sp.get("fecha");
    if (!fecha) {
      return NextResponse.json({ error: "fecha es obligatoria." }, { status: 400 });
    }
    const tipoId = sp.get("tipoServicioId");
    const tipo = tipoId ? getTipoServicio(tipoId) : null;
    const duracionMinutos = Number(sp.get("duracionMinutos")) || tipo?.duracionMinutos || 30;
    const slots = await getSlotsSucursal({ sucursalId, fecha, duracionMinutos });
    return NextResponse.json(slots);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
