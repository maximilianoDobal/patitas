import { NextResponse } from "next/server";
import { getSession, requireStaff } from "@/lib/auth";
import { getCatalog } from "@/lib/repos/mockStore";
import { TIPOS_SERVICIO } from "@/lib/constants";

export async function GET() {
  const session = await getSession();
  try {
    requireStaff(session, ["recepcionista", "veterinario"]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: e.status || 500 });
  }
  return NextResponse.json({ ...getCatalog(session), tiposServicio: TIPOS_SERVICIO });
}
