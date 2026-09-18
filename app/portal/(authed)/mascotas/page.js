"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function PortalMascotasPage() {
  const [mascotas, setMascotas] = useState([]);

  useEffect(() => {
    fetch("/api/portal/mascotas")
      .then((r) => r.json())
      .then((d) => setMascotas(d.mascotas || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Mis mascotas</h1>
      <p className="text-sm text-slate-500">Solo lectura — para pedir turnos usá Solicitudes.</p>
      {mascotas.length === 0 ? (
        <p className="text-sm text-slate-500">No hay mascotas registradas.</p>
      ) : (
        mascotas.map((m) => (
          <Card key={m.id}>
            <CardContent className="py-4">
              <p className="font-semibold text-slate-800">{m.nombre}</p>
              <p className="text-sm text-slate-500">
                {m.especie}
                {m.raza ? ` · ${m.raza}` : ""}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
