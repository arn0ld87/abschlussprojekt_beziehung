export interface DateiPort {
  speichere(schuelerId: string, datei: File): Promise<string>;
  loesche(pfad: string): Promise<void>;
  lese(pfad: string): Promise<Buffer | null>;
}
