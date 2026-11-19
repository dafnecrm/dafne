CREATE TABLE "sales"."product_uom" (
	"product_id" integer,
	"uom_id" varchar(10),
	"factor" numeric(20,10) NOT NULL,
	CONSTRAINT "product_uom_pkey" PRIMARY KEY("product_id","uom_id"),
	CONSTRAINT "product_uom_factor_positive" CHECK ("factor" > 0)
);
--> statement-breakpoint
CREATE TABLE "sales"."uom" (
	"id" varchar(10) PRIMARY KEY,
	"name" varchar(100) NOT NULL,
	"description" text,
	"kind" text NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "sales"."uom_conversion" (
	"from_uom_id" varchar(10),
	"to_uom_id" varchar(10),
	"factor" numeric(20,10) NOT NULL,
	CONSTRAINT "uom_conversion_pkey" PRIMARY KEY("from_uom_id","to_uom_id"),
	CONSTRAINT "uom_conversion_factor_positive" CHECK ("factor" > 0),
	CONSTRAINT "uom_conversion_distinct" CHECK ("from_uom_id" <> "to_uom_id")
);
--> statement-breakpoint
-- Known units, then the conversions between them (1 to = factor × from).
-- box and pack have no global factor: each product sets its own.
INSERT INTO "sales"."uom" ("id", "name", "kind") VALUES
  ('mg', 'milligram', 'weight'),
  ('g', 'gram', 'weight'),
  ('kg', 'kilogram', 'weight'),
  ('t', 'tonne', 'weight'),
  ('oz', 'ounce', 'weight'),
  ('lb', 'pound', 'weight'),
  ('ml', 'millilitre', 'volume'),
  ('cl', 'centilitre', 'volume'),
  ('l', 'litre', 'volume'),
  ('m3', 'cubic metre', 'volume'),
  ('mm', 'millimetre', 'length'),
  ('cm', 'centimetre', 'length'),
  ('m', 'metre', 'length'),
  ('km', 'kilometre', 'length'),
  ('m2', 'square metre', 'area'),
  ('pc', 'piece', 'count'),
  ('dz', 'dozen', 'count'),
  ('box', 'box', 'count'),
  ('pack', 'pack', 'count'),
  ('min', 'minute', 'time'),
  ('h', 'hour', 'time'),
  ('d', 'day', 'time');--> statement-breakpoint
INSERT INTO "sales"."uom_conversion" ("from_uom_id", "to_uom_id", "factor") VALUES
  ('mg', 'g', 1000),
  ('g', 'kg', 1000),
  ('kg', 't', 1000),
  ('g', 'oz', 28.349523125),
  ('g', 'lb', 453.59237),
  ('ml', 'cl', 10),
  ('ml', 'l', 1000),
  ('l', 'm3', 1000),
  ('mm', 'cm', 10),
  ('cm', 'm', 100),
  ('m', 'km', 1000),
  ('pc', 'dz', 12),
  ('min', 'h', 60),
  ('h', 'd', 24);--> statement-breakpoint
-- Existing products are sold by the piece; new ones pick their unit.
ALTER TABLE "sales"."product" ADD COLUMN "uom_id" varchar(10) DEFAULT 'pc' NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."product" ALTER COLUMN "uom_id" DROP DEFAULT;--> statement-breakpoint
-- Existing items were in their product's unit: the base quantity is the quantity.
ALTER TABLE "sales"."sales_order_item" ALTER COLUMN "quantity" SET DATA TYPE numeric(18,6) USING "quantity"::numeric(18,6);--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" ADD COLUMN "uom_id" varchar(10);--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" ADD COLUMN "base_quantity" numeric(18,6);--> statement-breakpoint
UPDATE "sales"."sales_order_item" AS "item" SET "uom_id" = "product"."uom_id", "base_quantity" = "item"."quantity"
  FROM "sales"."product" WHERE "product"."id" = "item"."product_id";--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" ALTER COLUMN "uom_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" ALTER COLUMN "base_quantity" SET NOT NULL;--> statement-breakpoint
-- "Tutti gli utenti" keeps doing everything, units included (as in group-permissions).
INSERT INTO "sales"."user_group_permission" ("group_id", "permission")
  SELECT "id", p FROM "sales"."user_group",
    unnest(ARRAY['Uom.create','Uom.update','Uom.delete']) AS p
  WHERE "all_users"
  ON CONFLICT DO NOTHING;--> statement-breakpoint
CREATE INDEX "product_uomId_idx" ON "sales"."product" ("uom_id");--> statement-breakpoint
CREATE INDEX "product_uom_uomId_idx" ON "sales"."product_uom" ("uom_id");--> statement-breakpoint
CREATE INDEX "sales_order_item_uomId_idx" ON "sales"."sales_order_item" ("uom_id");--> statement-breakpoint
CREATE INDEX "uom_deletedAt_idx" ON "sales"."uom" ("deleted_at");--> statement-breakpoint
CREATE INDEX "uom_conversion_toUomId_idx" ON "sales"."uom_conversion" ("to_uom_id");--> statement-breakpoint
ALTER TABLE "sales"."product" ADD CONSTRAINT "product_uom_id_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "sales"."uom"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales"."product_uom" ADD CONSTRAINT "product_uom_product_id_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "sales"."product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product_uom" ADD CONSTRAINT "product_uom_uom_id_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "sales"."uom"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" ADD CONSTRAINT "sales_order_item_uom_id_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "sales"."uom"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales"."uom" ADD CONSTRAINT "uom_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."uom" ADD CONSTRAINT "uom_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" ADD CONSTRAINT "uom_conversion_from_uom_id_uom_id_fkey" FOREIGN KEY ("from_uom_id") REFERENCES "sales"."uom"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."uom_conversion" ADD CONSTRAINT "uom_conversion_to_uom_id_uom_id_fkey" FOREIGN KEY ("to_uom_id") REFERENCES "sales"."uom"("id") ON DELETE CASCADE;