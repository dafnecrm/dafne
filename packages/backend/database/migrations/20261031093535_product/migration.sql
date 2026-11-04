CREATE TABLE `product` (
	`id` varchar(36) PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`description` text,
	`price` decimal(10,2) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`deleted_at` timestamp(3),
	`created_by_id` varchar(36),
	`updated_by_id` varchar(36),
	CONSTRAINT `product_created_by_id_user_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `product_updated_by_id_user_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `product_deletedAt_idx` ON `product` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `product_name_idx` ON `product` (`name`);