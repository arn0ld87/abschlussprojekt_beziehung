import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { LokalerDateiAdapter } from "../../src/infrastructure/datei/lokaler-datei-adapter";
import {
  matchesMagicBytes,
  isAllowedMimeType,
  MAX_PHOTO_BYTES,
} from "../../src/domain/foto/foto-model";

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
      "../../../../etc/passwd",
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

  it("allows exactly JPEG, PNG, and WebP via the mime allowlist", () => {
    expect(isAllowedMimeType("image/jpeg")).toBe(true);
    expect(isAllowedMimeType("image/png")).toBe(true);
    expect(isAllowedMimeType("image/webp")).toBe(true);
    expect(isAllowedMimeType("image/gif")).toBe(false);
    expect(isAllowedMimeType("image/bmp")).toBe(false);
    expect(isAllowedMimeType("image/tiff")).toBe(false);
    expect(isAllowedMimeType("image/svg+xml")).toBe(false);
    expect(isAllowedMimeType("application/octet-stream")).toBe(false);
    expect(isAllowedMimeType("text/plain")).toBe(false);
  });

  it("matches JPEG/PNG/WebP magic bytes exactly", () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const webp = new Uint8Array([
      0x52, 0x49, 0x46, 0x46, 0x00, 0x00, 0x00, 0x00,
      0x57, 0x45, 0x42, 0x50,
    ]);

    expect(matchesMagicBytes(jpeg, "image/jpeg")).toBe(true);
    expect(matchesMagicBytes(png, "image/png")).toBe(true);
    expect(matchesMagicBytes(webp, "image/webp")).toBe(true);

    // PNG-Header darf NICHT zu JPEG passen.
    expect(matchesMagicBytes(png, "image/jpeg")).toBe(false);
    expect(matchesMagicBytes(jpeg, "image/png")).toBe(false);
    expect(matchesMagicBytes(webp, "image/jpeg")).toBe(false);
  });

  it("MAX_PHOTO_BYTES is exactly 5 MB", () => {
    expect(MAX_PHOTO_BYTES).toBe(5 * 1024 * 1024);
  });

  it("rejects path traversal in lese and loesche", async () => {
    await expect(adapter.lese("../../etc/passwd")).rejects.toThrow();
    await expect(adapter.loesche("../../etc/passwd")).rejects.toThrow();
  });
});
