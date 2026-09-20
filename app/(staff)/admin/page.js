"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Select } from "@/components/ui/input";
import { AdminHorariosPanel } from "@/components/AdminHorariosPanel";
import { TIPOS_SERVICIO } from "@/lib/constants";

export default function AdminConfigPage() {
  const [tab, setTab] = useState("usuarios");
  const [usuarios, setUsuarios] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [salas, setSalas] = useState([]);
  const [matrices, setMatrices] = useState({ veterinarioTiposServicio: [], salaTiposServicio: [] });
  const [sucursalSalas, setSucursalSalas] = useState("");
  const [error, setError] = useState("");
  const [staffForm, setStaffForm] = useState({
    nombre: "",
    email: "",
    password: "",
    telefono: "",
    rol: "recepcionista",
    sucursalId: "",
    matricula: "",
  });
  const [sucursalForm, setSucursalForm] = useState({
    codigoInterno: "",
    nombreComercial: "",
    direccion: "",
    localidad: "",
  });

  async function loadUsuarios() {
    const res = await fetch("/api/admin/usuarios");
    setUsuarios((await res.json()).usuarios || []);
  }

  async function loadSucursales() {
    const res = await fetch("/api/admin/sucursales");
    const sucs = (await res.json()).sucursales || [];
    setSucursales(sucs);
    if (!sucursalSalas && sucs[0]) setSucursalSalas(sucs[0].id);
    if (!staffForm.sucursalId && sucs[0]) setStaffForm((f) => ({ ...f, sucursalId: sucs[0].id }));
  }

  async function loadSalas(sid) {
    if (!sid) return;
    const res = await fetch(`/api/admin/salas?sucursalId=${encodeURIComponent(sid)}`);
    setSalas((await res.json()).salas || []);
  }

  async function loadMatrices() {
    const res = await fetch("/api/admin/matrices");
    setMatrices(await res.json());
  }

  useEffect(() => {
    loadUsuarios();
    loadSucursales();
    loadMatrices();
  }, []);

  useEffect(() => {
    loadSalas(sucursalSalas);
  }, [sucursalSalas]);

  async function crearStaff(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(staffForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error");
      return;
    }
    setStaffForm({ nombre: "", email: "", password: "", telefono: "", rol: "recepcionista", sucursalId: staffForm.sucursalId, matricula: "" });
    loadUsuarios();
  }

  async function toggleActivo(u) {
    await fetch(`/api/admin/usuarios/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ activo: !u.activo }),
    });
    loadUsuarios();
  }

  async function crearSucursal(e) {
    e.preventDefault();
    setError("");
    const res = await fetch("/api/admin/sucursales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(sucursalForm),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Error");
      return;
    }
    setSucursalForm({ codigoInterno: "", nombreComercial: "", direccion: "", localidad: "" });
    loadSucursales();
  }

  async function crearSala(e) {
    e.preventDefault();
    const nombre = e.target.salaNombre.value;
    const res = await fetch("/api/admin/salas", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sucursalId: sucursalSalas, nombre }),
    });
    if (!res.ok) {
      const data = await res.json();
      setError(data.error || "Error");
      return;
    }
    e.target.reset();
    loadSalas(sucursalSalas);
    loadMatrices();
  }

  function tiposDeVet(vetId) {
    return matrices.veterinarioTiposServicio.filter((v) => v.veterinarioId === vetId).map((v) => v.tipoServicioId);
  }

  function tiposDeSala(salaId) {
    return matrices.salaTiposServicio.filter((s) => s.salaId === salaId).map((s) => s.tipoServicioId);
  }

  async function guardarTiposVet(vetId, ids) {
    await fetch("/api/admin/matrices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ veterinarioId: vetId, tipoServicioIds: ids }),
    });
    loadMatrices();
  }

  async function guardarTiposSala(salaId, ids) {
    await fetch("/api/admin/matrices", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ salaId, tipoServicioIds: ids }),
    });
    loadMatrices();
  }

  const vets = usuarios.filter((u) => u.rol === "veterinario");

  return (
    <div className="mx-auto max-w-4xl space-y-4">
      <h2 className="text-2xl font-bold text-slate-800">Administración</h2>
      <div className="flex flex-wrap gap-2">
        {["usuarios", "sucursales", "horarios", "salas", "matrices"].map((t) => (
          <Button key={t} type="button" size="sm" variant={tab === t ? "default" : "outline"} onClick={() => setTab(t)}>
            {t}
          </Button>
        ))}
      </div>
      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      {tab === "usuarios" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nuevo usuario staff</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={crearStaff} className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Nombre" required value={staffForm.nombre} onChange={(e) => setStaffForm({ ...staffForm, nombre: e.target.value })} />
                <Input placeholder="Email" required value={staffForm.email} onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })} />
                <Input placeholder="Contraseña" type="password" required value={staffForm.password} onChange={(e) => setStaffForm({ ...staffForm, password: e.target.value })} />
                <Select value={staffForm.rol} onChange={(e) => setStaffForm({ ...staffForm, rol: e.target.value })}>
                  <option value="recepcionista">Recepcionista</option>
                  <option value="veterinario">Veterinario</option>
                </Select>
                <Select value={staffForm.sucursalId} onChange={(e) => setStaffForm({ ...staffForm, sucursalId: e.target.value })}>
                  {sucursales.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.codigoInterno}
                    </option>
                  ))}
                </Select>
                {staffForm.rol === "veterinario" ? (
                  <Input placeholder="Matrícula" value={staffForm.matricula} onChange={(e) => setStaffForm({ ...staffForm, matricula: e.target.value })} />
                ) : null}
                <Button type="submit" className="md:col-span-2">
                  Crear
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card className="divide-y">
            {usuarios.map((u) => (
              <div key={u.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <div>
                  <p className="font-medium text-slate-800">
                    {u.nombre} · {u.rol}
                  </p>
                  <p className="text-slate-500">
                    {u.email} · {u.activo ? "activo" : "inactivo"}
                  </p>
                </div>
                <Button type="button" size="sm" variant="outline" onClick={() => toggleActivo(u)}>
                  {u.activo ? "Desactivar" : "Activar"}
                </Button>
              </div>
            ))}
          </Card>
        </>
      ) : null}

      {tab === "sucursales" ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Nueva sucursal</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={crearSucursal} className="grid gap-2 md:grid-cols-2">
                <Input placeholder="Código (PAT-XXX)" required value={sucursalForm.codigoInterno} onChange={(e) => setSucursalForm({ ...sucursalForm, codigoInterno: e.target.value })} />
                <Input placeholder="Nombre comercial" required value={sucursalForm.nombreComercial} onChange={(e) => setSucursalForm({ ...sucursalForm, nombreComercial: e.target.value })} />
                <Input placeholder="Dirección" value={sucursalForm.direccion} onChange={(e) => setSucursalForm({ ...sucursalForm, direccion: e.target.value })} />
                <Input placeholder="Localidad" value={sucursalForm.localidad} onChange={(e) => setSucursalForm({ ...sucursalForm, localidad: e.target.value })} />
                <Button type="submit" className="md:col-span-2">
                  Crear sucursal
                </Button>
              </form>
            </CardContent>
          </Card>
          <Card className="divide-y">
            {sucursales.map((s) => (
              <div key={s.id} className="px-4 py-3 text-sm">
                <p className="font-medium text-slate-800">
                  {s.codigoInterno} — {s.nombreComercial}
                </p>
                <p className="text-slate-500">{s.direccion}</p>
              </div>
            ))}
          </Card>
        </>
      ) : null}

      {tab === "horarios" ? <AdminHorariosPanel sucursales={sucursales} /> : null}

      {tab === "salas" ? (
        <>
          <Select value={sucursalSalas} onChange={(e) => setSucursalSalas(e.target.value)}>
            {sucursales.map((s) => (
              <option key={s.id} value={s.id}>
                {s.codigoInterno}
              </option>
            ))}
          </Select>
          <Card>
            <CardContent className="pt-4">
              <form onSubmit={crearSala} className="flex gap-2">
                <Input name="salaNombre" placeholder="Nombre sala" required />
                <Button type="submit">Agregar sala</Button>
              </form>
            </CardContent>
          </Card>
          <ul className="text-sm text-slate-700">
            {salas.map((s) => (
              <li key={s.id} className="border-b py-2">
                {s.nombre}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {tab === "matrices" ? (
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Funciones veterinario</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {vets.map((v) => (
                <div key={v.id}>
                  <p className="font-medium">{v.nombre}</p>
                  {TIPOS_SERVICIO.map((t) => {
                    const checked = tiposDeVet(v.id).includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = tiposDeVet(v.id);
                            const next = e.target.checked ? [...current, t.id] : current.filter((x) => x !== t.id);
                            guardarTiposVet(v.id, next);
                          }}
                        />
                        {t.nombre}
                      </label>
                    );
                  })}
                </div>
              ))}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Sala / tipo servicio</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {salas.map((s) => (
                <div key={s.id}>
                  <p className="font-medium">{s.nombre}</p>
                  {TIPOS_SERVICIO.map((t) => {
                    const checked = tiposDeSala(s.id).includes(t.id);
                    return (
                      <label key={t.id} className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => {
                            const current = tiposDeSala(s.id);
                            const next = e.target.checked ? [...current, t.id] : current.filter((x) => x !== t.id);
                            guardarTiposSala(s.id, next);
                          }}
                        />
                        {t.nombre}
                      </label>
                    );
                  })}
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
