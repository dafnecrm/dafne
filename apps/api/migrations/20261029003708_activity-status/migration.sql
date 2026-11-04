ALTER TABLE `activity` ADD `completed_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `activity` ADD `status` enum('open','in_progress','closed') DEFAULT 'open' NOT NULL;