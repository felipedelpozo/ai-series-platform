ALTER TABLE "assets" ADD COLUMN "parent_id" uuid;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "name" text;--> statement-breakpoint
ALTER TABLE "assets" ADD COLUMN "duration_ms" integer;