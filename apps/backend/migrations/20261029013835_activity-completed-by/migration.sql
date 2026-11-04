ALTER TABLE `activity` ADD `completed_by_id` varchar(36);--> statement-breakpoint
CREATE INDEX `activity_completedById_idx` ON `activity` (`completed_by_id`);--> statement-breakpoint
ALTER TABLE `activity` ADD CONSTRAINT `activity_completed_by_id_user_id_fkey` FOREIGN KEY (`completed_by_id`) REFERENCES `user`(`id`) ON DELETE SET NULL;