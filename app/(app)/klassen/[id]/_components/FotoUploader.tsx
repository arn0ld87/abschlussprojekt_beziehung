"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function FotoUploader({ klasseId, schuelerId, fotoUrl }: { klasseId: string; schuelerId: string; fotoUrl?: string }) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setError("Das Bild darf maximal 5MB groß sein.");
      return;
    }

    if (!file.type.startsWith("image/")) {
      setError("Nur Bilder sind erlaubt.");
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append("foto", file);

    try {
      const res = await fetch(`/api/klassen/${klasseId}/schueler/${schuelerId}/foto`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Fehler beim Hochladen.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Foto wirklich löschen?")) return;
    
    setIsUploading(true);
    setError(null);
    try {
      const res = await fetch(`/api/klassen/${klasseId}/schueler/${schuelerId}/foto`, {
        method: "DELETE",
      });

      if (!res.ok) {
        setError("Fehler beim Löschen.");
      } else {
        router.refresh();
      }
    } catch {
      setError("Netzwerkfehler.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <div className="text-red-500 text-sm">{error}</div>}
      
      {fotoUrl ? (
        <div className="relative w-32 h-32 group">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={fotoUrl} alt="Schüler Foto" className="w-full h-full object-cover rounded-full" />
          <button
            onClick={handleDelete}
            disabled={isUploading}
            className="absolute bottom-0 right-0 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 focus:outline-none"
            aria-label="Foto löschen"
          >
            🗑️
          </button>
        </div>
      ) : (
        <div className="w-32 h-32 bg-gray-200 rounded-full flex items-center justify-center">
          <label className="cursor-pointer text-blue-500 hover:underline">
            {isUploading ? "Lädt..." : "Foto hochladen"}
            <input type="file" className="hidden" accept="image/*" onChange={handleUpload} disabled={isUploading} />
          </label>
        </div>
      )}
    </div>
  );
}
