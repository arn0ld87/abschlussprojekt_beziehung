CREATE TABLE "accounts" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"access_token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"scope" text,
	"password" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "fotos" (
	"id" text PRIMARY KEY NOT NULL,
	"schueler_id" text NOT NULL,
	"pfad" text NOT NULL,
	"mime_type" text NOT NULL,
	"groesse" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fotos_schueler_id_unique" UNIQUE("schueler_id")
);
--> statement-breakpoint
CREATE TABLE "klassen" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"notizen" text,
	"user_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "schueler" (
	"id" text PRIMARY KEY NOT NULL,
	"klasse_id" text NOT NULL,
	"name" text NOT NULL,
	"initialen" text NOT NULL,
	"farbe" text NOT NULL,
	"lernstand" text,
	"verhalten" text,
	"freitextnotizen" text,
	"foto_placeholder_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sitzregeln" (
	"id" text PRIMARY KEY NOT NULL,
	"schueler_id" text NOT NULL,
	"klasse_id" text NOT NULL,
	"typ" text NOT NULL,
	"target_schueler_id" text,
	"haerte" text NOT NULL,
	"gewicht" double precision,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "verifications" (
	"id" text PRIMARY KEY NOT NULL,
	"identifier" text NOT NULL,
	"value" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_schueler_id_schueler_id_fk" FOREIGN KEY ("schueler_id") REFERENCES "public"."schueler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "klassen" ADD CONSTRAINT "klassen_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "schueler" ADD CONSTRAINT "schueler_klasse_id_klassen_id_fk" FOREIGN KEY ("klasse_id") REFERENCES "public"."klassen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitzregeln" ADD CONSTRAINT "sitzregeln_schueler_id_schueler_id_fk" FOREIGN KEY ("schueler_id") REFERENCES "public"."schueler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitzregeln" ADD CONSTRAINT "sitzregeln_klasse_id_klassen_id_fk" FOREIGN KEY ("klasse_id") REFERENCES "public"."klassen"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sitzregeln" ADD CONSTRAINT "sitzregeln_target_schueler_id_schueler_id_fk" FOREIGN KEY ("target_schueler_id") REFERENCES "public"."schueler"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "accounts_user_id_idx" ON "accounts" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "klassen_user_id_idx" ON "klassen" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "schueler_klasse_id_idx" ON "schueler" USING btree ("klasse_id");--> statement-breakpoint
CREATE INDEX "sessions_user_id_idx" ON "sessions" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "sitzregeln_schueler_id_idx" ON "sitzregeln" USING btree ("schueler_id");--> statement-breakpoint
CREATE INDEX "sitzregeln_klasse_id_idx" ON "sitzregeln" USING btree ("klasse_id");