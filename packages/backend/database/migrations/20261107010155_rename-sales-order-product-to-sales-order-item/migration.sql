ALTER TABLE "sales"."sales_order_product" RENAME TO "sales_order_item";--> statement-breakpoint
ALTER INDEX "sales"."sales_order_product_productId_idx" RENAME TO "sales_order_item_productId_idx";