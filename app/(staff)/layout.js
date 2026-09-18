import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { StaffShell } from "@/components/StaffShell";
import { getCatalog } from "@/lib/repos";

export default async function StaffLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.rol === "cliente") redirect("/portal/inicio");
  const catalog = await getCatalog(session);
  return (
    <StaffShell session={session} sucursal={catalog.sucursal} sucursales={catalog.sucursales}>
      {children}
    </StaffShell>
  );
}
