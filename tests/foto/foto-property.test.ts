import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { LokalerDateiAdapter } from "../../src/infrastructure/datei/lokaler-datei-adapter";

describe("Foto Property Tests", () => {
  let tmpDir: string;
  let adapter: LokalerDateiAdapter;

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), "foto-prop-test-"));
    adapter = new LokalerDateiAdapter(tmpDir);
  });

  afterEach(async () => {
    await fs.rm(tmpDir, { recursive: true, force: true });
  });

  it("always generates a valid UUIDv4-based internal filename without original path components", async () => {
    const dangerousOriginalNames = [
      "../../etc/passwd.png",
      "my_private_photo_12345.jpg",
      "..\\..\\windows\\system32\\cmd.exe.png",
      "user/secret/document.jpeg",
      "test picture with spaces.webp",
      "very-long-name-that-should-not-be-leaked-in-the-storage-path.png",
    ];

    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\./i;

    for (const originalName of dangerousOriginalNames) {
      const file = new File(["fake content"], originalName, { type: "image/png" });
      const sichererName = await adapter.speichere("schueler_123", file);

      // 1. Must start with a valid UUIDv4
      expect(sichererName).toMatch(uuidV4Regex);

      // 2. Must not contain directory traversal characters
      expect(sichererName).not.toContain("/");
      expect(sichererName).not.toContain("\\");
      expect(sichererName).not.toContain("..");

      // 3. Must not contain the unique sensitive parts of the original filename
      const baseOriginal = originalName.split("/").pop()?.split("\\").pop()?.split(".")[0];
      if (baseOriginal && baseOriginal.length > 5) {
        expect(sichererName).not.toContain(baseOriginal);
      }
    }
  });
});
