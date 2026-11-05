CREATE TABLE `order` (
	`id` varchar(36) PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`notes` text,
	`customer_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`deleted_at` timestamp(3),
	`created_by_id` varchar(36),
	`updated_by_id` varchar(36)
);
--> statement-breakpoint
CREATE TABLE `order_product` (
	`order_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	CONSTRAINT PRIMARY KEY(`order_id`,`product_id`)
);
--> statement-breakpoint
CREATE INDEX `order_deletedAt_idx` ON `order` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `order_name_idx` ON `order` (`name`);--> statement-breakpoint
CREATE INDEX `order_customerId_idx` ON `order` (`customer_id`);--> statement-breakpoint
CREATE INDEX `order_product_productId_idx` ON `order_product` (`product_id`);--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_customer_id_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customer`(`id`) ON DELETE RESTRICT;--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_created_by_id_user_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `dafne_auth`.`user`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `order` ADD CONSTRAINT `order_updated_by_id_user_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `dafne_auth`.`user`(`id`) ON DELETE SET NULL;--> statement-breakpoint
ALTER TABLE `order_product` ADD CONSTRAINT `order_product_order_id_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `order`(`id`) ON DELETE CASCADE;--> statement-breakpoint
ALTER TABLE `order_product` ADD CONSTRAINT `order_product_product_id_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `product`(`id`) ON DELETE CASCADE;