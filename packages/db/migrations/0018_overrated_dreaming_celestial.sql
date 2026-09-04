CREATE TABLE "audience_signals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"episode_number" integer NOT NULL,
	"window_id" uuid,
	"platform" text NOT NULL,
	"source_id" text NOT NULL,
	"raw" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"comment" text,
	"liked" boolean DEFAULT false NOT NULL,
	"reaction" text,
	"reply_to" text,
	"metadata" jsonb,
	"is_spam" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "interaction_windows" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"series_id" uuid NOT NULL,
	"episode_number" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audience_signals" ADD CONSTRAINT "audience_signals_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interaction_windows" ADD CONSTRAINT "interaction_windows_series_id_series_id_fk" FOREIGN KEY ("series_id") REFERENCES "public"."series"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "audience_signals_platform_source_idx" ON "audience_signals" USING btree ("platform","source_id");