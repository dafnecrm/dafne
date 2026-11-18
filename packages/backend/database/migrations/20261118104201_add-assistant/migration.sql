CREATE TABLE "sales"."assistant_agent" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL UNIQUE,
	"description" text,
	"system_prompt" text NOT NULL,
	"tools" jsonb DEFAULT '[]' NOT NULL,
	"default_model_id" integer,
	"allow_model_override" boolean DEFAULT true NOT NULL,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "sales"."assistant_action" (
	"id" serial PRIMARY KEY,
	"conversation_id" integer NOT NULL,
	"tool_call_id" varchar(100) NOT NULL,
	"kind" varchar(100) NOT NULL,
	"payload" jsonb NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"result" jsonb,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"decided_at" timestamp(3) with time zone
);
--> statement-breakpoint
CREATE TABLE "sales"."assistant_conversation" (
	"id" serial PRIMARY KEY,
	"user_id" varchar(36) NOT NULL,
	"agent_id" integer NOT NULL,
	"model_id" integer,
	"title" varchar(200),
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales"."assistant_message" (
	"id" serial PRIMARY KEY,
	"conversation_id" integer NOT NULL,
	"role" text NOT NULL,
	"content" jsonb NOT NULL,
	"note" boolean DEFAULT false NOT NULL,
	"model_id" integer,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales"."assistant_model" (
	"id" serial PRIMARY KEY,
	"provider_id" integer NOT NULL,
	"model_id" varchar(200) NOT NULL,
	"label" varchar(200) NOT NULL,
	"supports_tools" boolean DEFAULT true NOT NULL,
	"options" jsonb,
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "sales"."assistant_provider" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL UNIQUE,
	"kind" text NOT NULL,
	"base_url" varchar(500),
	"api_key_env" varchar(100),
	"enabled" boolean DEFAULT false NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE INDEX "assistant_agent_deletedAt_idx" ON "sales"."assistant_agent" ("deleted_at");--> statement-breakpoint
CREATE INDEX "assistant_agent_defaultModelId_idx" ON "sales"."assistant_agent" ("default_model_id");--> statement-breakpoint
CREATE INDEX "assistant_action_conversationId_idx" ON "sales"."assistant_action" ("conversation_id");--> statement-breakpoint
CREATE INDEX "assistant_conversation_userId_idx" ON "sales"."assistant_conversation" ("user_id","updated_at");--> statement-breakpoint
CREATE INDEX "assistant_message_conversationId_idx" ON "sales"."assistant_message" ("conversation_id","id");--> statement-breakpoint
CREATE INDEX "assistant_model_deletedAt_idx" ON "sales"."assistant_model" ("deleted_at");--> statement-breakpoint
CREATE INDEX "assistant_model_providerId_idx" ON "sales"."assistant_model" ("provider_id");--> statement-breakpoint
CREATE INDEX "assistant_provider_deletedAt_idx" ON "sales"."assistant_provider" ("deleted_at");--> statement-breakpoint
ALTER TABLE "sales"."assistant_agent" ADD CONSTRAINT "assistant_agent_default_model_id_assistant_model_id_fkey" FOREIGN KEY ("default_model_id") REFERENCES "sales"."assistant_model"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."assistant_agent" ADD CONSTRAINT "assistant_agent_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."assistant_agent" ADD CONSTRAINT "assistant_agent_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."assistant_action" ADD CONSTRAINT "assistant_action_conversation_id_assistant_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "sales"."assistant_conversation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."assistant_conversation" ADD CONSTRAINT "assistant_conversation_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."assistant_conversation" ADD CONSTRAINT "assistant_conversation_agent_id_assistant_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "sales"."assistant_agent"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."assistant_conversation" ADD CONSTRAINT "assistant_conversation_model_id_assistant_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "sales"."assistant_model"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."assistant_message" ADD CONSTRAINT "assistant_message_wmFaFM0VgVln_fkey" FOREIGN KEY ("conversation_id") REFERENCES "sales"."assistant_conversation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."assistant_message" ADD CONSTRAINT "assistant_message_model_id_assistant_model_id_fkey" FOREIGN KEY ("model_id") REFERENCES "sales"."assistant_model"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."assistant_model" ADD CONSTRAINT "assistant_model_provider_id_assistant_provider_id_fkey" FOREIGN KEY ("provider_id") REFERENCES "sales"."assistant_provider"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."assistant_model" ADD CONSTRAINT "assistant_model_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."assistant_model" ADD CONSTRAINT "assistant_model_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."assistant_provider" ADD CONSTRAINT "assistant_provider_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."assistant_provider" ADD CONSTRAINT "assistant_provider_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
-- Starting settings of the AI assistant, all disabled until a super-admin
-- turns them on: an Anthropic provider (key in sales-api's ANTHROPIC_API_KEY),
-- a local Ollama, a model on each, and the sales agent with every tool.
INSERT INTO "sales"."assistant_provider" ("name", "kind", "base_url", "api_key_env", "enabled") VALUES
  ('Anthropic', 'anthropic', NULL, 'ANTHROPIC_API_KEY', false),
  ('Ollama (locale)', 'openai-compatible', 'http://localhost:11434/v1', NULL, false);--> statement-breakpoint
INSERT INTO "sales"."assistant_model" ("provider_id", "model_id", "label", "supports_tools", "options", "enabled")
  SELECT "id", 'claude-opus-5-5', 'Claude Opus 5.5', true, '{"reasoning":"low"}'::jsonb, false
  FROM "sales"."assistant_provider" WHERE "name" = 'Anthropic';--> statement-breakpoint
INSERT INTO "sales"."assistant_model" ("provider_id", "model_id", "label", "supports_tools", "options", "enabled")
  SELECT "id", 'qwen3:8b', 'Qwen3 8B (locale)', true, '{"reasoning":"none"}'::jsonb, false
  FROM "sales"."assistant_provider" WHERE "name" = 'Ollama (locale)';--> statement-breakpoint
INSERT INTO "sales"."assistant_agent" ("name", "description", "system_prompt", "tools", "default_model_id", "allow_model_override", "enabled")
  SELECT 'Assistente vendite',
    'Cerca clienti, ordini, attività e prodotti; propone nuovi clienti e attività.',
    'Aiuti i commerciali: rispondi a domande su clienti, ordini, attività e prodotti, e proponi le modifiche che ti chiedono.',
    '["search_customers","get_customer","list_sales_orders","get_sales_order","list_activities","get_activity","list_products","get_product","propose_create_customer","propose_update_customer","propose_create_activity","propose_close_activity","propose_change_sales_order_status","propose_create_sales_order"]'::jsonb,
    "id", true, false
  FROM "sales"."assistant_model" WHERE "model_id" = 'qwen3:8b';
