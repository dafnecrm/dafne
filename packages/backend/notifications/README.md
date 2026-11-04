# @dafne/backend-notifications

Notifications: `NotificationsModule`, `NotificationsService` and
`EmailsService` (a [Resend](https://resend.com) client, from
`RESEND_API_KEY`). For now the services are empty: the verification email
is sent by `@dafne/backend-auth`.

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/backend-notifications
pnpm nx lint @dafne/backend-notifications
pnpm nx typecheck @dafne/backend-notifications
```
