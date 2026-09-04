CREATE TABLE "director_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shot_id" uuid NOT NULL,
	"status" text DEFAULT 'idle' NOT NULL,
	"initial_prompt" text,
	"aspect_ratio" text,
	"resolution" text,
	"memory" text,
	"prompt_version" integer DEFAULT 0 NOT NULL,
	"current_prompt" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "director_sessions" ADD CONSTRAINT "director_sessions_shot_id_shots_id_fk" FOREIGN KEY ("shot_id") REFERENCES "public"."shots"("id") ON DELETE no action ON UPDATE no action;