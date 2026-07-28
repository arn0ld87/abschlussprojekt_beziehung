import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const content = readFileSync(resolve(process.cwd(), "next-env.d.ts"), "utf8");

describe("next-env.d.ts contract (Next.js 16 upgrade)", () => {
  it("keeps the standard next and next/image-types triple-slash references", () => {
    expect(content).toContain('/// <reference types="next" />');
    expect(content).toContain('/// <reference types="next/image-types/global" />');
  });

  it("imports the generated dev-mode route types introduced by the Next.js 16 upgrade", () => {
    expect(content).toContain('import "./.next/types/routes.d.ts";');
  });

  it("keeps the do-not-edit warning without the earlier trailing period", () => {
    expect(content).toContain("// NOTE: This file should not be edited");
    expect(content).not.toContain("This file should not be edited.");
  });

  it("still links to the current Next.js TypeScript config documentation", () => {
    expect(content).toContain(
      "https://nextjs.org/docs/app/api-reference/config/typescript",
    );
  });

  it("places the routes import after the reference directives", () => {
    const referenceIndex = content.indexOf('/// <reference types="next/image-types/global" />');
    const importIndex = content.indexOf('import "./.next/types/routes.d.ts";');
    expect(referenceIndex).toBeGreaterThanOrEqual(0);
    expect(importIndex).toBeGreaterThan(referenceIndex);
  });
});
