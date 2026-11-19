-- The item's price is its amount (the product's price × the base quantity), which was "total".
UPDATE "sales"."sales_order_item" SET "price" = "total";--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" DROP COLUMN "total";--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" ALTER COLUMN "price" SET DATA TYPE numeric(14,2) USING "price"::numeric(14,2);
