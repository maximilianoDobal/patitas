import { describe, expect, it } from "vitest";
import {
  formatSolicitudesBadgeCount,
  shouldHideSolicitudesNavBadge,
  solicitudesNavAriaLabel,
} from "./solicitudesNavBadge.js";

describe("formatSolicitudesBadgeCount", () => {
  it("sin pendientes no muestra badge", () => {
    expect(formatSolicitudesBadgeCount(0)).toBeNull();
  });

  it("una pendiente: solo punto", () => {
    expect(formatSolicitudesBadgeCount(1)).toEqual({ showNumber: false, display: null });
  });

  it("2–9: punto y número exacto", () => {
    expect(formatSolicitudesBadgeCount(2)).toEqual({ showNumber: true, display: "2" });
    expect(formatSolicitudesBadgeCount(9)).toEqual({ showNumber: true, display: "9" });
  });

  it("10 o más: tope 9+", () => {
    expect(formatSolicitudesBadgeCount(10)).toEqual({ showNumber: true, display: "9+" });
    expect(formatSolicitudesBadgeCount(99)).toEqual({ showNumber: true, display: "9+" });
  });
});

describe("shouldHideSolicitudesNavBadge", () => {
  it("oculta en la bandeja de solicitudes", () => {
    expect(shouldHideSolicitudesNavBadge("/solicitudes")).toBe(true);
  });

  it("muestra en otras rutas staff", () => {
    expect(shouldHideSolicitudesNavBadge("/agenda")).toBe(false);
    expect(shouldHideSolicitudesNavBadge("/clientes")).toBe(false);
  });
});

describe("solicitudesNavAriaLabel", () => {
  it("sin pendientes", () => {
    expect(solicitudesNavAriaLabel(0)).toBe("Solicitudes");
  });

  it("una pendiente", () => {
    expect(solicitudesNavAriaLabel(1)).toBe("Solicitudes, 1 pendiente");
  });

  it("varias pendientes", () => {
    expect(solicitudesNavAriaLabel(3)).toBe("Solicitudes, 3 pendientes");
  });

  it("tope accesible alineado con 9+", () => {
    expect(solicitudesNavAriaLabel(10)).toBe("Solicitudes, 9 o más pendientes");
  });
});
