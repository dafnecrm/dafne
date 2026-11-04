-- Better Auth's tables move from dafne_crm, where the CRM created them, to
-- dafne_auth. RENAME TABLE keeps rows, indexes and foreign keys, and MySQL
-- points the CRM's keys to `user` (created_by_id…) at dafne_auth.user.
-- The snapshot describes them as created here (drizzle-kit generated it).
RENAME TABLE
  `dafne_crm`.`user` TO `dafne_auth`.`user`,
  `dafne_crm`.`session` TO `dafne_auth`.`session`,
  `dafne_crm`.`account` TO `dafne_auth`.`account`,
  `dafne_crm`.`verification` TO `dafne_auth`.`verification`;
--> statement-breakpoint
CREATE TABLE `app_access` (
	`id` varchar(36) PRIMARY KEY,
	`user_id` varchar(36) NOT NULL,
	`app` varchar(64) NOT NULL,
	`role` varchar(64) NOT NULL DEFAULT 'user',
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `app_access_user_app_unique` UNIQUE INDEX(`user_id`,`app`)
);
--> statement-breakpoint
CREATE INDEX `app_access_user_id_idx` ON `app_access` (`user_id`);--> statement-breakpoint
ALTER TABLE `app_access` ADD CONSTRAINT `app_access_user_id_user_id_fkey` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE CASCADE;--> statement-breakpoint
-- The users so far all used the CRM: they keep it, admins as admins.
INSERT INTO `app_access` (`id`, `user_id`, `app`, `role`)
  SELECT UUID(), `id`, 'crm', IF(`role` = 'admin', 'admin', 'user') FROM `user`;
