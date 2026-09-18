"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

export default function PortalConsultasPage() {
  const [consultas, setConsultas] = useState([]);

  useEffect(() => {
    fetch("/api/portal/consultas")
      .then((r) => r.json())
      .then((d) => setConsultas(d.consultas || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-800">Historial de consultas</h1>
      <p className="text-sm text-slate-500">Solo título y tipo de servicio (sin datos clínicos).</p>
      {consultas.length === 0 ? (
        <p className="text-sm text-slate-500">Sin consultas registradas.</p>
      ) : (
        consultas.map((c, i) => (
          <Card key={`${c.fecha}-${i}`}>
            <CardContent className="py-4">
              <p className="font-semibold text-slate-800">{c.titulo || "Consulta"}</p>
              <p className="text-sm text-slate-500">
                {c.mascotaNombre} · {c.tipoServicioNombre}
                {c.fecha ? ` · ${c.fecha}` : ""}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
