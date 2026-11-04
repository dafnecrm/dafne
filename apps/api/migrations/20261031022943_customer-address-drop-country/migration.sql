ALTER TABLE `customer_address` MODIFY COLUMN `country_code` varchar(2) NOT NULL;--> statement-breakpoint
ALTER TABLE `customer_address` DROP COLUMN `country`;