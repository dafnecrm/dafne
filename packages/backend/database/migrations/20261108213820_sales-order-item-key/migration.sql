ALTER TABLE "sales"."sales_order_item" RENAME CONSTRAINT "order_product_pkey" TO "sales_order_item_pkey";--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" DROP CONSTRAINT "sales_order_item_pkey";--> statement-breakpoint
ALTER TABLE "sales"."sales_order_item" ADD PRIMARY KEY ("order_id","position");