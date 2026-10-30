ALTER TABLE `customer_address` RENAME COLUMN `label` TO `type`;--> statement-breakpoint
ALTER TABLE `customer_address` MODIFY COLUMN `type` enum('head_office','shipping','billing');