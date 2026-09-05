CREATE TABLE "story_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"version" integer NOT NULL,
	"kind" text DEFAULT 'before' NOT NULL,
	"episode" integer,
	"data" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"is_current" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "story_states" ADD CONSTRAINT "story_states_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;