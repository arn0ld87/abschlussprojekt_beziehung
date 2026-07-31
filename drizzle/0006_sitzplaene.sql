CREATE TABLE IF NOT EXISTS "sitzplaene" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "klasse_id" TEXT NOT NULL REFERENCES "klassen"("id") ON DELETE CASCADE,
  "raum_id" TEXT NOT NULL REFERENCES "raeume"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "dokument_version" INTEGER NOT NULL DEFAULT 1,
  "canvas_document" JSONB NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "sitzplaene_user_id_idx" ON "sitzplaene" ("user_id");
