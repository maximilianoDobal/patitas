"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { portalCardMeta, portalCardText, portalLead, portalPageTitle } from "@/lib/portalUi";

export default function PortalMascotasPage() {
  const [mascotas, setMascotas] = useState([]);

  useEffect(() => {
    fetch("/api/portal/mascotas")
      .then((r) => r.json())
      .then((d) => setMascotas(d.mascotas || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className={portalPageTitle}>Mis mascotas</h1>
      <p className={portalLead}>Solo lectura — para pedir turnos usá Solicitudes.</p>
      {mascotas.length === 0 ? (
        <p className={portalLead}>No hay mascotas registradas.</p>
      ) : (
        mascotas.map((m) => (
          <Card key={m.id}>
            <CardContent className="py-5">
              <p className={`font-semibold ${portalCardText}`}>{m.nombre}</p>
              <p className={portalCardMeta}>
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
