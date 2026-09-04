CREATE TABLE "series" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "series_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "series_bibles" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"title" text,
	"premise" text,
	"genre" text,
	"tone" text,
	"audience" text,
	"format" text,
	"language" text,
	"episode_duration" text,
	"narrative_rules" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"visual_style" text,
	"canon" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"prohibitions" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"description" text,
	"source" text DEFAULT 'manual' NOT NULL,
	"prompt_snapshot_id" uuid,
	"is_active" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "series_bibles" ADD CONSTRAINT "series_bibles_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "series_bibles_series_version_idx" ON "series_bibles" USING btree ("series_id","version");