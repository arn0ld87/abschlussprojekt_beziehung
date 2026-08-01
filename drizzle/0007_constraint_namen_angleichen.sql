-- Gleicht die Constraint-Namen an das Namensschema von drizzle-orm an.
--
-- Die Migrationen 0001 bis 0006 wurden von Hand geschrieben und haben ihre
-- Fremdschluessel inline als REFERENCES deklariert. PostgreSQL vergibt dabei
-- Default-Namen der Form "<tabelle>_<spalte>_fkey", waehrend drizzle-orm aus
-- schema.ts die Form "<tabelle>_<spalte>_<zieltabelle>_<zielspalte>_fk"
-- ableitet. Dasselbe gilt fuer das UNIQUE auf users.email.
--
-- Die Abweichung ist rein namensbezogen: Spalten, Typen, Referenzen, ON DELETE
-- und Daten bleiben identisch. Ohne diese Angleichung sieht drizzle-kit die
-- Constraints dauerhaft als fehlend und erzeugt sie bei jedem generate erneut.
--
-- Gedroppt werden beide Namensformen: die Zielnamen, damit die Migration auch
-- auf Datenbanken laeuft, die vorher per drizzle-kit push angeglichen wurden,
-- und die Postgres-Defaultnamen aus den Migrationen 0001 bis 0006. Beides sind
-- No-Ops, wenn der jeweilige Constraint nicht existiert.

ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_users_id_fk";
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_user_id_users_id_fk";
ALTER TABLE "klassen" DROP CONSTRAINT IF EXISTS "klassen_user_id_users_id_fk";
ALTER TABLE "schueler" DROP CONSTRAINT IF EXISTS "schueler_klasse_id_klassen_id_fk";
ALTER TABLE "sitzregeln" DROP CONSTRAINT IF EXISTS "sitzregeln_schueler_id_schueler_id_fk";
ALTER TABLE "sitzregeln" DROP CONSTRAINT IF EXISTS "sitzregeln_klasse_id_klassen_id_fk";
ALTER TABLE "sitzregeln" DROP CONSTRAINT IF EXISTS "sitzregeln_target_schueler_id_schueler_id_fk";
ALTER TABLE "raeume" DROP CONSTRAINT IF EXISTS "raeume_user_id_users_id_fk";
ALTER TABLE "sitzplaene" DROP CONSTRAINT IF EXISTS "sitzplaene_user_id_users_id_fk";
ALTER TABLE "sitzplaene" DROP CONSTRAINT IF EXISTS "sitzplaene_klasse_id_klassen_id_fk";
ALTER TABLE "sitzplaene" DROP CONSTRAINT IF EXISTS "sitzplaene_raum_id_raeume_id_fk";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_unique";

ALTER TABLE "sessions" DROP CONSTRAINT IF EXISTS "sessions_user_id_fkey";
ALTER TABLE "accounts" DROP CONSTRAINT IF EXISTS "accounts_user_id_fkey";
ALTER TABLE "klassen" DROP CONSTRAINT IF EXISTS "klassen_user_id_fkey";
ALTER TABLE "schueler" DROP CONSTRAINT IF EXISTS "schueler_klasse_id_fkey";
ALTER TABLE "sitzregeln" DROP CONSTRAINT IF EXISTS "sitzregeln_schueler_id_fkey";
ALTER TABLE "sitzregeln" DROP CONSTRAINT IF EXISTS "sitzregeln_klasse_id_fkey";
ALTER TABLE "sitzregeln" DROP CONSTRAINT IF EXISTS "sitzregeln_target_schueler_id_fkey";
ALTER TABLE "raeume" DROP CONSTRAINT IF EXISTS "raeume_user_id_fkey";
ALTER TABLE "sitzplaene" DROP CONSTRAINT IF EXISTS "sitzplaene_user_id_fkey";
ALTER TABLE "sitzplaene" DROP CONSTRAINT IF EXISTS "sitzplaene_klasse_id_fkey";
ALTER TABLE "sitzplaene" DROP CONSTRAINT IF EXISTS "sitzplaene_raum_id_fkey";
ALTER TABLE "users" DROP CONSTRAINT IF EXISTS "users_email_key";

ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "klassen" ADD CONSTRAINT "klassen_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "schueler" ADD CONSTRAINT "schueler_klasse_id_klassen_id_fk" FOREIGN KEY ("klasse_id") REFERENCES "public"."klassen"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sitzregeln" ADD CONSTRAINT "sitzregeln_schueler_id_schueler_id_fk" FOREIGN KEY ("schueler_id") REFERENCES "public"."schueler"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sitzregeln" ADD CONSTRAINT "sitzregeln_klasse_id_klassen_id_fk" FOREIGN KEY ("klasse_id") REFERENCES "public"."klassen"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sitzregeln" ADD CONSTRAINT "sitzregeln_target_schueler_id_schueler_id_fk" FOREIGN KEY ("target_schueler_id") REFERENCES "public"."schueler"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "raeume" ADD CONSTRAINT "raeume_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sitzplaene" ADD CONSTRAINT "sitzplaene_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sitzplaene" ADD CONSTRAINT "sitzplaene_klasse_id_klassen_id_fk" FOREIGN KEY ("klasse_id") REFERENCES "public"."klassen"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "sitzplaene" ADD CONSTRAINT "sitzplaene_raum_id_raeume_id_fk" FOREIGN KEY ("raum_id") REFERENCES "public"."raeume"("id") ON DELETE cascade ON UPDATE no action;
ALTER TABLE "users" ADD CONSTRAINT "users_email_unique" UNIQUE("email");
