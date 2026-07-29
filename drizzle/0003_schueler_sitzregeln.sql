CREATE TABLE IF NOT EXISTS "schueler" (
  "id" TEXT PRIMARY KEY,
  "klasse_id" TEXT NOT NULL REFERENCES "klassen"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "initialen" TEXT NOT NULL,
  "farbe" TEXT NOT NULL,
  "lernstand" TEXT,
  "verhalten" TEXT,
  "freitextnotizen" TEXT,
  "foto_placeholder_id" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "schueler_klasse_id_idx" ON "schueler" ("klasse_id");

CREATE TABLE IF NOT EXISTS "sitzregeln" (
  "id" TEXT PRIMARY KEY,
  "schueler_id" TEXT NOT NULL REFERENCES "schueler"("id") ON DELETE CASCADE,
  "klasse_id" TEXT NOT NULL REFERENCES "klassen"("id") ON DELETE CASCADE,
  "typ" TEXT NOT NULL,
  "target_schueler_id" TEXT REFERENCES "schueler"("id") ON DELETE CASCADE,
  "haerte" TEXT NOT NULL,
  "gewicht" DOUBLE PRECISION,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

CREATE INDEX IF NOT EXISTS "sitzregeln_schueler_id_idx" ON "sitzregeln" ("schueler_id");
CREATE INDEX IF NOT EXISTS "sitzregeln_klasse_id_idx" ON "sitzregeln" ("klasse_id");
