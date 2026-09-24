"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import clsx from "clsx";
import { Calendar, ClipboardList, FileText, LogOut, PawPrint, Settings, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/input";
import { isRolOperativo } from "@/lib/constants";
import {
  formatSolicitudesBadgeCount,
  shouldHideSolicitudesNavBadge,
  solicitudesNavAriaLabel,
} from "@/lib/solicitudesNavBadge";

const SOLICITUDES_POLL_MS = 60 * 60 * 1000;

const NAV = [
  { href: "/agenda", label: "Agenda", shortLabel: "Agenda", Icon: Calendar, roles: ["recepcionista", "veterinario", "administrador"] },
  { href: "/clientes", label: "Clientes", shortLabel: "Clientes", Icon: Users, roles: ["recepcionista", "administrador"] },
  { href: "/mascotas", label: "Mascotas", shortLabel: "Mascotas", Icon: PawPrint, roles: ["recepcionista", "administrador"] },
  { href: "/solicitudes", label: "Solicitudes", shortLabel: "Pedidos", Icon: ClipboardList, roles: ["recepcionista", "administrador"] },
  { href: "/consultas", label: "Consultas", shortLabel: "Consultas", Icon: FileText, roles: ["veterinario"] },
  { href: "/admin", label: "Administración", shortLabel: "Admin", Icon: Settings, roles: ["administrador"] },
];

function initials(nombre) {
  return nombre
    .split(" ")
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

function SolicitudesNavBadgeWithDot({ count, compact }) {
  const badge = formatSolicitudesBadgeCount(count);
  if (!badge) return null;
  return (
    <>
      <span
        className={clsx(
          "pointer-events-none absolute flex items-center justify-center rounded-full bg-amber-500 ring-2 ring-white",
          badge.showNumber
            ? clsx(
                "font-bold text-white",
                compact
                  ? "min-h-[14px] min-w-[14px] -right-1.5 -top-1 px-0.5 text-[9px]"
                  : "-right-1 -top-1 min-h-4 min-w-4 px-0.5 text-[10px]"
              )
            : clsx("h-2 w-2", "-right-0.5 -top-0.5")
        )}
        aria-hidden
      >
        {badge.showNumber ? badge.display : null}
      </span>
    </>
  );
}

function StaffNavLink({ href, label, shortLabel, Icon, active, layout, solicitudesBadge }) {
  const compact = layout === "mobile";
  const ariaLabel = solicitudesBadge != null ? solicitudesNavAriaLabel(solicitudesBadge) : undefined;
  return (
    <Link
      href={href}
      className={clsx(
        "flex items-center font-medium transition-all",
        compact
          ? clsx(
              "min-h-[48px] flex-col justify-center gap-0.5 rounded-lg px-1 py-1 text-[10px]",
              active ? "text-brand" : "text-slate-500"
            )
          : clsx(
              "w-full gap-3 rounded-xl px-3 py-2.5 text-sm",
              active ? "bg-brand/10 text-brand" : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
            )
      )}
      aria-current={active ? "page" : undefined}
      aria-label={ariaLabel}
    >
      <span className="relative shrink-0">
        <Icon size={compact ? 20 : 16} className={active ? "text-brand" : compact ? "text-slate-400" : "text-slate-400"} />
        {solicitudesBadge != null && solicitudesBadge > 0 ? (
          <SolicitudesNavBadgeWithDot count={solicitudesBadge} compact={compact} />
        ) : null}
      </span>
      <span className={compact ? "leading-tight" : "flex-1 text-left"}>{compact ? shortLabel ?? label : label}</span>
      {!compact && active ? <div className="h-1.5 w-1.5 rounded-full bg-brand" /> : null}
    </Link>
  );
}

function useSolicitudesPendientesCount(session, pathname) {
  const canFetch = isRolOperativo(session.rol);
  const [count, setCount] = useState(null);

  const fetchCount = useCallback(async () => {
    if (!canFetch) return;
    try {
      const res = await fetch("/api/solicitudes/pendientes-count");
      if (!res.ok) return;
      const data = await res.json();
      setCount(typeof data.count === "number" ? data.count : 0);
    } catch {
      /* mantener último valor */
    }
  }, [canFetch]);

  useEffect(() => {
    fetchCount();
  }, [fetchCount, pathname, session.sucursalId]);

  useEffect(() => {
    if (!canFetch) return undefined;

    let intervalId;

    function clearPoll() {
      if (intervalId) {
        clearInterval(intervalId);
        intervalId = undefined;
      }
    }

    function startPollIfVisible() {
      clearPoll();
      if (document.visibilityState !== "visible") return;
      intervalId = setInterval(() => {
        if (document.visibilityState === "visible") fetchCount();
      }, SOLICITUDES_POLL_MS);
    }

    function onVisibilityChange() {
      if (document.visibilityState === "visible") {
        fetchCount();
        startPollIfVisible();
      } else {
        clearPoll();
      }
    }

    function onWindowFocus() {
      fetchCount();
    }

    startPollIfVisible();
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("focus", onWindowFocus);
    return () => {
      clearPoll();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("focus", onWindowFocus);
    };
  }, [canFetch, fetchCount]);

  return count;
}

export function StaffShell({ session, sucursal, sucursales = [], children }) {
  const pathname = usePathname();
  const router = useRouter();
  const solicitudesPendientes = useSolicitudesPendientesCount(session, pathname);
  const hideSolicitudesBadge = shouldHideSolicitudesNavBadge(pathname);
  const solicitudesBadgeValue =
    solicitudesPendientes != null && !hideSolicitudesBadge ? solicitudesPendientes : null;
  const items = NAV.filter((n) => n.roles.includes(session.rol));
  const canSwitchSucursal = isRolOperativo(session.rol) && sucursales.length > 1;
  const [switchError, setSwitchError] = useState("");
  const mobileNavCols = items.length <= 4 ? items.length : items.length <= 5 ? 5 : 6;

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

  function isActive(href) {
    return pathname === href || (href === "/admin" && pathname.startsWith("/admin"));
  }

  function navLinkProps(item) {
    const base = { ...item, active: isActive(item.href) };
    if (item.href === "/solicitudes") {
      return { ...base, solicitudesBadge: solicitudesBadgeValue };
    }
    return base;
  }

  const sucursalControl = canSwitchSucursal ? (
    <Select
      className="max-w-full text-sm font-semibold md:max-w-[200px]"
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
  );

  return (
    <div className="flex h-[100dvh] flex-col overflow-hidden bg-slate-100">
      <header className="z-20 flex shrink-0 flex-wrap items-center gap-3 border-b border-slate-200 bg-white px-4 py-3 shadow-sm md:h-16 md:flex-nowrap md:px-6 md:py-0">
        <div className="flex shrink-0 items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand shadow-sm shadow-brand/30">
            <PawPrint size={18} className="text-white" />
          </div>
          <div>
            <p className="text-[15px] font-bold leading-none tracking-tight text-slate-800">Patitas</p>
            <p className="mt-0.5 text-[10px] text-slate-400">Clínica Veterinaria</p>
          </div>
        </div>
        <div className="order-3 w-full min-w-0 md:order-none md:w-auto md:flex-1" />
        <div className="flex min-w-0 flex-1 flex-col items-end gap-0.5 md:flex-none">
          <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Sucursal</p>
          {sucursalControl}
          {switchError ? <p className="text-[10px] text-red-600">{switchError}</p> : null}
        </div>
        <div className="flex items-center gap-2 border-l border-slate-100 pl-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand/15 text-xs font-bold text-brand">
            {initials(session.nombre)}
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate text-sm font-bold leading-none text-slate-700">{session.nombre}</p>
            <p className="mt-0.5 text-[10px] capitalize text-slate-400">{session.rol}</p>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={logout} aria-label="Cerrar sesión">
            <LogOut size={16} />
          </Button>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <aside className="z-10 hidden w-56 shrink-0 flex-col border-r border-slate-100 bg-white shadow-sm md:flex">
          <nav className="flex-1 overflow-y-auto px-3 py-5" aria-label="Menú staff">
            <p className="mb-3 px-3 text-[9px] font-bold uppercase tracking-widest text-slate-400">Menú principal</p>
            <div className="space-y-0.5">
              {items.map((item) => (
                <StaffNavLink key={item.href} {...navLinkProps(item)} layout="sidebar" />
              ))}
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
        <main className="min-w-0 flex-1 overflow-auto p-4 pb-[5.5rem] md:p-6 md:pb-6">{children}</main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_12px_rgba(15,23,42,0.06)] backdrop-blur md:hidden"
        aria-label="Menú staff"
      >
        <div
          className="mx-auto grid w-full max-w-lg gap-0 px-1 py-1"
          style={{ gridTemplateColumns: `repeat(${mobileNavCols}, minmax(0, 1fr))` }}
        >
          {items.map((item) => (
            <StaffNavLink key={item.href} {...navLinkProps(item)} layout="mobile" />
          ))}
        </div>
      </nav>
    </div>
  );
}
