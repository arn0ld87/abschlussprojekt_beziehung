CREATE TABLE IF NOT EXISTS "klassen" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "notizen" TEXT,
  "user_id" TEXT NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "created_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
  "deleted_at" TIMESTAMP WITH TIME ZONE
);

CREATE INDEX IF NOT EXISTS "klassen_user_id_idx" ON "klassen" ("user_id");
