import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { z } from "zod";

const scryptAsync = promisify(scrypt);

export const PasswordSchema = z
  .string()
  .min(8, "Passwort muss mindestens 8 Zeichen lang sein")
  .max(128, "Passwort darf höchstens 128 Zeichen lang sein");

export type Password = z.infer<typeof PasswordSchema>;

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const hash = ((await scryptAsync(password, salt, 64)) as Buffer).toString("hex");
  return `${salt}:${hash}`;
}

export async function verifyPassword(
  password: string,
  combined: string,
): Promise<boolean> {
  const parts = combined.split(":");
  if (parts.length !== 2) return false;
  const [salt, hash] = parts;
  const derivedHashBuf = (await scryptAsync(password, salt, 64)) as Buffer;
  const originalHashBuf = Buffer.from(hash, "hex");
  if (derivedHashBuf.length !== originalHashBuf.length) return false;
  return timingSafeEqual(derivedHashBuf, originalHashBuf);
}
