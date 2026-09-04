CREATE TABLE "qa_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"shot_id" uuid,
	"check" text NOT NULL,
	"severity" text NOT NULL,
	"evidence" text,
	"target" text,
	"repair" text,
	"status" text DEFAULT 'open' NOT NULL,
	"resolution" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "qa_findings" ADD CONSTRAINT "qa_findings_plan_id_episode_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."episode_plans"("id") ON DELETE no action ON UPDATE no action;