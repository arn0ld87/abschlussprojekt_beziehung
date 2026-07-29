import { describe, it, expect, vi, beforeEach } from "vitest";
import { FotoService } from "../../src/domain/foto/foto-service";

describe("FotoService", () => {
  const mockRepo = {
    findBySchuelerId: vi.fn(),
    create: vi.fn(),
    deleteBySchuelerId: vi.fn().mockResolvedValue(undefined),
  };

  const mockDateiPort = {
    speichere: vi.fn(),
    loesche: vi.fn().mockResolvedValue(undefined),
    lese: vi.fn(),
  };

  let service: FotoService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FotoService(mockRepo, mockDateiPort);
  });

  it("should upload a valid photo", async () => {
    // JPEG-Magic-Bytes: FF D8 FF E0
    const jpegBytes = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
    const file = new File([jpegBytes], "test.jpg", { type: "image/jpeg" });
    mockRepo.findBySchuelerId.mockResolvedValue(null);
    mockDateiPort.speichere.mockResolvedValue("fake-internal.jpg");
    mockRepo.create.mockResolvedValue({
      id: "fot_1",
      schuelerId: "schueler_1",
      internerDateiname: "fake-internal.jpg",
      mimeType: "image/jpeg",
      byteSize: jpegBytes.byteLength,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.uploadFoto("schueler_1", file);
    expect(result.id).toBe("fot_1");
    expect(mockDateiPort.speichere).toHaveBeenCalledWith("schueler_1", file);
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it("should reject large files", async () => {
    const jpegHeader = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);
    const payload = new Uint8Array(6 * 1024 * 1024);
    const largeBytes = new Uint8Array(jpegHeader.length + payload.length);
    largeBytes.set(jpegHeader, 0);
    largeBytes.set(payload, jpegHeader.length);
    const largeFile = new File([largeBytes], "test.jpg", { type: "image/jpeg" });
    await expect(service.uploadFoto("schueler_1", largeFile)).rejects.toThrow(/5\s?MB/i);
  });

  it("should reject non-image files", async () => {
    const textFile = new File(["test"], "test.txt", { type: "text/plain" });
    await expect(service.uploadFoto("schueler_1", textFile)).rejects.toThrow(/JPEG|WebP|PNG|erlaubt/i);
  });

  it("should reject unsupported image subtypes like image/gif", async () => {
    const file = new File([new Uint8Array([0x47, 0x49, 0x46])], "test.gif", { type: "image/gif" });
    await expect(service.uploadFoto("schueler_1", file)).rejects.toThrow(/JPEG|WebP|PNG|erlaubt/i);
  });

  it("should reject mismatched magic bytes (defense-in-depth)", async () => {
    // PNG-Header aber mime sagt JPEG.
    const pngHeader = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    const file = new File([pngHeader], "fake.jpg", { type: "image/jpeg" });
    await expect(service.uploadFoto("schueler_1", file)).rejects.toThrow(/Bildformat|Magic|erlaubt/i);
  });

  it("replaces existing photo and compensates on persistence failure", async () => {
    const jpeg1 = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xaa]);
    const jpeg2 = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xbb]);
    const file1 = new File([jpeg1], "first.jpg", { type: "image/jpeg" });
    const file2 = new File([jpeg2], "second.jpg", { type: "image/jpeg" });

    // 1) Erfolgreicher Erst-Upload
    mockRepo.findBySchuelerId.mockResolvedValueOnce(null);
    mockDateiPort.speichere.mockResolvedValueOnce("uuid-1.jpg");
    mockRepo.create.mockResolvedValueOnce({
      id: "fot_1",
      schuelerId: "schueler_1",
      internerDateiname: "uuid-1.jpg",
      mimeType: "image/jpeg",
      byteSize: jpeg1.byteLength,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const first = await service.uploadFoto("schueler_1", file1);
    expect(first.id).toBe("fot_1");

    // 2) Replace-Versuch bei dem die DB-Persistierung scheitert.
    //    Erwartet: neue Datei wird kompensiert (geloescht), keine alte Datei wird
    //    ueberschrieben.
    mockRepo.findBySchuelerId.mockResolvedValueOnce(first);
    mockDateiPort.speichere.mockResolvedValueOnce("uuid-2.jpg");
    mockRepo.create.mockRejectedValueOnce(new Error("db-down"));

    await expect(service.uploadFoto("schueler_1", file2)).rejects.toThrow("db-down");

    // Kompensation: die NEUE Datei muss geloescht worden sein.
    expect(mockDateiPort.loesche).toHaveBeenCalledWith("uuid-2.jpg");
    // Die ALTE Datei darf NICHT geloescht worden sein.
    expect(mockDateiPort.loesche).not.toHaveBeenCalledWith("uuid-1.jpg");
  });

  it("deletes existing file after successful replace", async () => {
    const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xcc]);
    const jpeg2 = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0xdd]);
    const file1 = new File([jpeg], "first.jpg", { type: "image/jpeg" });
    const file2 = new File([jpeg2], "second.jpg", { type: "image/jpeg" });

    mockRepo.findBySchuelerId.mockResolvedValueOnce(null);
    mockDateiPort.speichere.mockResolvedValueOnce("uuid-A.jpg");
    mockRepo.create.mockResolvedValueOnce({
      id: "fot_A",
      schuelerId: "schueler_1",
      internerDateiname: "uuid-A.jpg",
      mimeType: "image/jpeg",
      byteSize: jpeg.byteLength,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    await service.uploadFoto("schueler_1", file1);

    mockRepo.findBySchuelerId.mockResolvedValueOnce({
      id: "fot_A",
      schuelerId: "schueler_1",
      internerDateiname: "uuid-A.jpg",
      mimeType: "image/jpeg",
      byteSize: jpeg.byteLength,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    mockDateiPort.speichere.mockResolvedValueOnce("uuid-B.jpg");
    mockRepo.create.mockResolvedValueOnce({
      id: "fot_B",
      schuelerId: "schueler_1",
      internerDateiname: "uuid-B.jpg",
      mimeType: "image/jpeg",
      byteSize: jpeg2.byteLength,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const second = await service.uploadFoto("schueler_1", file2);
    expect(second.id).toBe("fot_B");

    // Die alte Datei wird erst NACH erfolgreichem Replace geloescht.
    expect(mockDateiPort.loesche).toHaveBeenCalledWith("uuid-A.jpg");
  });
});
