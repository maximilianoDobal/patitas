import { portalLead, portalPageTitle } from "@/lib/portalUi";

export default function PortalInicioPage() {
  return (
    <div className="space-y-3">
      <h1 className={portalPageTitle}>Bienvenido al portal</h1>
      <p className={portalLead}>
        Desde aquí podés ver tus mascotas, solicitar turnos y consultar próximas citas confirmadas.
      </p>
    </div>
  );
}
