# dafne

Monorepo (pnpm workspaces + Nx) of the Dafne CRM. The documentation of the
monorepo (structure, platform, CLI) is in `docs/` (index: `docs/README.md`):
keep it in line when these rules change. Each project has its own
`CLAUDE.md` with its rules:

| Folder               | Package            | What                                              |
| -------------------- | ------------------ | ------------------------------------------------- |
| `apps/sales-api`           | `@dafne/sales-api`       | NestJS API of the sales app                            |
| `packages/backend/*` | `@dafne/backend-*` | The backend's Nest libs (customers, auth…)        |
| `apps/sales-web`      | `@dafne/sales-web`  | Next.js app                                       |
| `packages/frontend/*` | `@dafne/frontend-*` | The frontend's libs (auth…), TypeScript sources compiled by Next |
| `packages/contracts` | `@dafne/contracts` | API schemas (Zod) and response types, shared      |
| `packages/auth-options` | `@dafne/auth-options` | Better Auth options (no Nest, no DB), shared |
| `apps/auth`           | `@dafne/auth`      | Sign-in (Better Auth), users and app access, shared by every app |
| `packages/cli`       | `@dafne/cli`       | `dafne`: Nx generators (backend, frontend libs) and task runner |

`apps/` holds what runs or deploys, `packages/` what is shared or published.

## Commands (from the root)

- `pnpm install`: installs every project (one `pnpm-lock.yaml`, here).
- `pnpm build | test | lint | typecheck`: `nx run-many` over all projects.
- `pnpm affected`: lint, typecheck, test and build only what changed.
- `pnpm nx <target> <project>`, e.g. `pnpm nx test @dafne/sales-api`.
- `pnpm dafne dev` starts `@dafne/auth`, `@dafne/sales-api` and `@dafne/sales-web`
  (migrating first, with `MIGRATIONS_DATABASE_URL`); `pnpm dafne db
  create` creates the database and its owner, `pnpm dafne db migrate |
  generate` handles the migrations.
- `pnpm dafne <command>` runs the CLI from source (e.g. `pnpm dafne dev`,
  `pnpm dafne g backend-resource invoice`).
- `pnpm dafne remove backend-db-column <table> <columns…>` removes columns
  (table, contract, service, specs, then the migration);
  `pnpm dafne sync contract <resource>` brings a contract, its service
  and specs in line with the table, `pnpm dafne sync frontend-resource
  <resource>` a resource's pages in line with its contract.

## Rules

- **Every project is a workspace package** (its own `package.json`, with
  its dependencies), no `project.json`. Targets are the `package.json`
  scripts, plus `typecheck` from the only Nx plugin, `@nx/js/typescript`
  (`tsc --build` over TypeScript project references). `nx.json` holds caching
  and inputs, the `nx` field of a `package.json` its outputs.
- **New backend libs, apps, resources, contracts, frontend apps, libs and
  pages come from the `dafne` CLI** (`dafne g <kind> <name>`, the kind being
  the generator's name: `backend-resource|backend-lib|backend-app`,
  `contract`, `frontend-resource` and its parts
  `frontend-list|detail|form|actions|data|nav`, `frontend-app`,
  `frontend-lib`), which runs this workspace's own Nx generators
  (`nx g @dafne/cli:<kind>`), not `@nx/nest`'s (they write a
  `project.json`). They write the package and add it to the app and
  to the project references. Then run `pnpm install` and `pnpm nx sync`.
  **Columns are removed with the CLI too** (`dafne remove
  backend-db-column`: table, contract, service, specs, migration), a
  contract follows its table with `dafne sync contract`, and a
  resource's pages follow its contract with `dafne sync
  frontend-resource`.
- **Project references** (`references` in the tsconfigs) follow the
  `package.json` dependencies: `pnpm nx sync` updates them, and CI fails
  when they're out of date. Shared compiler options are in
  `tsconfig.base.json`. The frontend (Next) and the CLI (TypeScript 7) keep
  their own tsconfig and `typecheck` script.
- **Shared versions** go in the `catalog:` of `pnpm-workspace.yaml`
  (`"zod": "catalog:"`). Workspace packages are `"workspace:*"`.
- **`@dafne/contracts` ships TypeScript sources** (no build): Next compiles
  it through `transpilePackages`, the backend bundles it through
  `apps/sales-api/rspack.config.js`. The frontend libs (`packages/frontend/*`)
  ship sources too: they are in the frontend's `transpilePackages` and in
  the `nx.sync.ignoredDependencies` of its `tsconfig.json` (`dafne g
  frontend-lib` adds them).
- **The app lists every runtime dependency of its libs** too: rspack
  bundles the `@dafne/*` sources, but loads npm packages from
  `apps/sales-api/node_modules` at runtime.
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
- **Database**: one PostgreSQL database per environment (`dafne`), one
  schema per app (`sales`, `<app>`), plus `auth` (users, sessions),
  `changelog` (the change log, written only by `@dafne/backend-changelog`,
  depending only on `auth`) and, once a second app needs a table, `core`.
  Names are fixed. A table is
  born in the schema of the app that creates it and moves to `core` when
  another app must read it or reference it (`ALTER TABLE … SET SCHEMA`).
  Dependencies go one way: app → core → auth (foreign keys included).
  Tables are declared in their schema (`salesSchema.table`,
  `authDb.table`), so every query names it.
  `apps/auth` owns `auth` (`@dafne/backend-database-auth`); the
  apps' APIs never run Better Auth, they check sessions with
  `@dafne/backend-session` (`SessionModule.forRoot({ app })`), and
  `app_access` says who can use which app. Core
  data is written only by its feature lib (e.g. `@dafne/backend-customers`),
  core migrations live in its own package, never in an app.
- **Migrations belong to the schema packages** (`"dafne": { "schema":
  "sales" }` in their package.json, `migrations/` next to it), not to
  the apps. `@dafne/backend-migrator` applies those of every schema in
  one order, by timestamp, each in a transaction (`pnpm dafne db
  migrate`), with `MIGRATIONS_DATABASE_URL`. An app migrates on startup
  only with `MIGRATE_ON_START=true` (`migrateOnStart` in its `main.ts`):
  its build carries the migrations of **every** schema
  (`dist/migrations`), since they run in one order. `pnpm dafne db
  generate` runs drizzle-kit. Tables of another schema are imported from
  outside `src/tables/` (e.g. `src/auth.ts`): drizzle-kit would put every
  table its schema files export into the package's migrations.
- **CRUD resources share one interface** (`@dafne/backend-crud`): the
  controller `implements CrudController<Id, Query, List, Body, Detail>`,
  the service `CrudService<…>`, with the methods `list | get | create |
  update | delete`, and lists answer `Page<T>` (`{ items, total, limit,
  offset }`). Services take the whole `SessionUser` as `actor`
  (controllers pass `session.user`). Extra routes keep their own names.
  The CLI's templates and syncs rely on these names.
  **Writes run through `CrudHooks`** (`registry.for('<resource>', { db, load })`):
  one transaction with pre hooks, the write, post hooks, then after-commit
  hooks. Other libs add hooks with `CrudHooksModule.forFeature`, not by
  editing the resource. Who may call stays with Nest guards.
  A resource's change log is turned on in its module
  (`ChangelogModule.forFeature('<resource>', { fields })`, plus
  `changelogTransitionHook` for its state machine).
- **Braces on every `if`/`else`/loop body**, one-liners included
  (`curly: all`, in the oxlint and ESLint configs and the CLI's templates).
- `.nxignore` hides the CLIs' test fixtures, which look like projects.

## Workflow

- `main` only changes through pull requests. CI
  (`.github/workflows/ci.yml`) runs, in one job (`affected`, the check
  `main` requires), `nx sync:check`, `pnpm boundaries` and `nx affected
  -t lint typecheck test build` on each PR, so only the touched projects
  and their dependents. A PR that changes only documentation (`*.md`,
  `docs/`) skips the checks, and `affected` still passes.
- **CI keeps one cache**, the pnpm store, saved only on `main` (PRs
  restore it; `.github/actions/setup`). No `cache:` on `setup-node`, no
  Nx cache: the Actions cache (10 GB) would fill up and evict `main`'s
  store, so installs would miss it.
- `.github/CODEOWNERS` assigns the reviewers of each folder; a change to
  `packages/contracts` needs both the backend and the frontend owners.
