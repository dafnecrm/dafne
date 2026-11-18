CREATE TABLE "sales"."assistant_agent_group" (
	"agent_id" integer,
	"group_id" integer,
	CONSTRAINT "assistant_agent_group_pkey" PRIMARY KEY("agent_id","group_id")
);
--> statement-breakpoint
CREATE TABLE "sales"."user_group" (
	"id" serial PRIMARY KEY,
	"name" varchar(100) NOT NULL UNIQUE,
	"description" text,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "sales"."user_group_member" (
	"group_id" integer,
	"user_id" varchar(36),
	CONSTRAINT "user_group_member_pkey" PRIMARY KEY("group_id","user_id")
);
--> statement-breakpoint
ALTER TABLE "sales"."assistant_agent" ADD COLUMN "audience" text DEFAULT 'everyone' NOT NULL;--> statement-breakpoint
CREATE INDEX "assistant_agent_group_groupId_idx" ON "sales"."assistant_agent_group" ("group_id");--> statement-breakpoint
CREATE INDEX "user_group_deletedAt_idx" ON "sales"."user_group" ("deleted_at");--> statement-breakpoint
CREATE INDEX "user_group_member_userId_idx" ON "sales"."user_group_member" ("user_id");--> statement-breakpoint
ALTER TABLE "sales"."assistant_agent_group" ADD CONSTRAINT "assistant_agent_group_agent_id_assistant_agent_id_fkey" FOREIGN KEY ("agent_id") REFERENCES "sales"."assistant_agent"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."assistant_agent_group" ADD CONSTRAINT "assistant_agent_group_group_id_user_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "sales"."user_group"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."user_group" ADD CONSTRAINT "user_group_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."user_group" ADD CONSTRAINT "user_group_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."user_group_member" ADD CONSTRAINT "user_group_member_group_id_user_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "sales"."user_group"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."user_group_member" ADD CONSTRAINT "user_group_member_user_id_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "auth"."user"("id") ON DELETE CASCADE;