CREATE TABLE "sales"."user_group_permission" (
	"group_id" integer,
	"permission" varchar(100),
	CONSTRAINT "user_group_permission_pkey" PRIMARY KEY("group_id","permission")
);
--> statement-breakpoint
ALTER TABLE "sales"."user_group" ADD COLUMN "all_users" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "sales"."user_group_permission" ADD CONSTRAINT "user_group_permission_group_id_user_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "sales"."user_group"("id") ON DELETE CASCADE;--> statement-breakpoint
-- Every user keeps doing what they did before permissions existed: the
-- "Tutti gli utenti" group applies to everyone and has every permission.
-- Admins then take away what they don't want.
INSERT INTO "sales"."user_group" ("name", "description", "all_users")
  VALUES ('Tutti gli utenti', 'Vale per ogni utente dell''app: i suoi permessi sono quelli di tutti.', true)
  ON CONFLICT ("name") DO UPDATE SET "all_users" = true;--> statement-breakpoint
INSERT INTO "sales"."user_group_permission" ("group_id", "permission")
  SELECT "id", p FROM "sales"."user_group",
    unnest(ARRAY['Customer.create','Customer.update','Customer.delete',
                 'Activity.create','Activity.update','Activity.delete','Activity.close',
                 'Product.create','Product.update','Product.delete',
                 'SalesOrder.create','SalesOrder.update','SalesOrder.delete','SalesOrder.changeStatus']) AS p
  WHERE "name" = 'Tutti gli utenti'
  ON CONFLICT DO NOTHING;
