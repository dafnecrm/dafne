CREATE SCHEMA "tasks";
--> statement-breakpoint
CREATE TABLE "tasks"."task" (
	"key" text PRIMARY KEY,
	"cron" text,
	"timezone" text DEFAULT 'Europe/Rome' NOT NULL,
	"enabled" boolean DEFAULT true NOT NULL,
	"timeout_seconds" integer,
	"customized" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_by" text
);
--> statement-breakpoint
CREATE TABLE "tasks"."task_run" (
	"id" bigserial PRIMARY KEY,
	"task_key" text NOT NULL,
	"status" text NOT NULL,
	"trigger" text NOT NULL,
	"triggered_by" text,
	"source" text,
	"job_id" text,
	"payload" jsonb,
	"result" jsonb,
	"error" text,
	"error_stack" text,
	"queued_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"started_at" timestamp(3) with time zone,
	"finished_at" timestamp(3) with time zone
);
--> statement-breakpoint
CREATE TABLE "tasks"."task_run_log" (
	"id" bigserial PRIMARY KEY,
	"run_id" bigint NOT NULL,
	"at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"level" text NOT NULL,
	"message" text NOT NULL,
	"data" jsonb
);
--> statement-breakpoint
CREATE UNIQUE INDEX "task_run_active_idx" ON "tasks"."task_run" ("task_key") WHERE "status" in ('queued', 'running');--> statement-breakpoint
CREATE INDEX "task_run_task_idx" ON "tasks"."task_run" ("task_key","id" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "task_run_queued_at_idx" ON "tasks"."task_run" ("queued_at");--> statement-breakpoint
CREATE INDEX "task_run_log_run_idx" ON "tasks"."task_run_log" ("run_id","id");--> statement-breakpoint
ALTER TABLE "tasks"."task" ADD CONSTRAINT "task_updated_by_user_id_fkey" FOREIGN KEY ("updated_by") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks"."task_run" ADD CONSTRAINT "task_run_task_key_task_key_fkey" FOREIGN KEY ("task_key") REFERENCES "tasks"."task"("key") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "tasks"."task_run" ADD CONSTRAINT "task_run_triggered_by_user_id_fkey" FOREIGN KEY ("triggered_by") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "tasks"."task_run_log" ADD CONSTRAINT "task_run_log_run_id_task_run_id_fkey" FOREIGN KEY ("run_id") REFERENCES "tasks"."task_run"("id") ON DELETE CASCADE;