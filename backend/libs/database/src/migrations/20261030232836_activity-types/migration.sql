-- Activity types become call, email, meeting, task; phone becomes call.
-- Widen the enum first, so existing 'phone' rows stay valid while they're renamed.
ALTER TABLE `activity` MODIFY COLUMN `type` enum('email','phone','call','meeting','task') NOT NULL;--> statement-breakpoint
UPDATE `activity` SET `type` = 'call' WHERE `type` = 'phone';--> statement-breakpoint
ALTER TABLE `activity` MODIFY COLUMN `type` enum('call','email','meeting','task') NOT NULL;
