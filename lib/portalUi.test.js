import { describe, expect, it } from "vitest";
import { portalError, portalLabel, portalPageTitle } from "./portalUi.js";

describe("portalUi", () => {
  it("expone clases tipográficas no vacías", () => {
    expect(portalPageTitle).toMatch(/text-/);
    expect(portalLabel).toMatch(/text-base/);
    expect(portalError).toMatch(/red/);
  });
});
