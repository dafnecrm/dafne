ALTER TABLE `customer` MODIFY COLUMN `type` enum('person','company') NOT NULL;--> statement-breakpoint
-- Customers without an email get a unique placeholder, to be replaced by hand.
UPDATE `customer` SET `email` = CONCAT(`id`, '@example.invalid') WHERE `email` IS NULL OR `email` = '';--> statement-breakpoint
ALTER TABLE `customer` MODIFY COLUMN `email` varchar(255) NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `customer_email_unique_idx` ON `customer` (`email`);
