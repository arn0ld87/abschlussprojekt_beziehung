import { describe, it, expect, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST, DELETE } from "../../app/api/klassen/[id]/schueler/[sid]/foto/route";
import { setGlobalFotoService } from "../../src/services/foto";
import { setGlobalSchuelerService } from "../../src/services/schueler";
import { setGlobalKlassenService } from "../../src/services/klasse";
import { setGlobalAuthService } from "../../src/services/auth";
import { AuthService } from "../../src/services/auth/auth-service";
import { InMemoryAuthRepository } from "../../src/infrastructure/auth/in-memory-repository";
import { KlassenService } from "../../src/domain/klasse";
import { InMemoryKlassenRepository } from "../../src/infrastructure/db/in-memory-klassen-repository";
import { SchuelerService } from "../../src/domain/schueler";
import { InMemorySchuelerRepository } from "../../src/infrastructure/db/in-memory-schueler-repository";
import { FotoService } from "../../src/domain/foto/foto-service";
import { Foto } from "../../src/domain/foto/foto-model";
import { FotoRepositoryPort } from "../../src/domain/foto/foto-repository-port";
import { DateiPort } from "../../src/domain/foto/datei-port";
import { User } from "../../src/domain/auth";

class InMemoryFotoRepo implements FotoRepositoryPort {
  private store = new Map<string, Foto>();
  async findBySchuelerId(sid: string): Promise<Foto | null> {
    return this.store.get(sid) || null;
  }
  async create(foto: Foto): Promise<Foto> {
    this.store.set(foto.schuelerId, foto);
    return foto;
  }
  async updateBySchuelerId(sid: string, aenderungen: { internerDateiname: string; mimeType: string; byteSize: number; updatedAt: Date }): Promise<Foto> {
    const existing = this.store.get(sid);
    if (!existing) {
      throw new Error(`Kein Foto-Eintrag fuer schuelerId ${sid} zum Update gefunden.`);
    }
    const updated: Foto = {
      ...existing,
      internerDateiname: aenderungen.internerDateiname,
      mimeType: aenderungen.mimeType as Foto["mimeType"],
      byteSize: aenderungen.byteSize,
      updatedAt: aenderungen.updatedAt,
    };
    this.store.set(sid, updated);
    return updated;
  }
  async deleteBySchuelerId(sid: string): Promise<void> {
    this.store.delete(sid);
  }
}

class InMemoryDateiPort implements DateiPort {
  private store = new Map<string, Buffer>();
  async speichere(sid: string, file: File): Promise<string> {
    const pfad = `uploads/${sid}-${file.name}`;
    const arrayBuffer = await file.arrayBuffer();
    this.store.set(pfad, Buffer.from(arrayBuffer));
    return pfad;
  }
  async loesche(pfad: string): Promise<void> {
    this.store.delete(pfad);
  }
  async lese(pfad: string): Promise<Buffer | null> {
    return this.store.get(pfad) || null;
  }
}

describe("Foto Route Handlers Integration", () => {
  let authRepo: InMemoryAuthRepository;
  let currentSessionToken = "";
  let klassenService: KlassenService;
  let schuelerService: SchuelerService;
  let fotoService: FotoService;

  beforeEach(async () => {
    currentSessionToken = "";

    klassenService = new KlassenService(new InMemoryKlassenRepository());
    setGlobalKlassenService(klassenService);

    schuelerService = new SchuelerService(new InMemorySchuelerRepository(), klassenService);
    setGlobalSchuelerService(schuelerService);

    fotoService = new FotoService(new InMemoryFotoRepo(), new InMemoryDateiPort());
    setGlobalFotoService(fotoService);

    authRepo = new InMemoryAuthRepository();
    const authService = new AuthService(authRepo);
    setGlobalAuthService(authService);
  });

  const mockUser: User = { id: "u1", email: "test@test.com", createdAt: new Date(), updatedAt: new Date() };

  async function setSession(user: User | null) {
    if (user) {
      await authRepo.createUser({ id: user.id, email: user.email, passwordHash: "hash" });
      const session = await authRepo.createSession({ id: "s1", userId: user.id, expiresAt: new Date(Date.now() + 100000) });
      currentSessionToken = session.id;
    } else {
      currentSessionToken = "";
    }
  }

  function req(method: string, body?: FormData | unknown) {
    const headers = new Headers();
    if (currentSessionToken) {
      headers.set("Cookie", `sitzplan_session=${currentSessionToken}`);
    }
    return new NextRequest("http://localhost/api/klassen/kl1/schueler/s1/foto", {
      method,
      headers,
      body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
    });
  }

  it("GET /foto returns 401 when unauthorized", async () => {
    const res = await GET(req("GET"), { params: Promise.resolve({ id: "kl1", sid: "s1" }) });
    expect(res.status).toBe(401);
  });

  it("GET /foto returns 404 when no photo uploaded", async () => {
    await setSession(mockUser);
    const k = await klassenService.create("u1", { name: "9a" });
    const s = await schuelerService.create("u1", k.id, { name: "Max" });

    const res = await GET(req("GET"), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(res.status).toBe(404);
  });

  it("POST /foto returns 201 and uploads photo, then GET /foto returns image buffer with ETag", async () => {
    await setSession(mockUser);
    const k = await klassenService.create("u1", { name: "9a" });
    const s = await schuelerService.create("u1", k.id, { name: "Max" });

    // Echte PNG-Magic-Bytes fuer die Magic-Byte-Validierung
    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const file = new File([pngBytes], "avatar.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("foto", file);

    const postRes = await POST(req("POST", formData), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.schuelerId).toBe(s.id);
    expect(postData.mimeType).toBe("image/png");
    expect(postData.byteSize).toBe(pngBytes.byteLength);

    const getRes = await GET(req("GET"), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Content-Type")).toBe("image/png");
    expect(getRes.headers.get("ETag")).toBeTruthy();
    expect(getRes.headers.get("Cache-Control")).toContain("private");
    expect(getRes.headers.get("Cache-Control")).toContain("no-store");
    expect(getRes.headers.get("X-Content-Type-Options")).toBe("nosniff");
  });

  it("POST /foto returns 415 for non-allowed MIME types", async () => {
    await setSession(mockUser);
    const k = await klassenService.create("u1", { name: "9a" });
    const s = await schuelerService.create("u1", k.id, { name: "Max" });

    const gifBytes = new Uint8Array([0x47, 0x49, 0x46, 0x38, 0x39, 0x61]);
    const file = new File([gifBytes], "avatar.gif", { type: "image/gif" });
    const formData = new FormData();
    formData.append("foto", file);

    const res = await POST(req("POST", formData), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(res.status).toBe(415);
  });

  it("POST /foto returns 413 when file exceeds 5MB", async () => {
    await setSession(mockUser);
    const k = await klassenService.create("u1", { name: "9a" });
    const s = await schuelerService.create("u1", k.id, { name: "Max" });

    // JPEG-Header + Payload > 5MB
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const payload = new Uint8Array(5 * 1024 * 1024 + 1);
    const big = new Uint8Array(jpegHeader.length + payload.length);
    big.set(jpegHeader, 0);
    big.set(payload, jpegHeader.length);
    const file = new File([big], "big.jpg", { type: "image/jpeg" });
    const formData = new FormData();
    formData.append("foto", file);

    const res = await POST(req("POST", formData), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(res.status).toBe(413);
  });

  it("DELETE /foto removes photo", async () => {
    await setSession(mockUser);
    const k = await klassenService.create("u1", { name: "9a" });
    const s = await schuelerService.create("u1", k.id, { name: "Max" });

    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const file = new File([jpegBytes], "img.jpg", { type: "image/jpeg" });
    await fotoService.uploadFoto(s.id, file);

    const delRes = await DELETE(req("DELETE"), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(delRes.status).toBe(204);

    const getRes = await GET(req("GET"), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(getRes.status).toBe(404);
  });

  it("GET /foto returns 304 when If-None-Match matches ETag", async () => {
    await setSession(mockUser);
    const k = await klassenService.create("u1", { name: "9a" });
    const s = await schuelerService.create("u1", k.id, { name: "Max" });

    const pngBytes = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d]);
    const file = new File([pngBytes], "avatar.png", { type: "image/png" });
    await fotoService.uploadFoto(s.id, file);

    // Erst GET zum ETag holen
    const firstGet = await GET(req("GET"), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    const etag = firstGet.headers.get("ETag");
    expect(etag).toBeTruthy();

    // Zweites GET mit If-None-Match -> 304
    const headers = new Headers();
    if (currentSessionToken) headers.set("Cookie", `sitzplan_session=${currentSessionToken}`);
    headers.set("If-None-Match", etag as string);
    const req2 = new NextRequest("http://localhost/api/klassen/kl1/schueler/s1/foto", {
      method: "GET",
      headers,
    });
    const secondGet = await GET(req2, { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(secondGet.status).toBe(304);
  });
});
