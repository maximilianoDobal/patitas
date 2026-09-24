export {
  verifyStaffCredentials,
  listTurnos,
  getTurnoById,
  createTurno,
  updateTurno,
  listClientes,
  createCliente,
  listMascotas,
  createMascota,
  listConsultasByMascota,
  upsertConsultaForTurno,
  getCatalog,
  switchSucursalActiva,
} from "@/lib/repos/postgresStore";

export {
  solicitarActivacionPortal,
  solicitarActivacionPortalPorClienteId,
  crearYEnviarTokenActivacion,
  consumirTokenActivacion,
  verifyClienteCredentials,
  clienteTienePortalActivado,
  GENERIC_OK,
} from "@/lib/repos/activacion";

export {
  listMascotasForCliente,
  listProximosTurnosCliente,
  listConsultasPortalCliente,
  listSolicitudesCliente,
  createSolicitudTurno,
  listSucursalesPortal,
} from "@/lib/repos/portal";

export {
  listSolicitudesPendientes,
  countSolicitudesPendientes,
  proponerAsignacionSolicitud,
  confirmarSolicitud,
  rechazarSolicitud,
  cancelarSolicitud,
} from "@/lib/repos/solicitudes";

export {
  listStaffUsuarios,
  createStaffUsuario,
  updateStaffUsuario,
  listSucursalesAdmin,
  createSucursal,
  updateSucursal,
  listSalasAdmin,
  createSala,
  updateSala,
  setVeterinarioTipos,
  setSalaTipos,
  getMatricesAdmin,
} from "@/lib/repos/adminConfig";
