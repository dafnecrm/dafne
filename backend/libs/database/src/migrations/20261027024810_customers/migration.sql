CREATE TABLE `customer` (
	`id` varchar(36) PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`email` varchar(255),
	`phone` varchar(32),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`deleted_at` timestamp(3),
	`created_by_id` varchar(36),
	`updated_by_id` varchar(36)
);
--> statement-breakpoint
CREATE TABLE `customer_address` (
	`id` varchar(36) PRIMARY KEY,
	`customer_id` varchar(36) NOT NULL,
	`position` int NOT NULL,
	`label` varchar(100),
	`street` varchar(255) NOT NULL,
	`city` varchar(100) NOT NULL,
	`postal_code` varchar(20),
	`region` varchar(100),
	`country` varchar(100) NOT NULL
);
--> statement-breakpoint
CREATE INDEX `customer_deletedAt_idx` ON `customer` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `customer_name_idx` ON `customer` (`name`);--> statement-breakpoint
CREATE INDEX `customer_address_customerId_idx` ON `customer_address` (`customer_id`);--> statement-breakpoint
ALTER TABLE `customer` ADD CONSTRAINT `customer_created_by_id_user_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `customer` ADD CONSTRAINT `customer_updated_by_id_user_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `customer_address` ADD CONSTRAINT `customer_address_customer_id_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE CASCADE;