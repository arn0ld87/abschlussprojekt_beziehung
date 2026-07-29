import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { DateiPort } from "../../domain/foto/datei-port";

export class LokalerDateiAdapter implements DateiPort {
  private baseDir: string;

  constructor(baseDir?: string) {
    this.baseDir = baseDir || process.env.UPLOAD_DIR || "./uploads";
  }

  private async ensureDir() {
    await fs.mkdir(this.baseDir, { recursive: true });
  }

  async speichere(schuelerId: string, datei: File): Promise<string> {
    await this.ensureDir();

    const extension = datei.name.split(".").pop() || "bin";
    const sichererName = `${randomUUID()}.${extension}`;
    const pfad = path.join(this.baseDir, sichererName);

    const arrayBuffer = await datei.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    await fs.writeFile(pfad, buffer);

    return sichererName;
  }

  async loesche(pfad: string): Promise<void> {
    const vollerPfad = path.join(this.baseDir, pfad);
    try {
      await fs.unlink(vollerPfad);
    } catch (err: unknown) {
      if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
        throw err;
      }
    }
  }

  async lese(pfad: string): Promise<Buffer | null> {
    const vollerPfad = path.join(this.baseDir, pfad);
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
