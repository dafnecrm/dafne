# dafne auth

The shared sign-in service (see `README.md` and `../../CLAUDE.md`). NestJS,
built like `../sales-api` (rspack, vitest with SWC, oxlint), with no feature
code of its own: it composes `@dafne/backend-auth`, `@dafne/backend-users`,
`@dafne/backend-user-groups` and `@dafne/backend-database-auth`.

- Only this app writes the `auth` schema and runs Better Auth. Other apps
  check sessions with `@dafne/backend-session`; never add `AuthModule` to
  them.
- `bodyParser: false` in `main.ts`: Better Auth needs the raw body.
- Better Auth's guard protects every route: public ones need
  `@AllowAnonymous()` (`@thallesp/nestjs-better-auth`).
- Its `CacheModule` uses the apps' Redis (`REDIS_URL`, namespace `dafne`):
  a write to a user group bumps `PermissionsVersion`, so the apps' cached
  permissions drop at once.
- Tables and migrations of the auth schema are in
  `../../packages/backend/database-auth`. They're applied by
  `pnpm dafne db migrate`, or on startup with `MIGRATE_ON_START=true`
  (`src/main.ts`, see `@dafne/backend-migrator`).

## Logs and telemetry

As in `apps/sales-api`: `LoggerModule.forRoot({ app: 'auth' })` with
`useAppLogger(app)` (pino), and `src/telemetry.ts` built as
`dist/telemetry.js`, loaded with `node --import` (OpenTelemetry, off without
`OTEL_EXPORTER_OTLP_ENDPOINT`). See `../../docs/observability.md`.
