import { FotoService } from "../../domain/foto/foto-service";
import { FotoRepository } from "../../infrastructure/db/foto-repository";
import { LokalerDateiAdapter } from "../../infrastructure/datei/lokaler-datei-adapter";

let fotoServiceInstance: FotoService;

export function getDefaultFotoService(): FotoService {
  if (!fotoServiceInstance) {
    fotoServiceInstance = new FotoService(
      new FotoRepository(),
      new LokalerDateiAdapter()
    );
  }
  return fotoServiceInstance;
}
