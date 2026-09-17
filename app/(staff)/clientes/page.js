"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "", dni: "" });
  const [error, setError] = useState("");

  async function load() {
    const res = await fetch("/api/clientes");
    setClientes((await res.json()).clientes || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/clientes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al crear cliente");
      return;
    }
    setForm({ nombre: "", telefono: "", email: "", dni: "" });
    load();
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar cliente</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <Input placeholder="Nombre *" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <Input placeholder="Teléfono *" required value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} />
            <Input placeholder="Email *" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            <Input placeholder="DNI (opcional)" value={form.dni} onChange={(e) => setForm({ ...form, dni: e.target.value })} />
            <Button type="submit" className="md:col-span-2">
              Registrar cliente
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="divide-y divide-slate-50 p-0">
        {clientes.map((c) => (
          <div key={c.id} className="px-5 py-4">
            <p className="font-semibold text-slate-800">{c.nombre}</p>
            <p className="text-sm text-slate-500">
              {c.telefono} · {c.email}
              {c.dni ? ` · DNI ${c.dni}` : ""}
            </p>
          </div>
        ))}
      </Card>
    </div>
  );
}
