"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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
        <div className="h-1.5 w-full bg-brand" />
        <CardContent className="pt-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand shadow-sm">
              <PawPrint size={22} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">Portal de clientes</p>
              <p className="text-sm text-slate-500">Patitas</p>
            </div>
          </div>
          <div className="mb-4 flex gap-2">
            <Button type="button" variant={tab === "login" ? "default" : "outline"} size="sm" onClick={() => setTab("login")}>
              Ingresar
            </Button>
            <Button type="button" variant={tab === "activar" ? "default" : "outline"} size="sm" onClick={() => setTab("activar")}>
              Activar cuenta
            </Button>
          </div>
          {error ? <p className="mb-3 text-sm text-red-600">{error}</p> : null}
          {message ? <p className="mb-3 text-sm text-emerald-700">{message}</p> : null}
          {tab === "login" ? (
            <form onSubmit={onLogin} className="space-y-4">
              <label className="block text-sm font-medium text-slate-700">
                Email
                <Input className="mt-1.5" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" />
              </label>
              <label className="block text-sm font-medium text-slate-700">
                Contraseña
                <Input type="password" className="mt-1.5" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" />
              </label>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Ingresando…" : "Ingresar al portal"}
              </Button>
            </form>
          ) : (
            <form onSubmit={onActivacion} className="space-y-4">
              <p className="text-sm text-slate-500">
                Si su email está registrado en la clínica, recibirá un enlace para elegir su contraseña.
              </p>
              <label className="block text-sm font-medium text-slate-700">
                Email
                <Input className="mt-1.5" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </label>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Enviando…" : "Enviar link de activación"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
