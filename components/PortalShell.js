"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Calendar, ClipboardList, FileText, Home, LogOut, PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";

const NAV = [
  { href: "/portal/inicio", label: "Inicio", shortLabel: "Inicio", Icon: Home },
  { href: "/portal/mascotas", label: "Mascotas", shortLabel: "Mascotas", Icon: PawPrint },
  { href: "/portal/solicitudes", label: "Solicitudes", shortLabel: "Pedir", Icon: ClipboardList },
  { href: "/portal/turnos", label: "Próximos turnos", shortLabel: "Turnos", Icon: Calendar },
  { href: "/portal/consultas", label: "Historial", shortLabel: "Historial", Icon: FileText },
];

function NavLink({ href, label, shortLabel, Icon, active, compact, className }) {
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center justify-center gap-1 rounded-xl px-2 py-2 text-center font-semibold transition-colors",
        compact ? "flex-col" : "flex-row",
        active ? "text-brand" : "text-slate-600 hover:bg-slate-50",
        className
      )}
      aria-current={active ? "page" : undefined}
    >
      <Icon size={compact ? 22 : 20} strokeWidth={active ? 2.25 : 2} aria-hidden />
      <span className={compact ? "text-xs leading-tight" : "text-base"}>{compact ? (shortLabel ?? label) : label}</span>
    </Link>
  );
}

export function PortalShell({ session, children }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/portal/ingreso");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 pb-[4.75rem] md:pb-0">
      <header className="border-b border-slate-200 bg-white px-4 py-4 shadow-sm">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3">
          <div>
            <p className="text-lg font-bold text-slate-900">Portal Patitas</p>
            <p className="text-base text-slate-600">{session.nombre}</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="portal"
            onClick={logout}
            className="min-w-[44px] px-3"
            aria-label="Cerrar sesión"
          >
            <LogOut size={20} />
            <span className="sr-only">Cerrar sesión</span>
          </Button>
        </div>
      </header>

      <nav className="hidden border-b border-slate-100 bg-white md:block" aria-label="Secciones del portal">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-2 px-4 py-3">
          {NAV.map(({ href, label, shortLabel, Icon }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              shortLabel={shortLabel}
              Icon={Icon}
              active={pathname === href}
              compact={false}
              className="min-h-[44px] min-w-[44px] gap-2 px-4 py-2.5"
            />
          ))}
        </div>
      </nav>

      <main className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-6">{children}</main>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur md:hidden"
        aria-label="Navegación principal"
      >
        <div className="mx-auto grid max-w-3xl grid-cols-5 gap-0 px-1 py-1">
          {NAV.map(({ href, label, shortLabel, Icon }) => (
            <NavLink
              key={href}
              href={href}
              label={label}
              shortLabel={shortLabel}
              Icon={Icon}
              active={pathname === href}
              compact
              className="min-h-[56px]"
            />
          ))}
        </div>
      </nav>
    </div>
  );
}
