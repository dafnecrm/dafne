# dafne auth

The shared sign-in service (see `README.md` and `../../CLAUDE.md`). NestJS,
built like `../crm-api` (rspack, vitest with SWC, oxlint), with no feature
code of its own: it composes `@dafne/backend-auth`, `@dafne/backend-users`
and `@dafne/backend-database-auth`.

- Only this app connects to `dafne_auth` and runs Better Auth. Other apps
  check sessions with `@dafne/backend-session`; never add `AuthModule` to
  them.
- `bodyParser: false` in `main.ts`: Better Auth needs the raw body.
- Better Auth's guard protects every route: public ones need
  `@AllowAnonymous()` (`@thallesp/nestjs-better-auth`).
- Tables and migrations of dafne_auth are in
  `../../packages/backend/database-auth`; this app doesn't migrate
  (`pnpm dafne db migrate`).
