import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DateiPort } from "../../domain/foto/datei-port";

export class LokalerDateiAdapter implements DateiPort {
  private baseDir: string;
  private static readonly ERLAUBTE_EXTENSIONS = ["jpg", "jpeg", "png", "webp", "bin"];

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.UPLOAD_DIR || "./uploads";
  }

  private async ensureDir() {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  private resolveWithinBaseDir(pfad: string): string {
    const base = path.resolve(this.baseDir);
    const resolved = path.resolve(base, pfad);
    if (resolved !== base && !resolved.startsWith(base + path.sep)) {
      throw new Error("Pfad liegt ausserhalb des baseDir.");
    }
    return resolved;
  }

  async speichere(_schuelerId: string, datei: File): Promise<string> {
    await this.ensureDir();

    const rohExtension = (datei.name.split(".").pop() ?? "").toLowerCase().replace(/[/\\]/g, "");
    const extension =
      rohExtension && LokalerDateiAdapter.ERLAUBTE_EXTENSIONS.includes(rohExtension) ? rohExtension : "bin";
    const sichererName = `${randomUUID()}.${extension}`;
    const pfad = this.resolveWithinBaseDir(sichererName);

    const arrayBuffer = await datei.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(pfad, buffer);

    return sichererName;
  }

  async loesche(pfad: string): Promise<void> {
    const vollerPfad = this.resolveWithinBaseDir(pfad);
    try {
      await fs.unlink(vollerPfad);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }

  async lese(pfad: string): Promise<Buffer | null> {
    const vollerPfad = this.resolveWithinBaseDir(pfad);
    try {
      return await fs.readFile(vollerPfad);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code === "ENOENT") {
        return null;
      }
      throw err;
    }
  }
}
