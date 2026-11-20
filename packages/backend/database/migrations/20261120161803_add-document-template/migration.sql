CREATE TABLE "sales"."document_template" (
	"id" serial PRIMARY KEY,
	"name" varchar(120) NOT NULL,
	"resource" varchar(60) NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"file_name" varchar(255),
	"size" integer,
	"content" bytea,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE INDEX "document_template_deletedAt_idx" ON "sales"."document_template" ("deleted_at");--> statement-breakpoint
CREATE INDEX "document_template_resource_idx" ON "sales"."document_template" ("resource");--> statement-breakpoint
CREATE UNIQUE INDEX "document_template_default_uq" ON "sales"."document_template" ("resource") WHERE "is_default" and "deleted_at" is null;--> statement-breakpoint
ALTER TABLE "sales"."document_template" ADD CONSTRAINT "document_template_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."document_template" ADD CONSTRAINT "document_template_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;