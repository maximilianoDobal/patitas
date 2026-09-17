import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { StaffShell } from "@/components/StaffShell";

export default async function StaffLayout({ children }) {
  const session = await getSession();
  if (!session) redirect("/login");
  return <StaffShell session={session}>{children}</StaffShell>;
}
