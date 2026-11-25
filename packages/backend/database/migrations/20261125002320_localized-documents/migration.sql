ALTER TABLE "sales"."customer" ADD COLUMN "language" text;--> statement-breakpoint
ALTER TABLE "sales"."document_template" ADD COLUMN "language" text DEFAULT 'it' NOT NULL;--> statement-breakpoint
DROP INDEX "sales"."document_template_resource_idx";--> statement-breakpoint
CREATE INDEX "document_template_resource_idx" ON "sales"."document_template" ("resource","language");--> statement-breakpoint
DROP INDEX "sales"."document_template_default_uq";--> statement-breakpoint
CREATE UNIQUE INDEX "document_template_default_uq" ON "sales"."document_template" ("resource","language") WHERE "is_default" and "deleted_at" is null;