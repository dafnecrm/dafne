-- The users' change log starts with a create for each user there is
-- already, at their created_at and with their current values (no actor):
-- Better Auth's update hooks get only the new values, so an update's
-- "from" comes from the log (ChangelogService.recordSnapshot).
-- Written by hand; keep the fields in line with USER_CHANGELOG_FIELDS
-- (@dafne/backend-auth).
INSERT INTO "changelog"."change" ("resource", "record_id", "operation", "changes", "actor_id", "changed_at")
SELECT
  'users',
  u."id",
  'create',
  (
    SELECT coalesce(jsonb_object_agg(f.key, jsonb_build_object('from', NULL, 'to', f.value)), '{}'::jsonb)
    FROM jsonb_each(jsonb_build_object(
      'name', u."name",
      'firstname', u."firstname",
      'lastname', u."lastname",
      'email', u."email",
      'role', u."role",
      'banned', u."banned",
      'emailVerified', u."email_verified"
    )) AS f
    WHERE f.value <> 'null'::jsonb
  ),
  NULL,
  u."created_at"
FROM "auth"."user" AS u
WHERE NOT EXISTS (
  SELECT 1 FROM "changelog"."change" AS c
  WHERE c."resource" = 'users' AND c."record_id" = u."id" AND c."operation" = 'create'
);
