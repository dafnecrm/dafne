ALTER TABLE "sales"."sales_order_item" ADD COLUMN "price" numeric(18,6);--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" ADD COLUMN "total" numeric(14,2);--> statement-breakpoint
-- Existing items: today's product price, by the item's unit factor (base quantity / quantity).
UPDATE "sales"."sales_order_item" AS "item"
  SET "price" = round("product"."price" * "item"."base_quantity" / "item"."quantity", 6),
      "total" = round("product"."price" * "item"."base_quantity", 2)
  FROM "sales"."product" WHERE "product"."id" = "item"."product_id";--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" ALTER COLUMN "price" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" ALTER COLUMN "total" SET NOT NULL;
