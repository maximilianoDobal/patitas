"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Calendar, ClipboardList, FileText, LogOut, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/portal/inicio", label: "Inicio", Icon: PawPrint },
  { href: "/portal/mascotas", label: "Mascotas", Icon: PawPrint },
  { href: "/portal/solicitudes", label: "Solicitudes", Icon: ClipboardList },
  { href: "/portal/turnos", label: "Próximos turnos", Icon: Calendar },
  { href: "/portal/consultas", label: "Historial", Icon: FileText },
];

export function PortalShell({ session, children }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/portal/ingreso");
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-4 py-3 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-sm font-bold text-slate-800">Portal Patitas</p>
            <p className="text-xs text-slate-500">{session.nombre}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={logout} aria-label="Cerrar sesión">
            <LogOut size={16} />
          </Button>
        </div>
      </header>
      <nav className="border-b border-slate-100 bg-white">
        <div className="mx-auto flex max-w-3xl gap-1 overflow-x-auto px-2 py-2">
          {NAV.map(({ href, label, Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                className={clsx(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium",
                  active ? "bg-brand/10 text-brand" : "text-slate-500 hover:bg-slate-50"
                )}
              >
                <Icon size={14} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
      <main className="mx-auto max-w-3xl p-4">{children}</main>
    </div>
  );
}
