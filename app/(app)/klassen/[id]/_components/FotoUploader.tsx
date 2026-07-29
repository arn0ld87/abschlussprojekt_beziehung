"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const ALLOWED_MIME = ["image/jpeg", "image/png", "image/webp"];
const MAX_BYTES = 5 * 1024 * 1024;
const ACCEPT_ATTR = ALLOWED_MIME.join(",");

type UploadState =
  | { kind: "idle" }
  | { kind: "uploading" }
  | { kind: "error"; message: string };

interface FotoUploaderProps {
  klasseId: string;
  schuelerId: string;
  fotoUrl?: string;
}

export function FotoUploader({ klasseId, schuelerId, fotoUrl }: FotoUploaderProps) {
  const router = useRouter();
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement | null>(null);

  const [state, setState] = useState<UploadState>({ kind: "idle" });
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  // Serverseitige Foto-Existenz wird durch Laden des <img> aufgeloest: eine
  // 404 (kein Foto hinterlegt) triggert onError. So vermeiden wir kaputte
  // Bilder und falsch angezeigte Replace-/Delete-Controls, wenn noch kein
  // Foto existiert.
  const [fotoVorhanden, setFotoVorhanden] = useState(false);

  // Bei Wechsel der fotoUrl laedt das <img> neu; onLoad/onError syncs
  // fotoVorhanden automatisch. Ein zusaetzlicher Effect ist nicht noetig.

  // Object-URLs muessen freigegeben werden, sobald sie nicht mehr gebraucht
  // werden — auch beim Unmount waehrend eines laufenden Uploads. revoke ist
  // idempotent, daher ist ein doppelter Aufruf (z.B. nach erfolgtem Upload)
  // harmlos.
  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const isUploading = state.kind === "uploading";
  const errorMessage = state.kind === "error" ? state.message : null;
  const hatFoto = fotoVorhanden || !!previewUrl;
  const displayedUrl = previewUrl ?? fotoUrl;
  const statusMessage = isUploading
    ? "Foto wird hochgeladen"
    : hatFoto
    ? "Foto vorhanden"
    : "Kein Foto hinterlegt";

  const validateClient = (file: File): string | null => {
    if (!ALLOWED_MIME.includes(file.type)) {
      return "Nur JPEG, PNG oder WebP sind erlaubt.";
    }
    if (file.size > MAX_BYTES) {
      return `Das Bild darf maximal ${MAX_BYTES / 1024 / 1024} MB gross sein.`;
    }
    if (file.size <= 0) {
      return "Datei ist leer.";
    }
    return null;
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    // Erlaubt es, nach Upload-Fehler dieselbe Datei erneut zu waehlen.
    if (inputRef.current) inputRef.current.value = "";
    if (!file) return;

    const validationError = validateClient(file);
    if (validationError) {
      setState({ kind: "error", message: validationError });
      return;
    }

    // Optimistische Vorschau (nur in-memory; kein Persistieren).
    const objectUrl = URL.createObjectURL(file);
    setPreviewUrl(objectUrl);

    setState({ kind: "uploading" });

    const formData = new FormData();
    formData.append("foto", file);

    try {
      const res = await fetch(`/api/klassen/${klasseId}/schueler/${schuelerId}/foto`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data: { error?: { message?: string } | string } = await res
          .json()
          .catch(() => ({}));
        const msg =
          (typeof data.error === "object" && data.error?.message) ||
          (typeof data.error === "string" && data.error) ||
          "Fehler beim Hochladen.";
        URL.revokeObjectURL(objectUrl);
        setPreviewUrl(null);
        setState({ kind: "error", message: msg });
        return;
      }

      // Server hat das Foto persistiert — Existenz bestätigt, lokale Vorschau
      // verwerfen, damit das serverseitige Bild angezeigt wird.
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
      setFotoVorhanden(true);
      setState({ kind: "idle" });
      router.refresh();
    } catch {
      URL.revokeObjectURL(objectUrl);
      setPreviewUrl(null);
      setState({ kind: "error", message: "Netzwerkfehler beim Hochladen." });
    }
  };

  const handleDelete = async () => {
    if (typeof window !== "undefined" && !window.confirm("Foto wirklich loeschen?")) {
      return;
    }

    setState({ kind: "uploading" });
    try {
      const res = await fetch(`/api/klassen/${klasseId}/schueler/${schuelerId}/foto`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const data: { error?: { message?: string } | string } = await res
          .json()
          .catch(() => ({}));
        const msg =
          (typeof data.error === "object" && data.error?.message) ||
          (typeof data.error === "string" && data.error) ||
          "Fehler beim Loeschen.";
        setState({ kind: "error", message: msg });
        return;
      }

      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
      setFotoVorhanden(false);
      setState({ kind: "idle" });
      router.refresh();
    } catch {
      setState({ kind: "error", message: "Netzwerkfehler beim Loeschen." });
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {/* Live-Region fuer Screenreader (Status). */}
      <p className="sr-only" aria-live="polite">
        {statusMessage}
      </p>

      {/* Fehlerbanner: role="alert" + aria-live="assertive". */}
      {errorMessage && (
        <div
          role="alert"
          aria-live="assertive"
          className="text-red-700 bg-red-50 border border-red-200 rounded p-2 text-sm"
        >
          {errorMessage}
        </div>
      )}

      <div className="flex items-center gap-4">
        {displayedUrl ? (
          <div className="relative w-32 h-32">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={displayedUrl}
              alt={`Foto von Schuelerprofil ${schuelerId}`}
              onLoad={() => setFotoVorhanden(true)}
              onError={() => setFotoVorhanden(false)}
              className={`w-full h-full object-cover rounded-full border border-gray-200 transition-opacity ${
                hatFoto ? "opacity-100" : "opacity-0"
              }`}
              width={128}
              height={128}
            />
            {!hatFoto && (
              <div
                aria-hidden="true"
                className="absolute inset-0 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-sm"
              >
                Kein Foto
              </div>
            )}
          </div>
        ) : (
          <div
            aria-hidden="true"
            className="w-32 h-32 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 text-sm"
          >
            Kein Foto
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <label
          htmlFor={inputId}
          className={`inline-flex items-center px-3 py-2 rounded cursor-pointer text-sm font-medium transition-colors ${
            isUploading
              ? "bg-gray-300 text-gray-600 cursor-not-allowed"
              : "bg-blue-600 text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          }`}
        >
          {isUploading ? "Laedt…" : hatFoto ? "Foto ersetzen" : "Foto hochladen"}
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept={ACCEPT_ATTR}
            onChange={handleFileChange}
            disabled={isUploading}
            className="sr-only"
            aria-describedby={`${inputId}-hint`}
          />
        </label>
        <span id={`${inputId}-hint`} className="sr-only">
          Erlaubte Formate: JPEG, PNG oder WebP. Maximale Groesse 5 Megabyte.
        </span>

        {hatFoto && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={isUploading}
            className={`inline-flex items-center px-3 py-2 rounded text-sm font-medium transition-colors ${
              isUploading
                ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                : "bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            }`}
            aria-label="Foto loeschen"
          >
            Foto loeschen
          </button>
        )}
      </div>
    </div>
  );
}
