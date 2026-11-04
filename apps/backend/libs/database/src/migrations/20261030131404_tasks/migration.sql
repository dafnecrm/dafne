CREATE TABLE `task` (
	`id` varchar(36) PRIMARY KEY,
	`name` varchar(255) NOT NULL,
	`due_date` timestamp(3) NOT NULL,
	`notes` text NOT NULL,
	`type` enum('email','phone','other') NOT NULL,
	`activity_id` varchar(36) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT (now()),
	`deleted_at` timestamp(3),
	`created_by_id` varchar(36),
	`updated_by_id` varchar(36),
	CONSTRAINT `task_activity_id_activity_id_fkey` FOREIGN KEY (`activity_id`) REFERENCES `activity`(`id`) ON DELETE CASCADE,
	CONSTRAINT `task_created_by_id_user_id_fkey` FOREIGN KEY (`created_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL,
	CONSTRAINT `task_updated_by_id_user_id_fkey` FOREIGN KEY (`updated_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL
);
--> statement-breakpoint
CREATE INDEX `task_deletedAt_idx` ON `task` (`deleted_at`);--> statement-breakpoint
CREATE INDEX `task_name_idx` ON `task` (`name`);--> statement-breakpoint
CREATE INDEX `task_activityId_idx` ON `task` (`activity_id`);