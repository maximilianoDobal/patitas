import { describe, expect, it } from "vitest";
import { isInRecordatorioWindow, turnoStartMs } from "@/lib/email/turnoEmailTime";

describe("isInRecordatorioWindow", () => {
  it("acepta entre 23 h y 24 h antes", () => {
    const start = turnoStartMs("2026-09-21", "10:00");
    const now = start - 23.5 * 60 * 60 * 1000;
    expect(isInRecordatorioWindow(start, now)).toBe(true);
  });

  it("rechaza fuera de la ventana", () => {
    const start = turnoStartMs("2026-09-21", "10:00");
    const now = start - 22 * 60 * 60 * 1000;
    expect(isInRecordatorioWindow(start, now)).toBe(false);
  });
});
