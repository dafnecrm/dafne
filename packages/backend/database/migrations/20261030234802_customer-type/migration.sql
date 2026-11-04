ALTER TABLE `customer` ADD `type` enum('person','company') DEFAULT 'company' NOT NULL;--> statement-breakpoint
ALTER TABLE `customer` ADD `birth_date` date;--> statement-breakpoint
ALTER TABLE `customer` ADD `fiscal_code` varchar(16);--> statement-breakpoint
ALTER TABLE `customer` ADD `vat_number` varchar(13);