-- No more in_progress: those activities go back to open before the enum shrinks.
UPDATE `activity` SET `status` = 'open' WHERE `status` = 'in_progress';--> statement-breakpoint
ALTER TABLE `activity` MODIFY COLUMN `status` enum('open','closed') DEFAULT 'open' NOT NULL;
