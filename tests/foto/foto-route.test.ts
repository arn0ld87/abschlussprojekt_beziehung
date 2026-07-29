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

    const file = new File(["fake image content"], "avatar.png", { type: "image/png" });
    const formData = new FormData();
    formData.append("foto", file);

    const postRes = await POST(req("POST", formData), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(postRes.status).toBe(201);
    const postData = await postRes.json();
    expect(postData.schuelerId).toBe(s.id);
    expect(postData.mimeType).toBe("image/png");

    const getRes = await GET(req("GET"), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(getRes.status).toBe(200);
    expect(getRes.headers.get("Content-Type")).toBe("image/png");
    expect(getRes.headers.get("ETag")).toBeTruthy();
  });

  it("DELETE /foto removes photo", async () => {
    await setSession(mockUser);
    const k = await klassenService.create("u1", { name: "9a" });
    const s = await schuelerService.create("u1", k.id, { name: "Max" });

    const file = new File(["img"], "img.jpg", { type: "image/jpeg" });
    await fotoService.uploadFoto(s.id, file);

    const delRes = await DELETE(req("DELETE"), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(delRes.status).toBe(204);

    const getRes = await GET(req("GET"), { params: Promise.resolve({ id: k.id, sid: s.id }) });
    expect(getRes.status).toBe(404);
  });
});
