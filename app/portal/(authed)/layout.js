import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { PortalShell } from "@/components/PortalShell";

export default async function PortalAuthedLayout({ children }) {
  const session = await getSession();
  if (!session || session.rol !== "cliente") {
    redirect("/portal/ingreso");
  }
  return <PortalShell session={session}>{children}</PortalShell>;
}
