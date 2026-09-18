"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export default function ClientesPage() {
  const [clientes, setClientes] = useState([]);
  const [sucursalCodigo, setSucursalCodigo] = useState({});
  const [busqueda, setBusqueda] = useState("");
  const [form, setForm] = useState({ nombre: "", telefono: "", email: "", dni: "" });
  const [error, setError] = useState("");
  const [activMsg, setActivMsg] = useState("");

  async function load(q) {
    const qs = q?.trim() ? `?q=${encodeURIComponent(q.trim())}` : "";
    const res = await fetch(`/api/clientes${qs}`);
    setClientes((await res.json()).clientes || []);
  }

  useEffect(() => {
    fetch("/api/catalog")
      .then((r) => r.json())
      .then((cat) => {
        const map = {};
        (cat.sucursales || []).forEach((s) => {
          map[s.id] = s.codigoInterno;
        });
        setSucursalCodigo(map);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const t = setTimeout(() => load(busqueda), 200);
    return () => clearTimeout(t);
  }, [busqueda]);

  async function enviarActivacion(clienteId) {
    setActivMsg("");
    setError("");
    const res = await fetch(`/api/clientes/${clienteId}/activacion`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "No se pudo enviar activación");
      return;
    }
    setActivMsg(data.message || "Activación enviada.");
  }

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
    load(busqueda);
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">Clientes</h2>
      <Input
        placeholder="Buscar por nombre, email o DNI…"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        aria-label="Buscar clientes"
      />
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      {activMsg ? <p className="text-sm text-emerald-700">{activMsg}</p> : null}
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
          <div key={c.id} className="flex flex-wrap items-start justify-between gap-2 px-5 py-4">
            <div>
              <p className="font-semibold text-slate-800">{c.nombre}</p>
              <p className="text-sm text-slate-500">
                {c.telefono} · {c.email}
                {c.dni ? ` · DNI ${c.dni}` : ""}
                {c.sucursalPrimeraAltaId
                  ? ` · Alta ${sucursalCodigo[c.sucursalPrimeraAltaId] ?? "sucursal"}`
                  : ""}
              </p>
            </div>
            <Button type="button" size="sm" variant="outline" onClick={() => enviarActivacion(c.id)}>
              Activar portal
            </Button>
          </div>
        ))}
      </Card>
    </div>
  );
}
