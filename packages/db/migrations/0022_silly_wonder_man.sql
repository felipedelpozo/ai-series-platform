CREATE TABLE "cost_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"job_id" uuid,
	"generation_id" uuid,
	"series_id" uuid,
	"episode_number" integer,
	"scene_id" uuid,
	"shot_id" uuid,
	"provider" text NOT NULL,
	"model" text,
	"kind" text NOT NULL,
	"status" text DEFAULT 'success' NOT NULL,
	"phase" text DEFAULT 'actual' NOT NULL,
	"estimated_cost" real,
	"actual_cost" real,
	"duration_ms" integer,
	"correlation_id" text,
	"error" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cost_records" ADD CONSTRAINT "cost_records_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;