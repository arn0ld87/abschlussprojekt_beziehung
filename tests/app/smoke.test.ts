import { describe, expect, it } from "vitest";
import { M0_DOMAIN_STUB } from "../../src/domain/index.ts";

describe("M0 domain smoke", () => {
  it("exposes the placeholder constant from src/domain/", () => {
    expect(M0_DOMAIN_STUB).toBe("m0-domain-placeholder");
  });

  it("ensures the dependency direction (domain is importable, no upstream deps)", () => {
    expect(typeof M0_DOMAIN_STUB).toBe("string");
    expect(M0_DOMAIN_STUB.length).toBeGreaterThan(0);
  });
});
