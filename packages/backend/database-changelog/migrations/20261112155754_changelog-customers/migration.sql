-- Customers get a partition of the change log of their own (docs/databases.md).
-- Written by the CLI (dafne g backend-changelog --partition): drizzle-kit
-- can't create partitions.
-- change_default holds its rows already: they move to the new partition
-- (in the migration's transaction, with the table locked).
ALTER TABLE "changelog"."change" DETACH PARTITION "changelog"."change_default";
--> statement-breakpoint
CREATE TABLE "changelog"."change_customers" PARTITION OF "changelog"."change" FOR VALUES IN ('customers');
--> statement-breakpoint
INSERT INTO "changelog"."change" SELECT * FROM "changelog"."change_default" WHERE "resource" = 'customers';
--> statement-breakpoint
DELETE FROM "changelog"."change_default" WHERE "resource" = 'customers';
--> statement-breakpoint
ALTER TABLE "changelog"."change" ATTACH PARTITION "changelog"."change_default" DEFAULT;
