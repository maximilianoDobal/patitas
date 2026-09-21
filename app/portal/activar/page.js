"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { portalError, portalLabel, portalPageTitle } from "@/lib/portalUi";

function ActivarForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/activacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo activar la cuenta");
      return;
    }
    router.push("/portal/ingreso");
    router.refresh();
  }

  if (!token) {
    return <p className={portalError}>Enlace inválido. Solicite uno nuevo desde el ingreso al portal.</p>;
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {error ? <p className={portalError}>{error}</p> : null}
      <label className={portalLabel}>
        Nueva contraseña
        <Input surface="portal" type="password" className="mt-2" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required />
      </label>
      <label className={portalLabel}>
        Confirmar contraseña
        <Input surface="portal" type="password" className="mt-2" value={confirm} onChange={(e) => setConfirm(e.target.value)} minLength={6} required />
      </label>
      <Button type="submit" size="portal" disabled={loading} className="w-full">
        {loading ? "Guardando…" : "Activar portal"}
      </Button>
    </form>
  );
}

export default function PortalActivarPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md">
        <CardContent className="pt-8">
          <h1 className={`mb-6 ${portalPageTitle}`}>Activar cuenta portal</h1>
          <Suspense fallback={<p className="text-base text-slate-600">Cargando…</p>}>
            <ActivarForm />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
