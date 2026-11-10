-- Custom SQL migration file, put your code below! --
UPDATE "sales"."sales_order" SET "status" = 'cancelled' WHERE "status" = 'canceled';
