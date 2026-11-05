CREATE SCHEMA "sales";
--> statement-breakpoint
CREATE TABLE "sales"."activity" (
	"id" varchar(36) PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"type" text NOT NULL,
	"due_date" timestamp(3) with time zone,
	"status" text DEFAULT 'open' NOT NULL,
	"completed_at" timestamp(3) with time zone,
	"completed_by_id" varchar(36),
	"notes" text,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "sales"."country" (
	"id" varchar(2) PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "sales"."customer" (
	"id" varchar(36) PRIMARY KEY,
	"type" text NOT NULL,
	"name" varchar(255) NOT NULL,
	"birth_date" date,
	"fiscal_code" varchar(16),
	"vat_number" varchar(13),
	"email" varchar(255) NOT NULL,
	"phone" varchar(32),
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "sales"."customer_address" (
	"id" varchar(36) PRIMARY KEY,
	"customer_id" varchar(36) NOT NULL,
	"position" integer NOT NULL,
	"type" text NOT NULL,
	"street" varchar(255) NOT NULL,
	"city" varchar(100) NOT NULL,
	"postal_code" varchar(20),
	"region" varchar(100),
	"country_code" varchar(2) NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sales"."order" (
	"id" varchar(36) PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"notes" text,
	"customer_id" varchar(36) NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE TABLE "sales"."order_product" (
	"order_id" varchar(36),
	"product_id" varchar(36),
	CONSTRAINT "order_product_pkey" PRIMARY KEY("order_id","product_id")
);
--> statement-breakpoint
CREATE TABLE "sales"."product" (
	"id" varchar(36) PRIMARY KEY,
	"name" varchar(255) NOT NULL,
	"description" text,
	"price" numeric(10,2) NOT NULL,
	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
	"deleted_at" timestamp(3) with time zone,
	"created_by_id" varchar(36),
	"updated_by_id" varchar(36)
);
--> statement-breakpoint
CREATE INDEX "activity_deletedAt_idx" ON "sales"."activity" ("deleted_at");--> statement-breakpoint
CREATE INDEX "activity_name_idx" ON "sales"."activity" ("name");--> statement-breakpoint
CREATE INDEX "activity_completedById_idx" ON "sales"."activity" ("completed_by_id");--> statement-breakpoint
CREATE INDEX "country_deletedAt_idx" ON "sales"."country" ("deleted_at");--> statement-breakpoint
CREATE INDEX "country_name_idx" ON "sales"."country" ("name");--> statement-breakpoint
CREATE INDEX "customer_deletedAt_idx" ON "sales"."customer" ("deleted_at");--> statement-breakpoint
CREATE INDEX "customer_name_idx" ON "sales"."customer" ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_email_unique_idx" ON "sales"."customer" ("email");--> statement-breakpoint
CREATE INDEX "customer_address_customerId_idx" ON "sales"."customer_address" ("customer_id");--> statement-breakpoint
CREATE UNIQUE INDEX "customer_address_customerId_type_idx" ON "sales"."customer_address" ("customer_id","type");--> statement-breakpoint
CREATE INDEX "order_deletedAt_idx" ON "sales"."order" ("deleted_at");--> statement-breakpoint
CREATE INDEX "order_name_idx" ON "sales"."order" ("name");--> statement-breakpoint
CREATE INDEX "order_customerId_idx" ON "sales"."order" ("customer_id");--> statement-breakpoint
CREATE INDEX "order_product_productId_idx" ON "sales"."order_product" ("product_id");--> statement-breakpoint
CREATE INDEX "product_deletedAt_idx" ON "sales"."product" ("deleted_at");--> statement-breakpoint
CREATE INDEX "product_name_idx" ON "sales"."product" ("name");--> statement-breakpoint
ALTER TABLE "sales"."activity" ADD CONSTRAINT "activity_completed_by_id_user_id_fkey" FOREIGN KEY ("completed_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."activity" ADD CONSTRAINT "activity_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."activity" ADD CONSTRAINT "activity_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."country" ADD CONSTRAINT "country_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."country" ADD CONSTRAINT "country_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."customer" ADD CONSTRAINT "customer_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."customer" ADD CONSTRAINT "customer_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."customer_address" ADD CONSTRAINT "customer_address_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "sales"."customer"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."customer_address" ADD CONSTRAINT "customer_address_country_code_country_id_fkey" FOREIGN KEY ("country_code") REFERENCES "sales"."country"("id");--> statement-breakpoint
ALTER TABLE "sales"."order" ADD CONSTRAINT "order_customer_id_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "sales"."customer"("id") ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE "sales"."order" ADD CONSTRAINT "order_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."order" ADD CONSTRAINT "order_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."order_product" ADD CONSTRAINT "order_product_order_id_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "sales"."order"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."order_product" ADD CONSTRAINT "order_product_product_id_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "sales"."product"("id") ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE "sales"."product" ADD CONSTRAINT "product_created_by_id_user_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE "sales"."product" ADD CONSTRAINT "product_updated_by_id_user_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "auth"."user"("id") ON DELETE SET NULL;