ALTER TABLE "sales"."quotation" ADD COLUMN "accepted_at" date;--> statement-breakpoint
ALTER TABLE "sales"."quotation" ADD COLUMN "rejected_at" date;--> statement-breakpoint
ALTER TABLE "sales"."quotation" ALTER COLUMN "valid_until" SET NOT NULL;