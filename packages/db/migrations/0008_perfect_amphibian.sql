CREATE TABLE "reference_sheets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"entity_id" uuid NOT NULL,
	"entity_version_id" uuid NOT NULL,
	"job_id" uuid,
	"status" text DEFAULT 'draft' NOT NULL,
	"panels" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "reference_sheets" ADD CONSTRAINT "reference_sheets_entity_id_entities_id_fk" FOREIGN KEY ("entity_id") REFERENCES "public"."entities"("id") ON DELETE no action ON UPDATE no action;