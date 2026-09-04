CREATE TABLE "audience_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"episode_number" integer NOT NULL,
	"window_id" uuid,
	"status" text DEFAULT 'proposed' NOT NULL,
	"title" text,
	"summary" text,
	"rationale" text,
	"confidence" real DEFAULT 0 NOT NULL,
	"rules" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"snapshot" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"classify_snapshot_id" uuid,
	"decide_snapshot_id" uuid,
	"winning_candidate_id" uuid,
	"approved_by" text,
	"approved_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "decision_candidates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"decision_id" uuid NOT NULL,
	"label" text NOT NULL,
	"summary" text,
	"intent" text DEFAULT 'suggestion' NOT NULL,
	"signal_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"signal_count" integer DEFAULT 0 NOT NULL,
	"score" real DEFAULT 0 NOT NULL,
	"is_winner" boolean DEFAULT false NOT NULL,
	"rationale" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audience_decisions" ADD CONSTRAINT "audience_decisions_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "decision_candidates" ADD CONSTRAINT "decision_candidates_decision_id_audience_decisions_id_fk" FOREIGN KEY ("decision_id") REFERENCES "public"."audience_decisions"("id") ON DELETE no action ON UPDATE no action;