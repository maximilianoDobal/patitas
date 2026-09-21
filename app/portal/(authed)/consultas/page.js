"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { portalCardMeta, portalCardText, portalLead, portalPageTitle } from "@/lib/portalUi";

export default function PortalConsultasPage() {
  const [consultas, setConsultas] = useState([]);

  useEffect(() => {
    fetch("/api/portal/consultas")
      .then((r) => r.json())
      .then((d) => setConsultas(d.consultas || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className={portalPageTitle}>Historial de consultas</h1>
      <p className={portalLead}>Solo título y tipo de servicio (sin datos clínicos).</p>
      {consultas.length === 0 ? (
        <p className={portalLead}>Sin consultas registradas.</p>
      ) : (
        consultas.map((c, i) => (
          <Card key={`${c.fecha}-${i}`}>
            <CardContent className="py-5">
              <p className={`font-semibold ${portalCardText}`}>{c.titulo || "Consulta"}</p>
              <p className={portalCardMeta}>
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
