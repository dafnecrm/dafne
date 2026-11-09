CREATE TABLE "sales"."sales_order_type" (
	"id" varchar(5) PRIMARY KEY,
	"description" varchar(255) NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
ALTER TABLE "sales"."sales_order" ADD COLUMN "type" varchar(5) NOT NULL;--> statement-breakpoint
CREATE INDEX "sales_order_type_deletedAt_idx" ON "sales"."sales_order_type" ("deleted_at");--> statement-breakpoint
ALTER TABLE "sales"."sales_order_type" ADD CONSTRAINT "sales_order_type_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_order_type" ADD CONSTRAINT "sales_order_type_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."sales_order" ADD CONSTRAINT "sales_order_type_sales_order_type_id_fkey" FOREIGN KEY ("type") REFERENCES "sales"."sales_order_type"("id") ON DELETE RESTRICT;

INSERT INTO "sales"."sales_order_type" (id, description) VALUES ('00001', 'Default sales order type');