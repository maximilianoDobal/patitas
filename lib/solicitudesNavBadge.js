/** @param {number} count */
export function formatSolicitudesBadgeCount(count) {
  if (count <= 0) return null;
  if (count === 1) return { showNumber: false, display: null };
  if (count >= 10) return { showNumber: true, display: "9+" };
  return { showNumber: true, display: String(count) };
}

/** @param {string} pathname */
export function shouldHideSolicitudesNavBadge(pathname) {
  return pathname === "/solicitudes";
}

/** @param {number} count */
export function solicitudesNavAriaLabel(count) {
  if (count <= 0) return "Solicitudes";
  if (count === 1) return "Solicitudes, 1 pendiente";
  if (count >= 10) return "Solicitudes, 9 o más pendientes";
  return `Solicitudes, ${count} pendientes`;
}
