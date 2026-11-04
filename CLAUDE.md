# dafne

Monorepo (pnpm workspaces + Nx) of the Dafne CRM. Each project has its own
`CLAUDE.md` with its rules:

| Folder               | Package            | What                                              |
| -------------------- | ------------------ | ------------------------------------------------- |
| `apps/crm-api`           | `@dafne/crm-api`       | NestJS API of the CRM                             |
| `packages/backend/*` | `@dafne/backend-*` | The backend's Nest libs (customers, auth…)        |
| `apps/crm-web`      | `@dafne/crm-web`  | Next.js app                                       |
| `packages/frontend/*` | `@dafne/frontend-*` | The frontend's libs (auth…), TypeScript sources compiled by Next |
| `packages/contracts` | `@dafne/contracts` | API schemas (Zod) and response types, shared      |
| `packages/auth-options` | `@dafne/auth-options` | Better Auth options (no Nest, no DB), shared |
| `apps/auth`           | `@dafne/auth`      | Sign-in (Better Auth), users and app access, shared by every app |
| `packages/cli`       | `@dafne/cli`       | `dafne`: Nx generators (backend, frontend libs) and task runner |
| `packages/cli-old`   | `@dafne/cli-old`   | `dafne-old`: previous CLI (frontend, sync, field, migration) |

`apps/` holds what runs or deploys, `packages/` what is shared or published.

## Commands (from the root)

- `pnpm install`: installs every project (one `pnpm-lock.yaml`, here).
- `pnpm build | test | lint | typecheck`: `nx run-many` over all projects.
- `pnpm affected`: lint, typecheck, test and build only what changed.
- `pnpm nx <target> <project>`, e.g. `pnpm nx test @dafne/crm-api`.
- `pnpm dafne dev` starts `@dafne/auth`, `@dafne/crm-api` and `@dafne/crm-web`
  (migrating first, with `MIGRATIONS_DATABASE_URL`); `pnpm dafne db
  migrate | generate` handles the migrations.
- `pnpm dafne <command>` runs the CLI from source (e.g. `pnpm dafne dev`,
  `pnpm dafne g resource invoice`). `pnpm dafne-old <command>` runs the
  previous one.

## Rules

- **Every project is a workspace package** (its own `package.json`, with
  its dependencies), no `project.json`. Targets are the `package.json`
  scripts, plus `typecheck` from the only Nx plugin, `@nx/js/typescript`
  (`tsc --build` over TypeScript project references). `nx.json` holds caching
  and inputs, the `nx` field of a `package.json` its outputs.
- **New backend libs, apps, contracts and frontend libs come from the
  `dafne` CLI** (`dafne g lib|app|resource|contract|frontend-lib <name>`), which runs this workspace's
  own Nx generators (`nx g @dafne/cli:<generator>`), not `@nx/nest`'s (they
  write a `project.json`). They write the package and add it to the app and
  to the project references. Then run `pnpm install` and `pnpm nx sync`.
  Frontend pages still come from `dafne-old`.
- **Project references** (`references` in the tsconfigs) follow the
  `package.json` dependencies: `pnpm nx sync` updates them, and CI fails
  when they're out of date. Shared compiler options are in
  `tsconfig.base.json`. The frontend (Next) and the CLI (TypeScript 7) keep
  their own tsconfig and `typecheck` script.
- **Shared versions** go in the `catalog:` of `pnpm-workspace.yaml`
  (`"zod": "catalog:"`). Workspace packages are `"workspace:*"`.
- **`@dafne/contracts` ships TypeScript sources** (no build): Next compiles
  it through `transpilePackages`, the backend bundles it through
  `apps/crm-api/rspack.config.js`. The frontend libs (`packages/frontend/*`)
  ship sources too: they are in the frontend's `transpilePackages` and in
  the `nx.sync.ignoredDependencies` of its `tsconfig.json` (`dafne g
  frontend-lib` adds them).
- **The app lists every runtime dependency of its libs** too: rspack
  bundles the `@dafne/*` sources, but loads npm packages from
  `apps/crm-api/node_modules` at runtime.
- **Project boundaries**: every project has one scope tag (`nx.tags`):
  `scope:frontend`, `scope:backend`, `scope:shared` (contracts,
  auth-options) or `scope:tooling` (the CLIs). The frontend depends only on
  frontend and shared packages, the backend on backend and shared ones,
  shared packages only on shared ones. **Only the backend reaches the
  database**: the frontend talks to it over HTTP, and never imports a
  backend package, not even for types. The rules are in
  `tools/boundaries.mjs`; ESLint (`@nx/enforce-module-boundaries`, in
  `packages/frontend/eslint.config.mjs`) and `pnpm boundaries` (the whole
  project graph, in CI) enforce them.
- **Databases**: one per app (`dafne_<app>`), plus `dafne_auth` (users,
  sessions) and, once a second app needs a table, `dafne_core`. Names are
  fixed (one environment = one MySQL server). A table is born in the
  database of the app that creates it and moves to `dafne_core` when
  another app must read it or reference it (`RENAME TABLE`, same server).
  Dependencies go one way: app → core → auth (foreign keys included).
  `apps/auth` owns `dafne_auth` (`@dafne/backend-database-auth`); the
  apps' APIs never run Better Auth, they check sessions with
  `@dafne/backend-session` (`SessionModule.forRoot({ app })`), and
  `app_access` says who can use which app. Core
  data is written only by its feature lib (e.g. `@dafne/backend-customers`),
  core migrations live in its own package, never in an app.
- **Migrations belong to the database packages** (`"dafne": { "database":
  "dafne_crm" }` in their package.json, `migrations/` next to it), not to
  the apps. `@dafne/backend-migrator` applies those of every database in
  one order, by timestamp (`pnpm dafne db migrate`), with
  `MIGRATIONS_DATABASE_URL`. An app migrates on startup only with
  `MIGRATE_ON_START=true` (`migrateOnStart` in its `main.ts`): its build
  carries the migrations of **every** database (`dist/migrations`), since
  they run in one order. `pnpm dafne db generate` runs drizzle-kit and
  fixes the foreign keys it writes (ON DELETE, tables of other databases).
- `.nxignore` hides the CLIs' test fixtures, which look like projects.

## Workflow

- `main` only changes through pull requests. CI
  (`.github/workflows/ci.yml`) runs `nx sync:check`, `pnpm boundaries` and
  `nx affected -t lint typecheck test build` on each PR, so only the
  touched projects and their dependents.
- `.github/CODEOWNERS` assigns the reviewers of each folder; a change to
  `packages/contracts` needs both the backend and the frontend owners.
