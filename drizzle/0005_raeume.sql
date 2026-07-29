CREATE TABLE IF NOT EXISTS "raeume" (
  "id" TEXT PRIMARY KEY,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "name" TEXT NOT NULL,
  "breite_cm" DOUBLE PRECISION NOT NULL,
  "laenge_cm" DOUBLE PRECISION NOT NULL,
  "raster_cm" DOUBLE PRECISION NOT NULL,
  "dokument_version" INTEGER NOT NULL DEFAULT 1,
  "canvas_document" JSONB NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "raeume_user_id_idx" ON "raeume" ("user_id");
