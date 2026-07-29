import { describe, it, expect, vi, beforeEach } from "vitest";
import { FotoService } from "../../src/domain/foto/foto-service";

describe("FotoService", () => {
  const mockRepo = {
    findBySchuelerId: vi.fn(),
    create: vi.fn(),
    deleteBySchuelerId: vi.fn(),
  };

  const mockDateiPort = {
    speichere: vi.fn(),
    loesche: vi.fn(),
    lese: vi.fn(),
  };

  let service: FotoService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new FotoService(mockRepo, mockDateiPort);
  });

  it("should upload a valid photo", async () => {
    const file = new File(["test"], "test.jpg", { type: "image/jpeg" });
    mockRepo.findBySchuelerId.mockResolvedValue(null);
    mockDateiPort.speichere.mockResolvedValue("fake-path.jpg");
    mockRepo.create.mockResolvedValue({ id: "fot_1", pfad: "fake-path.jpg" });

    const result = await service.uploadFoto("schueler_1", file);
    expect(result.id).toBe("fot_1");
    expect(mockDateiPort.speichere).toHaveBeenCalledWith("schueler_1", file);
    expect(mockRepo.create).toHaveBeenCalled();
  });

  it("should reject large files", async () => {
    const largeFile = new File(["a".repeat(6 * 1024 * 1024)], "test.jpg", { type: "image/jpeg" });
    await expect(service.uploadFoto("schueler_1", largeFile)).rejects.toThrow("maximal 5MB");
  });

  it("should reject non-image files", async () => {
    const textFile = new File(["test"], "test.txt", { type: "text/plain" });
    await expect(service.uploadFoto("schueler_1", textFile)).rejects.toThrow("Nur Bilder sind erlaubt");
  });
});
