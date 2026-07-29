import { describe, it, expect, afterEach } from "vitest";
import { getDefaultFotoService, setGlobalFotoService } from "../../src/services/foto";

describe("Foto service factory", () => {
  afterEach(() => {
    // Reset auf Default, damit andere Tests eine frische Instanz bekommen.
    setGlobalFotoService(null);
  });

  it("setGlobalFotoService(null) resets the singleton and getDefaultFotoService returns a new instance", () => {
    const erste = getDefaultFotoService();
    setGlobalFotoService(null);
    const zweite = getDefaultFotoService();

    expect(zweite).not.toBe(erste);
  });
});