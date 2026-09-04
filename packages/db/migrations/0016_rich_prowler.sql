CREATE TABLE "audio_tracks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"shot_id" uuid,
	"kind" text DEFAULT 'voice' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"text" text,
	"voice" text,
	"asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
