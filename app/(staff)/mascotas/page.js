"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";

export default function MascotasPage() {
  const [clientes, setClientes] = useState([]);
  const [mascotas, setMascotas] = useState([]);
  const [form, setForm] = useState({ clienteId: "", nombre: "", especie: "Canino", raza: "", sexo: "" });
  const [error, setError] = useState("");

  async function load() {
    const [cRes, mRes] = await Promise.all([fetch("/api/clientes"), fetch("/api/mascotas")]);
    setClientes((await cRes.json()).clientes || []);
    setMascotas((await mRes.json()).mascotas || []);
  }

  useEffect(() => {
    load();
  }, []);

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/mascotas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error al registrar mascota");
      return;
    }
    setForm({ clienteId: "", nombre: "", especie: "Canino", raza: "", sexo: "" });
    load();
  }

  const clientesById = Object.fromEntries(clientes.map((c) => [c.id, c]));

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">Mascotas</h2>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Registrar mascota</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="grid gap-3 md:grid-cols-2">
            <Select required value={form.clienteId} onChange={(e) => setForm({ ...form, clienteId: e.target.value })}>
              <option value="">Cliente</option>
              {clientes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>
            <Input placeholder="Nombre mascota *" required value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
            <Input placeholder="Raza" value={form.raza} onChange={(e) => setForm({ ...form, raza: e.target.value })} />
            <Button type="submit" className="md:col-span-2">
              Registrar mascota (crea historia clínica)
            </Button>
          </form>
        </CardContent>
      </Card>
      <Card className="divide-y divide-slate-50 p-0">
        {mascotas.map((m) => (
          <div key={m.id} className="px-5 py-4">
            <p className="font-semibold text-slate-800">{m.nombre}</p>
            <p className="text-sm text-slate-500">
              Titular: {clientesById[m.clienteId]?.nombre ?? m.clienteId} · {m.especie} {m.raza}
            </p>
          </div>
        ))}
      </Card>
    </div>
  );
}
