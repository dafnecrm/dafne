-- The user groups and their members move from sales to auth: shared by every
-- app (each app keeps its own permissions, e.g. sales.user_group_permission).
-- SET SCHEMA keeps the rows, the ids and their sequence, the indexes and
-- every foreign key (sales.user_group_permission and
-- sales.assistant_agent_group now point to auth.user_group). The snapshot
-- is drizzle-kit's, as if the tables were created here.
ALTER TABLE "sales"."user_group" SET SCHEMA "auth";--> statement-breakpoint
ALTER TABLE "sales"."user_group_member" SET SCHEMA "auth";
