import { existsSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const root = process.cwd();
const dockerfilePath = resolve(root, "Dockerfile");
const dockerfileText = readFileSync(dockerfilePath, "utf8");

/**
 * Splits the Dockerfile into instruction lines (ignoring comments and blank
 * lines) so stage bases can be asserted structurally instead of by regex.
 */
const instructions = dockerfileText
  .split("\n")
  .map((line) => line.trim())
  .filter((line) => line.length > 0 && !line.startsWith("#"));

const fromImages = instructions
  .filter((line) => line.startsWith("FROM "))
  .map((line) => line.split(/\s+/)[1]!);

function nodeImageMajor(image: string): number | null {
  const name = image.includes("/") ? image.slice(image.lastIndexOf("/") + 1) : image;
  if (!name.startsWith("node:")) return null;
  const majorText = name.slice("node:".length).split(/[.-]/)[0]!;
  const major = Number.parseInt(majorText, 10);
  return Number.isNaN(major) ? null : major;
}

describe("Dockerfile runtime baseline (M0 #31)", () => {
  it("builds every stage on the pinned oven/bun 1.3 image", () => {
    expect(fromImages.length).toBeGreaterThan(0);
    for (const image of fromImages) {
      expect(image).toBe("oven/bun:1.3");
    }
  });

  it("never bases a stage on a Node image below the supported 24 LTS line", () => {
    for (const image of fromImages) {
      const major = nodeImageMajor(image);
      if (major === null) continue;
      expect(major, `stage base ${image} must satisfy the Node >= 24 baseline`).toBeGreaterThanOrEqual(24);
    }
  });

  it("ships a tracked public/ directory so the runner COPY step cannot fail", () => {
    const copyPublic = instructions.some(
      (line) => line.startsWith("COPY ") && line.includes("/app/public"),
    );
    expect(copyPublic, "runner stage is expected to COPY /app/public").toBe(true);
    const publicDir = resolve(root, "public");
    expect(existsSync(publicDir), "public/ must exist in the repository").toBe(true);
    expect(statSync(publicDir).isDirectory()).toBe(true);
  });
});
