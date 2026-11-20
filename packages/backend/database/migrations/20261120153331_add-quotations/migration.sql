CREATE TABLE "sales"."quotation" (
	"id" serial PRIMARY KEY,
	"status" text DEFAULT 'draft' NOT NULL,
	"notes" text,
	"customer_id" integer NOT NULL,
	"type_id" varchar(5) NOT NULL,
	"valid_until" date,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "sales"."quotation_item" (
	"quotation_id" integer,
	"product_id" integer NOT NULL,
	"quantity" numeric(18,6) NOT NULL,
	"uom_id" varchar(10) NOT NULL,
	"base_quantity" numeric(18,6) NOT NULL,
	"price" numeric(14,2) NOT NULL,
	"position" integer,
	CONSTRAINT "quotation_item_pkey" PRIMARY KEY("quotation_id","position")
);
--> statement-breakpoint
ALTER TABLE "sales"."sales_order" ADD COLUMN "quotation_id" integer;--> statement-breakpoint
CREATE INDEX "quotation_deletedAt_idx" ON "sales"."quotation" ("deleted_at");--> statement-breakpoint
CREATE INDEX "quotation_customerId_idx" ON "sales"."quotation" ("customer_id");--> statement-breakpoint
CREATE INDEX "quotation_typeId_idx" ON "sales"."quotation" ("type_id");--> statement-breakpoint
CREATE INDEX "quotation_item_productId_idx" ON "sales"."quotation_item" ("product_id");--> statement-breakpoint
CREATE INDEX "quotation_item_uomId_idx" ON "sales"."quotation_item" ("uom_id");--> statement-breakpoint
CREATE UNIQUE INDEX "sales_order_quotationId_idx" ON "sales"."sales_order" ("quotation_id");--> statement-breakpoint
ALTER TABLE "sales"."quotation" ADD CONSTRAINT "quotation_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "sales"."customer"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales"."quotation" ADD CONSTRAINT "quotation_type_id_sales_order_type_id_fkey" FOREIGN KEY ("type_id") REFERENCES "sales"."sales_order_type"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales"."quotation" ADD CONSTRAINT "quotation_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."quotation" ADD CONSTRAINT "quotation_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."quotation_item" ADD CONSTRAINT "quotation_item_quotation_id_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "sales"."quotation"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."quotation_item" ADD CONSTRAINT "quotation_item_product_id_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "sales"."product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."quotation_item" ADD CONSTRAINT "quotation_item_uom_id_uom_id_fkey" FOREIGN KEY ("uom_id") REFERENCES "sales"."uom"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales"."sales_order" ADD CONSTRAINT "sales_order_quotation_id_quotation_id_fkey" FOREIGN KEY ("quotation_id") REFERENCES "sales"."quotation"("id") ON DELETE RESTRICT;--> statement-breakpoint
-- "Tutti gli utenti" keeps doing everything, quotations included (as in group-permissions).
INSERT INTO "sales"."user_group_permission" ("group_id", "permission")
  SELECT "id", p FROM "auth"."user_group",
    unnest(ARRAY['Quotation.create','Quotation.update','Quotation.delete','Quotation.changeStatus']) AS p
  WHERE "all_users"
  ON CONFLICT DO NOTHING;
