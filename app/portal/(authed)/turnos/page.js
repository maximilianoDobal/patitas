"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { TIPOS_SERVICIO } from "@/lib/constants";
import { portalCardMeta, portalCardText, portalLead, portalPageTitle } from "@/lib/portalUi";

function tipoNombre(id) {
  return TIPOS_SERVICIO.find((t) => t.id === id)?.nombre ?? id;
}

export default function PortalTurnosPage() {
  const [turnos, setTurnos] = useState([]);

  useEffect(() => {
    fetch("/api/portal/turnos")
      .then((r) => r.json())
      .then((d) => setTurnos(d.turnos || []));
  }, []);

  return (
    <div className="space-y-4">
      <h1 className={portalPageTitle}>Próximos turnos</h1>
      {turnos.length === 0 ? (
        <p className={portalLead}>No tenés turnos confirmados próximos.</p>
      ) : (
        turnos.map((t) => (
          <Card key={t.id}>
            <CardContent className="py-5">
              <p className={`font-semibold ${portalCardText}`}>
                {t.mascotaNombre} — {tipoNombre(t.tipoServicioId)}
              </p>
              <p className={portalCardMeta}>
                {t.fecha} {t.horaInicio} · {t.sucursalCodigo} · {t.estado}
              </p>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
