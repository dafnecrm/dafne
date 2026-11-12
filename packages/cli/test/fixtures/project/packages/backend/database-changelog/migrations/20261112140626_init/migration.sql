-- The change log: one table, partitioned by resource (LIST). A resource
-- without its own partition goes to change_default, so a new resource
-- needs no migration; a big one gets its own partition (docs/databases.md).
-- Written by hand: drizzle-kit can't create partitioned tables
-- (src/change.ts mirrors it, for queries).
CREATE SCHEMA "changelog";
--> statement-breakpoint
CREATE TABLE "changelog"."change" (
	"id" bigserial NOT NULL,
	"resource" text NOT NULL,
	"record_id" text NOT NULL,
	"operation" text NOT NULL,
	"changes" jsonb NOT NULL,
	"actor_id" text,
	"changed_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "change_pkey" PRIMARY KEY ("resource", "id"),
	CONSTRAINT "change_actor_id_user_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL
) PARTITION BY LIST ("resource");
--> statement-breakpoint
CREATE INDEX "change_record_idx" ON "changelog"."change" ("resource", "record_id", "id" DESC);
--> statement-breakpoint
CREATE TABLE "changelog"."change_default" PARTITION OF "changelog"."change" DEFAULT;
--> statement-breakpoint
CREATE TABLE "changelog"."change_sales_orders" PARTITION OF "changelog"."change" FOR VALUES IN ('sales-orders');
