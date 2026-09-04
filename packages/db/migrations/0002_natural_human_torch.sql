CREATE TABLE "assets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"generation_id" uuid,
	"kind" text DEFAULT 'image' NOT NULL,
	"source" text DEFAULT 'generated' NOT NULL,
	"url" text,
	"mime" text,
	"width" integer,
	"height" integer,
	"size_bytes" integer,
	"provider" text,
	"model" text,
	"status" text DEFAULT 'draft' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"purpose" text NOT NULL,
	"template_id" uuid,
	"version_id" uuid,
	"prompt_snapshot_id" uuid,
	"provider" text DEFAULT 'fal' NOT NULL,
	"model" text NOT NULL,
	"status" text DEFAULT 'queued' NOT NULL,
	"request_id" text,
	"params" jsonb,
	"error" text,
	"duration_ms" integer,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "assets" ADD CONSTRAINT "assets_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "generations" ADD CONSTRAINT "generations_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;