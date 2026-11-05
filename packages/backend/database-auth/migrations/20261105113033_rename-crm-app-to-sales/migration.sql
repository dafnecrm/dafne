-- The CRM app is now the sales app (apps/sales-api, apps/sales-web): its
-- users keep their access, with the same role.
UPDATE `app_access` SET `app` = 'sales' WHERE `app` = 'crm';
