"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { portalError, portalLabel, portalLead, portalSuccess } from "@/lib/portalUi";

export default function PortalIngresoPage() {
  const router = useRouter();
  const [tab, setTab] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onLogin(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login-portal", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setLoading(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error de login");
      return;
    }
    router.push("/portal/inicio");
    router.refresh();
  }

  async function onActivacion(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    const res = await fetch("/api/auth/activacion", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    setLoading(false);
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al solicitar activación");
      return;
    }
    setMessage(data.message || "Revise su correo.");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="h-2 w-full bg-brand" />
        <CardContent className="pt-8">
          <div className="mb-8 flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-brand shadow-sm">
              <PawPrint size={28} className="text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">Portal de clientes</p>
              <p className={portalLead}>Patitas</p>
            </div>
          </div>
          <div className="mb-6 flex flex-col gap-3 sm:flex-row">
            <Button type="button" variant={tab === "login" ? "default" : "outline"} size="portal" className="flex-1" onClick={() => setTab("login")}>
              Ingresar
            </Button>
            <Button type="button" variant={tab === "activar" ? "default" : "outline"} size="portal" className="flex-1" onClick={() => setTab("activar")}>
              Activar cuenta
            </Button>
          </div>
          {error ? <p className={`mb-4 ${portalError}`}>{error}</p> : null}
          {message ? <p className={`mb-4 ${portalSuccess}`}>{message}</p> : null}
          {tab === "login" ? (
            <form onSubmit={onLogin} className="space-y-5">
              <label className={portalLabel}>
                Email
                <Input surface="portal" className="mt-2" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </label>
              <label className={portalLabel}>
                Contraseña
                <Input surface="portal" type="password" className="mt-2" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </label>
              <Button type="submit" size="portal" disabled={loading} className="w-full">
                {loading ? "Ingresando…" : "Ingresar al portal"}
              </Button>
            </form>
          ) : (
            <form onSubmit={onActivacion} className="space-y-5">
              <p className={portalLead}>Si su email está registrado en la clínica, recibirá un enlace para elegir su contraseña.</p>
              <label className={portalLabel}>
                Email
                <Input surface="portal" className="mt-2" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <Button type="submit" size="portal" disabled={loading} className="w-full">
                {loading ? "Enviando…" : "Enviar link de activación"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
