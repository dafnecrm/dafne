-- The activities' state machine: Activity.close (close and reopen) is now
-- Activity.changeStatus, as for sales orders. Groups keep the grant.
UPDATE "sales"."user_group_permission"
SET "permission" = 'Activity.changeStatus'
WHERE "permission" = 'Activity.close';
