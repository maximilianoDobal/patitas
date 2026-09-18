"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Calendar, FileText, LogOut, PawPrint, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { isRolOperativo } from "@/lib/constants";

const NAV = [
  { href: "/agenda", label: "Agenda", Icon: Calendar, roles: ["recepcionista", "veterinario", "administrador"] },
  { href: "/clientes", label: "Clientes", Icon: Users, roles: ["recepcionista", "administrador"] },
  { href: "/mascotas", label: "Mascotas", Icon: PawPrint, roles: ["recepcionista", "administrador"] },
  { href: "/consultas", label: "Consultas", Icon: FileText, roles: ["veterinario"] },
  { label: "Administración", Icon: Settings, roles: ["administrador"], proximamente: true },
];

function initials(nombre) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function StaffShell({ session, sucursal, sucursales = [], children }) {
  const pathname = usePathname();
  const router = useRouter();
  const items = NAV.filter((n) => n.roles.includes(session.rol));
  const canSwitchSucursal = isRolOperativo(session.rol) && sucursales.length > 1;
  const [switchError, setSwitchError] = useState("");

  async function onSwitchSucursal(sucursalId) {
    if (!sucursalId || sucursalId === session.sucursalId) return;
    setSwitchError("");
    const res = await fetch("/api/auth/switch-sucursal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sucursalId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setSwitchError(data.error || "No se pudo cambiar la sucursal.");
      return;
    }
    router.refresh();
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-100">
      <header className="z-20 flex h-16 shrink-0 items-center gap-4 border-b border-slate-200 bg-white px-6 shadow-sm">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-sm shadow-brand/30">
            <PawPrint size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-none tracking-tight text-slate-800">Patitas</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Clínica Veterinaria</p>
          </div>
        </div>
        <div className="flex-1" />
        <div className="hidden min-w-0 flex-col items-end gap-0.5 sm:flex">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Sucursal activa</p>
          {canSwitchSucursal ? (
            <Select
              className="max-w-[200px] text-sm font-semibold"
              value={session.sucursalId}
              onChange={(e) => onSwitchSucursal(e.target.value)}
              aria-label="Cambiar sucursal activa"
            >
              {sucursales.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.codigoInterno}
                </option>
              ))}
            </Select>
          ) : (
            <p className="text-sm font-semibold text-slate-700">{sucursal?.codigoInterno ?? "—"}</p>
          )}
          {switchError ? <p className="text-[10px] text-red-600">{switchError}</p> : null}
        </div>
        <div className="flex items-center gap-2.5 border-l border-slate-100 pl-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
            {initials(session.nombre)}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold leading-none text-slate-700">{session.nombre}</p>
            <p className="mt-0.5 text-[10px] capitalize text-slate-400">{session.rol}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={logout} aria-label="Cerrar sesión">
            <LogOut size={16} />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="z-10 flex w-56 shrink-0 flex-col border-r border-slate-100 bg-white shadow-sm">
          <nav className="flex-1 overflow-y-auto px-3 py-5">
            <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">Menú principal</p>
            <div className="space-y-0.5">
              {items.map(({ href, label, Icon, proximamente }) => {
                if (proximamente) {
                  return (
                    <div
                      key={label}
                      className="flex w-full cursor-not-allowed items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-400"
                      title="Próximamente — epic portales"
                    >
                      <Icon size={16} className="text-slate-300" />
                      <span className="flex-1 text-left">{label}</span>
                      <span className="text-[9px] font-semibold uppercase tracking-wide">Próx.</span>
                    </div>
                  );
                }
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                      active
                        ? "bg-brand/10 text-brand"
                        : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
                    )}
                  >
                    <Icon size={16} className={active ? "text-brand" : "text-slate-400"} />
                    <span className="flex-1 text-left">{label}</span>
                    {active ? <div className="h-1.5 w-1.5 rounded-full bg-brand" /> : null}
                  </Link>
                );
              })}
            </div>
          </nav>
          <div className="border-t border-slate-100 p-4">
            <div className="rounded-xl border border-brand/15 bg-brand/5 p-3">
              <p className="mb-1 text-[9px] font-bold uppercase tracking-widest text-brand">Sucursal activa</p>
              <p className="text-sm font-bold text-slate-700">{sucursal?.codigoInterno ?? "—"}</p>
              <p className="mt-1 text-xs text-slate-500">{sucursal?.nombreComercial ?? ""}</p>
            </div>
          </div>
        </aside>
        <main className="min-w-0 flex-1 overflow-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
