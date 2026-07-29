CREATE TABLE "fotos" (
	"id" text PRIMARY KEY NOT NULL,
	"schueler_id" text NOT NULL,
	"interner_dateiname" text NOT NULL,
	"mime_type" text NOT NULL,
	"byte_size" integer NOT NULL,
	"breite_px" integer,
	"hoehe_px" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp with time zone,
	CONSTRAINT "fotos_schueler_id_unique" UNIQUE("schueler_id")
);
--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_schueler_id_schueler_id_fk" FOREIGN KEY ("schueler_id") REFERENCES "public"."schueler"("id") ON DELETE cascade ON UPDATE no action;
