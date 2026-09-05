CREATE TABLE "copilot_application_receipts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"application_id" uuid NOT NULL,
	"approval_id" uuid NOT NULL,
	"revision_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"canonical_results" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"correlation_id" text NOT NULL,
	"committed_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_receipts_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_receipts_fingerprint_check" CHECK ("copilot_application_receipts"."fingerprint" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "copilot_applications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"approval_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"requested_by_user_id" uuid NOT NULL,
	"idempotency_key" text NOT NULL,
	"status" text DEFAULT 'applying' NOT NULL,
	"error_code" text,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_applications_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_applications_status_check" CHECK ("copilot_applications"."status" in ('applying', 'applied', 'failed_before_commit'))
);
--> statement-breakpoint
CREATE TABLE "copilot_context_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"series_id" uuid,
	"episode_plan_id" uuid,
	"episode_number" integer,
	"resource_type" text,
	"resource_id" uuid,
	"canonical_bases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"fingerprint" text NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_contexts_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_contexts_id_conversation_workspace_unique" UNIQUE("id","conversation_id","workspace_id"),
	CONSTRAINT "copilot_contexts_fingerprint_check" CHECK ("copilot_context_snapshots"."fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_contexts_resource_pair_check" CHECK (("copilot_context_snapshots"."resource_type" is null) = ("copilot_context_snapshots"."resource_id" is null)),
	CONSTRAINT "copilot_contexts_episode_scope_check" CHECK ("copilot_context_snapshots"."episode_plan_id" is null or "copilot_context_snapshots"."series_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "copilot_conversations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"title" text NOT NULL,
	"status" text DEFAULT 'active' NOT NULL,
	"next_sequence" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_conversations_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_conversations_title_check" CHECK (char_length(trim("copilot_conversations"."title")) between 1 and 160),
	CONSTRAINT "copilot_conversations_status_check" CHECK ("copilot_conversations"."status" in ('active', 'archived')),
	CONSTRAINT "copilot_conversations_sequence_check" CHECK ("copilot_conversations"."next_sequence" > 0)
);
--> statement-breakpoint
CREATE TABLE "copilot_cost_confirmations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"quote_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"quote_fingerprint" text NOT NULL,
	"revision_fingerprint" text,
	"scope_fingerprint" text NOT NULL,
	"quota_fingerprint" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_confirmations_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_confirmations_quote_fingerprint_check" CHECK ("copilot_cost_confirmations"."quote_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_confirmations_scope_fingerprint_check" CHECK ("copilot_cost_confirmations"."scope_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_confirmations_quota_fingerprint_check" CHECK ("copilot_cost_confirmations"."quota_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_confirmations_revision_fingerprint_check" CHECK ("copilot_cost_confirmations"."revision_fingerprint" is null or "copilot_cost_confirmations"."revision_fingerprint" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "copilot_cost_quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"target_kind" text NOT NULL,
	"message_id" uuid,
	"revision_id" uuid,
	"approval_id" uuid,
	"revision_fingerprint" text,
	"execution_dependency" text NOT NULL,
	"scope" jsonb NOT NULL,
	"scope_fingerprint" text NOT NULL,
	"quote_fingerprint" text NOT NULL,
	"provider" text NOT NULL,
	"model" text,
	"kind" text NOT NULL,
	"currency" text NOT NULL,
	"maximum_estimated_cost" numeric(14, 6) NOT NULL,
	"estimated_credits" integer NOT NULL,
	"quota_limit" integer NOT NULL,
	"quota_used" integer NOT NULL,
	"quota_fingerprint" text NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_quotes_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_quotes_target_check" CHECK ("copilot_cost_quotes"."target_kind" in ('inference', 'paid_job')),
	CONSTRAINT "copilot_quotes_binding_check" CHECK (("copilot_cost_quotes"."target_kind" = 'inference' and "copilot_cost_quotes"."message_id" is not null and "copilot_cost_quotes"."revision_id" is null and "copilot_cost_quotes"."approval_id" is null) or ("copilot_cost_quotes"."target_kind" = 'paid_job' and "copilot_cost_quotes"."message_id" is null and "copilot_cost_quotes"."revision_id" is not null and "copilot_cost_quotes"."approval_id" is not null)),
	CONSTRAINT "copilot_quotes_execution_dependency_check" CHECK ("copilot_cost_quotes"."execution_dependency" in ('independent', 'requires_application_receipt')),
	CONSTRAINT "copilot_quotes_scope_fingerprint_check" CHECK ("copilot_cost_quotes"."scope_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_quotes_quote_fingerprint_check" CHECK ("copilot_cost_quotes"."quote_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_quotes_revision_fingerprint_check" CHECK ("copilot_cost_quotes"."revision_fingerprint" is null or "copilot_cost_quotes"."revision_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_quotes_quota_fingerprint_check" CHECK ("copilot_cost_quotes"."quota_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_quotes_amount_check" CHECK ("copilot_cost_quotes"."maximum_estimated_cost" >= 0),
	CONSTRAINT "copilot_quotes_credits_check" CHECK ("copilot_cost_quotes"."estimated_credits" >= 0),
	CONSTRAINT "copilot_quotes_quota_check" CHECK ("copilot_cost_quotes"."quota_limit" >= 0 and "copilot_cost_quotes"."quota_used" >= 0)
);
--> statement-breakpoint
CREATE TABLE "copilot_decisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"validation_run_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"fingerprint" text NOT NULL,
	"diff_fingerprint" text NOT NULL,
	"base_fingerprint" text NOT NULL,
	"kind" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_decisions_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_decisions_id_revision_workspace_unique" UNIQUE("id","revision_id","workspace_id"),
	CONSTRAINT "copilot_decisions_kind_check" CHECK ("copilot_decisions"."kind" in ('approved', 'rejected', 'discarded')),
	CONSTRAINT "copilot_decisions_fingerprint_check" CHECK ("copilot_decisions"."fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_decisions_diff_fingerprint_check" CHECK ("copilot_decisions"."diff_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_decisions_base_fingerprint_check" CHECK ("copilot_decisions"."base_fingerprint" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "copilot_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"actor_user_id" uuid,
	"type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_events_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_events_sequence_check" CHECK ("copilot_events"."sequence" > 0)
);
--> statement-breakpoint
CREATE TABLE "copilot_inference_usage" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"conversation_id" uuid NOT NULL,
	"message_id" uuid NOT NULL,
	"revision_id" uuid,
	"confirmation_id" uuid NOT NULL,
	"provider" text NOT NULL,
	"model" text NOT NULL,
	"prompt_snapshot_id" uuid,
	"prompt_purpose" text NOT NULL,
	"prompt_version" integer,
	"input_units" integer DEFAULT 0 NOT NULL,
	"output_units" integer DEFAULT 0 NOT NULL,
	"duration_ms" integer,
	"estimated_cost" numeric(14, 6),
	"actual_cost" numeric(14, 6),
	"currency" text NOT NULL,
	"status" text NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_usage_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_usage_units_check" CHECK ("copilot_inference_usage"."input_units" >= 0 and "copilot_inference_usage"."output_units" >= 0),
	CONSTRAINT "copilot_usage_duration_check" CHECK ("copilot_inference_usage"."duration_ms" is null or "copilot_inference_usage"."duration_ms" >= 0),
	CONSTRAINT "copilot_usage_cost_check" CHECK (("copilot_inference_usage"."estimated_cost" is null or "copilot_inference_usage"."estimated_cost" >= 0) and ("copilot_inference_usage"."actual_cost" is null or "copilot_inference_usage"."actual_cost" >= 0)),
	CONSTRAINT "copilot_usage_status_check" CHECK ("copilot_inference_usage"."status" in ('succeeded', 'failed'))
);
--> statement-breakpoint
CREATE TABLE "copilot_job_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"confirmation_id" uuid NOT NULL,
	"job_id" uuid NOT NULL,
	"intent_fingerprint" text NOT NULL,
	"idempotency_key" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_job_bindings_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_job_bindings_intent_fingerprint_check" CHECK ("copilot_job_bindings"."intent_fingerprint" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "copilot_messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"sequence" integer NOT NULL,
	"client_message_id" text,
	"role" text NOT NULL,
	"classification" text NOT NULL,
	"content" text NOT NULL,
	"context_snapshot_id" uuid,
	"structured_refs" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"correlation_id" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_messages_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_messages_sequence_check" CHECK ("copilot_messages"."sequence" > 0),
	CONSTRAINT "copilot_messages_content_check" CHECK (char_length("copilot_messages"."content") between 1 and 50000),
	CONSTRAINT "copilot_messages_role_check" CHECK ("copilot_messages"."role" in ('user', 'assistant', 'system')),
	CONSTRAINT "copilot_messages_classification_check" CHECK ("copilot_messages"."classification" in ('query', 'proposal', 'canonical_mutation', 'paid_job', 'mixed')),
	CONSTRAINT "copilot_messages_user_client_key_check" CHECK ("copilot_messages"."role" <> 'user' or "copilot_messages"."client_message_id" is not null)
);
--> statement-breakpoint
CREATE TABLE "copilot_proposal_revisions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"proposal_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"revision_number" integer NOT NULL,
	"schema_version" integer DEFAULT 1 NOT NULL,
	"payload" jsonb NOT NULL,
	"canonical_bases" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"diff" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"client_revision_id" text NOT NULL,
	"content_fingerprint" text NOT NULL,
	"fingerprint" text NOT NULL,
	"validation_status" text DEFAULT 'pending' NOT NULL,
	"prompt_snapshot_id" uuid,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_revisions_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_revisions_id_proposal_workspace_unique" UNIQUE("id","proposal_id","workspace_id"),
	CONSTRAINT "copilot_revisions_number_check" CHECK ("copilot_proposal_revisions"."revision_number" > 0),
	CONSTRAINT "copilot_revisions_schema_check" CHECK ("copilot_proposal_revisions"."schema_version" > 0),
	CONSTRAINT "copilot_revisions_content_fingerprint_check" CHECK ("copilot_proposal_revisions"."content_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_revisions_fingerprint_check" CHECK ("copilot_proposal_revisions"."fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_revisions_validation_status_check" CHECK ("copilot_proposal_revisions"."validation_status" in ('pending', 'valid', 'valid_with_warnings', 'invalid', 'stale'))
);
--> statement-breakpoint
CREATE TABLE "copilot_proposals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"conversation_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"context_snapshot_id" uuid NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"intent" text NOT NULL,
	"status" text DEFAULT 'collecting_context' NOT NULL,
	"current_revision_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_proposals_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_proposals_intent_check" CHECK ("copilot_proposals"."intent" in ('canonical_mutation', 'paid_job', 'mixed')),
	CONSTRAINT "copilot_proposals_status_check" CHECK ("copilot_proposals"."status" in ('collecting_context', 'preparing_draft', 'ready_for_review', 'awaiting_approval', 'applying', 'applied', 'needs_information', 'continuity_conflict', 'stale_draft', 'recoverable_error', 'rejected', 'discarded'))
);
--> statement-breakpoint
CREATE TABLE "copilot_rate_limit_buckets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"actor_user_id" uuid NOT NULL,
	"operation" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"count" integer DEFAULT 0 NOT NULL,
	"limit" integer NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_rate_buckets_count_check" CHECK ("copilot_rate_limit_buckets"."count" >= 0),
	CONSTRAINT "copilot_rate_buckets_limit_check" CHECK ("copilot_rate_limit_buckets"."limit" > 0 and "copilot_rate_limit_buckets"."count" <= "copilot_rate_limit_buckets"."limit")
);
--> statement-breakpoint
CREATE TABLE "copilot_revision_targets" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"resource_type" text NOT NULL,
	"operation" text NOT NULL,
	"dependencies" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"execution_dependency" text,
	"canonical_id" uuid,
	"client_ref" text,
	"base_revision_id" uuid,
	"base_version" integer,
	"base_fingerprint" text,
	CONSTRAINT "copilot_targets_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_targets_ordinal_check" CHECK ("copilot_revision_targets"."ordinal" >= 0),
	CONSTRAINT "copilot_targets_resource_type_check" CHECK ("copilot_revision_targets"."resource_type" in ('series', 'bible', 'character', 'location', 'prop', 'episode_plan', 'scene', 'shot', 'paid_job')),
	CONSTRAINT "copilot_targets_operation_check" CHECK ("copilot_revision_targets"."operation" in ('create', 'update', 'archive', 'request')),
	CONSTRAINT "copilot_targets_identity_check" CHECK (("copilot_revision_targets"."operation" = 'create' and "copilot_revision_targets"."canonical_id" is null and "copilot_revision_targets"."client_ref" is not null) or ("copilot_revision_targets"."operation" <> 'create' and "copilot_revision_targets"."canonical_id" is not null)),
	CONSTRAINT "copilot_targets_execution_dependency_check" CHECK ("copilot_revision_targets"."execution_dependency" is null or "copilot_revision_targets"."execution_dependency" in ('independent', 'requires_application_receipt')),
	CONSTRAINT "copilot_targets_base_fingerprint_check" CHECK ("copilot_revision_targets"."base_fingerprint" is null or "copilot_revision_targets"."base_fingerprint" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
CREATE TABLE "copilot_validation_findings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"validation_run_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"ordinal" integer NOT NULL,
	"severity" text NOT NULL,
	"code" text NOT NULL,
	"target_ref" text,
	"field_path" text,
	"message" text NOT NULL,
	"remediation" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_findings_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_findings_ordinal_check" CHECK ("copilot_validation_findings"."ordinal" >= 0),
	CONSTRAINT "copilot_findings_severity_check" CHECK ("copilot_validation_findings"."severity" in ('warning', 'blocking'))
);
--> statement-breakpoint
CREATE TABLE "copilot_validation_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"revision_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"revision_fingerprint" text NOT NULL,
	"base_fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "copilot_validations_id_workspace_unique" UNIQUE("id","workspace_id"),
	CONSTRAINT "copilot_validations_id_revision_workspace_unique" UNIQUE("id","revision_id","workspace_id"),
	CONSTRAINT "copilot_validations_status_check" CHECK ("copilot_validation_runs"."status" in ('valid', 'valid_with_warnings', 'invalid', 'stale')),
	CONSTRAINT "copilot_validations_revision_fingerprint_check" CHECK ("copilot_validation_runs"."revision_fingerprint" ~ '^[0-9a-f]{64}$'),
	CONSTRAINT "copilot_validations_base_fingerprint_check" CHECK ("copilot_validation_runs"."base_fingerprint" ~ '^[0-9a-f]{64}$')
);
--> statement-breakpoint
ALTER TABLE "series" DROP CONSTRAINT "series_slug_unique";--> statement-breakpoint
ALTER TABLE "episode_plans" ADD CONSTRAINT "episode_plans_id_series_unique" UNIQUE("id","series_id");--> statement-breakpoint
ALTER TABLE "jobs" ADD CONSTRAINT "jobs_id_workspace_unique" UNIQUE("id","workspace_id");--> statement-breakpoint
ALTER TABLE "series" ADD CONSTRAINT "series_id_workspace_unique" UNIQUE("id","workspace_id");--> statement-breakpoint
ALTER TABLE "copilot_application_receipts" ADD CONSTRAINT "copilot_application_receipts_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_application_receipts" ADD CONSTRAINT "copilot_application_receipts_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_application_receipts" ADD CONSTRAINT "copilot_receipts_application_workspace_fk" FOREIGN KEY ("application_id","workspace_id") REFERENCES "public"."copilot_applications"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_application_receipts" ADD CONSTRAINT "copilot_receipts_approval_workspace_fk" FOREIGN KEY ("approval_id","revision_id","workspace_id") REFERENCES "public"."copilot_decisions"("id","revision_id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_application_receipts" ADD CONSTRAINT "copilot_receipts_revision_workspace_fk" FOREIGN KEY ("revision_id","workspace_id") REFERENCES "public"."copilot_proposal_revisions"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_applications" ADD CONSTRAINT "copilot_applications_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_applications" ADD CONSTRAINT "copilot_applications_requested_by_user_id_users_id_fk" FOREIGN KEY ("requested_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_applications" ADD CONSTRAINT "copilot_applications_approval_workspace_fk" FOREIGN KEY ("approval_id","workspace_id") REFERENCES "public"."copilot_decisions"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_context_snapshots" ADD CONSTRAINT "copilot_context_snapshots_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_context_snapshots" ADD CONSTRAINT "copilot_context_snapshots_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_context_snapshots" ADD CONSTRAINT "copilot_contexts_conversation_workspace_fk" FOREIGN KEY ("conversation_id","workspace_id") REFERENCES "public"."copilot_conversations"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_context_snapshots" ADD CONSTRAINT "copilot_contexts_series_workspace_fk" FOREIGN KEY ("series_id","workspace_id") REFERENCES "public"."series"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_context_snapshots" ADD CONSTRAINT "copilot_contexts_plan_series_fk" FOREIGN KEY ("episode_plan_id","series_id") REFERENCES "public"."episode_plans"("id","series_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_conversations" ADD CONSTRAINT "copilot_conversations_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_conversations" ADD CONSTRAINT "copilot_conversations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_cost_confirmations" ADD CONSTRAINT "copilot_cost_confirmations_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_cost_confirmations" ADD CONSTRAINT "copilot_cost_confirmations_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_cost_confirmations" ADD CONSTRAINT "copilot_confirmations_quote_workspace_fk" FOREIGN KEY ("quote_id","workspace_id") REFERENCES "public"."copilot_cost_quotes"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_cost_quotes" ADD CONSTRAINT "copilot_cost_quotes_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_cost_quotes" ADD CONSTRAINT "copilot_cost_quotes_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_cost_quotes" ADD CONSTRAINT "copilot_quotes_message_workspace_fk" FOREIGN KEY ("message_id","workspace_id") REFERENCES "public"."copilot_messages"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_cost_quotes" ADD CONSTRAINT "copilot_quotes_revision_workspace_fk" FOREIGN KEY ("revision_id","workspace_id") REFERENCES "public"."copilot_proposal_revisions"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_cost_quotes" ADD CONSTRAINT "copilot_quotes_approval_workspace_fk" FOREIGN KEY ("approval_id","revision_id","workspace_id") REFERENCES "public"."copilot_decisions"("id","revision_id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_decisions" ADD CONSTRAINT "copilot_decisions_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_decisions" ADD CONSTRAINT "copilot_decisions_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_decisions" ADD CONSTRAINT "copilot_decisions_revision_workspace_fk" FOREIGN KEY ("revision_id","workspace_id") REFERENCES "public"."copilot_proposal_revisions"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_decisions" ADD CONSTRAINT "copilot_decisions_validation_workspace_fk" FOREIGN KEY ("validation_run_id","revision_id","workspace_id") REFERENCES "public"."copilot_validation_runs"("id","revision_id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_events" ADD CONSTRAINT "copilot_events_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_events" ADD CONSTRAINT "copilot_events_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_events" ADD CONSTRAINT "copilot_events_conversation_workspace_fk" FOREIGN KEY ("conversation_id","workspace_id") REFERENCES "public"."copilot_conversations"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_inference_usage" ADD CONSTRAINT "copilot_inference_usage_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_inference_usage" ADD CONSTRAINT "copilot_inference_usage_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_inference_usage" ADD CONSTRAINT "copilot_inference_usage_prompt_snapshot_id_prompt_snapshots_id_fk" FOREIGN KEY ("prompt_snapshot_id") REFERENCES "public"."prompt_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_inference_usage" ADD CONSTRAINT "copilot_usage_conversation_workspace_fk" FOREIGN KEY ("conversation_id","workspace_id") REFERENCES "public"."copilot_conversations"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_inference_usage" ADD CONSTRAINT "copilot_usage_message_workspace_fk" FOREIGN KEY ("message_id","workspace_id") REFERENCES "public"."copilot_messages"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_inference_usage" ADD CONSTRAINT "copilot_usage_revision_workspace_fk" FOREIGN KEY ("revision_id","workspace_id") REFERENCES "public"."copilot_proposal_revisions"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_inference_usage" ADD CONSTRAINT "copilot_usage_confirmation_workspace_fk" FOREIGN KEY ("confirmation_id","workspace_id") REFERENCES "public"."copilot_cost_confirmations"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_job_bindings" ADD CONSTRAINT "copilot_job_bindings_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_job_bindings" ADD CONSTRAINT "copilot_job_bindings_confirmation_workspace_fk" FOREIGN KEY ("confirmation_id","workspace_id") REFERENCES "public"."copilot_cost_confirmations"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_job_bindings" ADD CONSTRAINT "copilot_job_bindings_job_workspace_fk" FOREIGN KEY ("job_id","workspace_id") REFERENCES "public"."jobs"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_messages" ADD CONSTRAINT "copilot_messages_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_messages" ADD CONSTRAINT "copilot_messages_conversation_workspace_fk" FOREIGN KEY ("conversation_id","workspace_id") REFERENCES "public"."copilot_conversations"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_messages" ADD CONSTRAINT "copilot_messages_context_workspace_fk" FOREIGN KEY ("context_snapshot_id","conversation_id","workspace_id") REFERENCES "public"."copilot_context_snapshots"("id","conversation_id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposal_revisions" ADD CONSTRAINT "copilot_proposal_revisions_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposal_revisions" ADD CONSTRAINT "copilot_proposal_revisions_prompt_snapshot_id_prompt_snapshots_id_fk" FOREIGN KEY ("prompt_snapshot_id") REFERENCES "public"."prompt_snapshots"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposal_revisions" ADD CONSTRAINT "copilot_proposal_revisions_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposal_revisions" ADD CONSTRAINT "copilot_revisions_proposal_workspace_fk" FOREIGN KEY ("proposal_id","workspace_id") REFERENCES "public"."copilot_proposals"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_conversation_workspace_fk" FOREIGN KEY ("conversation_id","workspace_id") REFERENCES "public"."copilot_conversations"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_context_workspace_fk" FOREIGN KEY ("context_snapshot_id","conversation_id","workspace_id") REFERENCES "public"."copilot_context_snapshots"("id","conversation_id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_rate_limit_buckets" ADD CONSTRAINT "copilot_rate_limit_buckets_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_rate_limit_buckets" ADD CONSTRAINT "copilot_rate_limit_buckets_actor_user_id_users_id_fk" FOREIGN KEY ("actor_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_revision_targets" ADD CONSTRAINT "copilot_revision_targets_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_revision_targets" ADD CONSTRAINT "copilot_targets_revision_workspace_fk" FOREIGN KEY ("revision_id","workspace_id") REFERENCES "public"."copilot_proposal_revisions"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_validation_findings" ADD CONSTRAINT "copilot_validation_findings_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_validation_findings" ADD CONSTRAINT "copilot_findings_validation_workspace_fk" FOREIGN KEY ("validation_run_id","workspace_id") REFERENCES "public"."copilot_validation_runs"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_validation_runs" ADD CONSTRAINT "copilot_validation_runs_workspace_id_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspace"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "copilot_validation_runs" ADD CONSTRAINT "copilot_validations_revision_workspace_fk" FOREIGN KEY ("revision_id","workspace_id") REFERENCES "public"."copilot_proposal_revisions"("id","workspace_id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_receipts_application_idx" ON "copilot_application_receipts" USING btree ("application_id");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_receipts_approval_idx" ON "copilot_application_receipts" USING btree ("approval_id");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_receipts_revision_idx" ON "copilot_application_receipts" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "copilot_receipts_workspace_committed_idx" ON "copilot_application_receipts" USING btree ("workspace_id","committed_at");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_applications_approval_idx" ON "copilot_applications" USING btree ("approval_id");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_applications_workspace_key_idx" ON "copilot_applications" USING btree ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "copilot_applications_workspace_status_idx" ON "copilot_applications" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE INDEX "copilot_contexts_conversation_created_idx" ON "copilot_context_snapshots" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE INDEX "copilot_contexts_workspace_series_idx" ON "copilot_context_snapshots" USING btree ("workspace_id","series_id");--> statement-breakpoint
CREATE INDEX "copilot_contexts_episode_plan_idx" ON "copilot_context_snapshots" USING btree ("episode_plan_id");--> statement-breakpoint
CREATE INDEX "copilot_conversations_workspace_updated_idx" ON "copilot_conversations" USING btree ("workspace_id","updated_at");--> statement-breakpoint
CREATE INDEX "copilot_conversations_creator_created_idx" ON "copilot_conversations" USING btree ("created_by_user_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_confirmations_quote_idx" ON "copilot_cost_confirmations" USING btree ("quote_id");--> statement-breakpoint
CREATE INDEX "copilot_confirmations_workspace_actor_idx" ON "copilot_cost_confirmations" USING btree ("workspace_id","actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_quotes_fingerprint_idx" ON "copilot_cost_quotes" USING btree ("workspace_id","quote_fingerprint");--> statement-breakpoint
CREATE INDEX "copilot_quotes_workspace_expires_idx" ON "copilot_cost_quotes" USING btree ("workspace_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_decisions_revision_idx" ON "copilot_decisions" USING btree ("revision_id");--> statement-breakpoint
CREATE INDEX "copilot_decisions_workspace_actor_idx" ON "copilot_decisions" USING btree ("workspace_id","actor_user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_events_conversation_sequence_idx" ON "copilot_events" USING btree ("conversation_id","sequence");--> statement-breakpoint
CREATE INDEX "copilot_events_workspace_created_idx" ON "copilot_events" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_usage_confirmation_idx" ON "copilot_inference_usage" USING btree ("confirmation_id");--> statement-breakpoint
CREATE INDEX "copilot_usage_workspace_created_idx" ON "copilot_inference_usage" USING btree ("workspace_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_job_bindings_confirmation_idx" ON "copilot_job_bindings" USING btree ("confirmation_id");--> statement-breakpoint
CREATE INDEX "copilot_job_bindings_job_idx" ON "copilot_job_bindings" USING btree ("job_id");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_job_bindings_workspace_key_idx" ON "copilot_job_bindings" USING btree ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "copilot_job_bindings_intent_idx" ON "copilot_job_bindings" USING btree ("workspace_id","intent_fingerprint");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_messages_conversation_sequence_idx" ON "copilot_messages" USING btree ("conversation_id","sequence");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_messages_client_key_idx" ON "copilot_messages" USING btree ("conversation_id","client_message_id") WHERE "copilot_messages"."client_message_id" is not null;--> statement-breakpoint
CREATE INDEX "copilot_messages_conversation_created_idx" ON "copilot_messages" USING btree ("conversation_id","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_revisions_number_idx" ON "copilot_proposal_revisions" USING btree ("proposal_id","revision_number");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_revisions_client_key_idx" ON "copilot_proposal_revisions" USING btree ("proposal_id","client_revision_id");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_revisions_fingerprint_idx" ON "copilot_proposal_revisions" USING btree ("proposal_id","fingerprint");--> statement-breakpoint
CREATE INDEX "copilot_revisions_proposal_created_idx" ON "copilot_proposal_revisions" USING btree ("proposal_id","created_at");--> statement-breakpoint
CREATE INDEX "copilot_proposals_conversation_status_idx" ON "copilot_proposals" USING btree ("conversation_id","status");--> statement-breakpoint
CREATE INDEX "copilot_proposals_workspace_status_idx" ON "copilot_proposals" USING btree ("workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_rate_buckets_scope_idx" ON "copilot_rate_limit_buckets" USING btree ("workspace_id","actor_user_id","operation","window_started_at");--> statement-breakpoint
CREATE INDEX "copilot_rate_buckets_expires_idx" ON "copilot_rate_limit_buckets" USING btree ("expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_targets_revision_ordinal_idx" ON "copilot_revision_targets" USING btree ("revision_id","ordinal");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_targets_revision_client_ref_idx" ON "copilot_revision_targets" USING btree ("revision_id","client_ref") WHERE "copilot_revision_targets"."client_ref" is not null;--> statement-breakpoint
CREATE INDEX "copilot_targets_canonical_idx" ON "copilot_revision_targets" USING btree ("resource_type","canonical_id");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_findings_run_ordinal_idx" ON "copilot_validation_findings" USING btree ("validation_run_id","ordinal");--> statement-breakpoint
CREATE INDEX "copilot_findings_run_severity_idx" ON "copilot_validation_findings" USING btree ("validation_run_id","severity");--> statement-breakpoint
CREATE UNIQUE INDEX "copilot_validations_exact_idx" ON "copilot_validation_runs" USING btree ("revision_id","revision_fingerprint","base_fingerprint");--> statement-breakpoint
CREATE INDEX "copilot_validations_revision_created_idx" ON "copilot_validation_runs" USING btree ("revision_id","created_at");--> statement-breakpoint
CREATE INDEX "jobs_workspace_status_created_idx" ON "jobs" USING btree ("workspace_id","status","created_at");--> statement-breakpoint
CREATE UNIQUE INDEX "series_workspace_slug_idx" ON "series" USING btree ("workspace_id","slug");--> statement-breakpoint
CREATE INDEX "series_workspace_status_idx" ON "series" USING btree ("workspace_id","status");--> statement-breakpoint
ALTER TABLE "copilot_proposals" ADD CONSTRAINT "copilot_proposals_current_revision_fk" FOREIGN KEY ("current_revision_id","id","workspace_id") REFERENCES "public"."copilot_proposal_revisions"("id","proposal_id","workspace_id") DEFERRABLE INITIALLY DEFERRED;
