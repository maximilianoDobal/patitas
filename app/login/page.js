"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("recepcion@patitas.local");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/auth/login", {
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
    router.push("/agenda");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <div className="h-1.5 w-full bg-brand" />
        <CardContent className="pt-6">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand shadow-sm shadow-brand/30">
              <PawPrint size={22} className="text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-slate-800">Clínica Veterinaria Patitas</p>
              <p className="text-sm text-slate-500">Ingreso staff</p>
            </div>
          </div>
          {error ? <p className="mb-4 text-sm text-red-600">{error}</p> : null}
          <form onSubmit={onSubmit} className="space-y-4">
            <label className="block text-sm font-medium text-slate-700">
              Email
              <Input
                className="mt-1.5"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </label>
            <label className="block text-sm font-medium text-slate-700">
              Contraseña
              <Input
                type="password"
                className="mt-1.5"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </label>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Ingresando…" : "Ingresar"}
            </Button>
          </form>
          <p className="mt-4 text-xs text-slate-400">
            Demo: recepcion@patitas.local / recep123 — admin@patitas.local / admin123 — garcia@patitas.local / vet123
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
