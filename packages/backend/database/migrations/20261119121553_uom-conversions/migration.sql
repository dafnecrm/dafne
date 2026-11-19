ALTER TABLE "sales"."product_uom" DROP CONSTRAINT "product_uom_factor_positive";--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" ADD COLUMN "id" serial;--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" ADD COLUMN "created_at" timestamp(3) with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" ADD COLUMN "updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" ADD COLUMN "deleted_at" timestamp(3) with time zone;--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" ADD COLUMN "created_by_id" varchar(36);--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" ADD COLUMN "updated_by_id" varchar(36);--> statement-breakpoint
ALTER TABLE "sales"."product_uom" DROP COLUMN "factor";--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" DROP CONSTRAINT "uom_conversion_pkey";--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" ADD PRIMARY KEY ("id");--> statement-breakpoint
CREATE INDEX "uom_conversion_deletedAt_idx" ON "sales"."uom_conversion" ("deleted_at");--> statement-breakpoint
CREATE INDEX "uom_conversion_fromUomId_idx" ON "sales"."uom_conversion" ("from_uom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "uom_conversion_pair_idx" ON "sales"."uom_conversion" (least("from_uom_id", "to_uom_id"),greatest("from_uom_id", "to_uom_id")) WHERE "deleted_at" is null;--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" ADD CONSTRAINT "uom_conversion_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" ADD CONSTRAINT "uom_conversion_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" DROP CONSTRAINT "uom_conversion_from_uom_id_uom_id_fkey", ADD CONSTRAINT "uom_conversion_from_uom_id_uom_id_fkey" FOREIGN KEY ("from_uom_id") REFERENCES "sales"."uom"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" DROP CONSTRAINT "uom_conversion_to_uom_id_uom_id_fkey", ADD CONSTRAINT "uom_conversion_to_uom_id_uom_id_fkey" FOREIGN KEY ("to_uom_id") REFERENCES "sales"."uom"("id") ON DELETE RESTRICT;--> statement-breakpoint
-- "Tutti gli utenti" keeps doing everything, conversions included (as in group-permissions).
INSERT INTO "sales"."user_group_permission" ("group_id", "permission")
  SELECT "id", p FROM "sales"."user_group",
    unnest(ARRAY['UomConversion.create','UomConversion.update','UomConversion.delete']) AS p
  WHERE "all_users"
  ON CONFLICT DO NOTHING;
