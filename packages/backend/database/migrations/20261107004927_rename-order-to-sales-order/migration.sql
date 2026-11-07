ALTER TABLE "sales"."order" RENAME TO "sales_order";--> statement-breakpoint
ALTER INDEX "sales"."order_deletedAt_idx" RENAME TO "sales_order_deletedAt_idx";--> statement-breakpoint
ALTER INDEX "sales"."order_customerId_idx" RENAME TO "sales_order_customerId_idx";