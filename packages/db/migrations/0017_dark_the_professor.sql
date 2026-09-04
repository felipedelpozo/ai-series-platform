CREATE TABLE "episode_exports" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"plan_id" uuid NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"asset_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "episode_exports" ADD CONSTRAINT "episode_exports_plan_id_episode_plans_id_fk" FOREIGN KEY ("plan_id") REFERENCES "public"."episode_plans"("id") ON DELETE no action ON UPDATE no action;