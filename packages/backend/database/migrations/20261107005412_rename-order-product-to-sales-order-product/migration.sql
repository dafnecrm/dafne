ALTER TABLE "sales"."order_product" RENAME TO "sales_order_product";--> statement-breakpoint
ALTER INDEX "sales"."order_product_productId_idx" RENAME TO "sales_order_product_productId_idx";