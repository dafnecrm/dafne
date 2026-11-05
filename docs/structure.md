[← Index](README.md)

# Monorepo structure

```
dafne/
├── apps/                 what runs or is deployed
│   ├── auth/             sign-in, users, app access (shared by every app)
│   ├── sales-api/        the sales app's NestJS API
│   └── sales-web/        the sales app's Next.js frontend
├── packages/             what is shared or published
│   ├── backend/*         Nest libs of the backend (@dafne/backend-*)
│   ├── frontend/*        libs of the frontend (@dafne/frontend-*)
│   ├── contracts/        API schemas and response types (backend ↔ frontend)
│   ├── auth-options/     Better Auth options shared by backend and frontend
│   └── cli/              the dafne CLI and its Nx generators
├── tools/                repo scripts (project boundaries)
├── docs/                 this documentation
├── nx.json               Nx caching, inputs, plugin
├── pnpm-workspace.yaml   workspace folders and the version catalog
├── tsconfig.base.json    shared TypeScript options
└── tsconfig.json         root project references
```

**`apps/` holds what runs or deploys, `packages/` what is shared.** Every
folder with a `package.json` is a workspace package and an Nx project (see
[Build system](nx.md)).

## Projects

Each project has one scope tag (see [Project boundaries](boundaries.md)).

### Apps

| Package          | Folder          | Scope   | Role                                                                                   |
| ---------------- | --------------- | ------- | -------------------------------------------------------------------------------------- |
| `@dafne/auth`    | `apps/auth`     | backend | Sign-in (Better Auth), users, app access, on `dafne_auth`. Shared by every app.         |
| `@dafne/sales-api` | `apps/sales-api` | backend  | The sales app's NestJS API: composes the backend libs, on `dafne_sales`.                |
| `@dafne/sales-web` | `apps/sales-web` | frontend | The sales app's Next.js frontend: talks to the APIs over HTTP.                         |

### Backend libs (`packages/backend/*`)

| Package                        | Role                                                                                                |
| ------------------------------ | --------------------------------------------------------------------------------------------------- |
| `@dafne/backend-database`      | `dafne_sales`: Drizzle tables, `DatabaseModule`, migrations                                           |
| `@dafne/backend-database-auth` | `dafne_auth`: Better Auth tables and `app_access`, migrations                                       |
| `@dafne/backend-migrator`      | Applies the migrations of every database in one order; generates them                              |
| `@dafne/backend-auth`          | Better Auth in Nest (`AuthModule`), used only by `apps/auth`                                        |
| `@dafne/backend-session`       | Session guard for the apps' APIs (`SessionModule.forRoot({ app })`, `@Session()`, `@Roles()`)        |
| `@dafne/backend-users`         | Users API (runs in `apps/auth`)                                                                     |
| `@dafne/backend-common`        | `ZodValidationPipe`, translated errors (`I18nExceptionFilter`), i18n helpers                        |
| `@dafne/backend-notifications` | Notifications and emails (Resend)                                                                   |
| `@dafne/backend-geo`           | Place search and countries                                                                          |
| `@dafne/backend-customers`, `-products`, `-activities` | Feature libs of the sales app (module, controller, service)                       |

### Frontend libs (`packages/frontend/*`)

They ship TypeScript sources, compiled by Next.

| Package                      | Role                                                                    |
| ---------------------------- | ----------------------------------------------------------------------- |
| `@dafne/frontend-api`        | Server-side calls to the APIs: `backendFetch`, `authFetch`, `BackendError` |
| `@dafne/frontend-auth`       | Better Auth client, server session helpers, auth error messages        |
| `@dafne/frontend-ui`         | Design system: shadcn components (Base UI), dates, theme               |
| `@dafne/frontend-forms`      | Form building blocks (TanStack Form): fields, contexts, schema helpers |
| `@dafne/frontend-data-table` | Server-side data tables: config, URL state, `DataTable`                 |

### Shared and tooling

| Package                | Scope   | Role                                                                     |
| ---------------------- | ------- | ------------------------------------------------------------------------ |
| `@dafne/contracts`     | shared  | Zod request schemas, response types, validation messages (en, it)        |
| `@dafne/auth-options`  | shared  | Better Auth options without database or environment (user fields, plugins) |
| `@dafne/cli`           | tooling | The `dafne` command and the Nx generators ([CLI](cli.md))                |

## Dependencies and versions

- Folders in the workspace: `apps/*`, `packages/*`, `packages/backend/*`,
  `packages/frontend/*` (`pnpm-workspace.yaml`).
- **Workspace packages** are referenced as `"workspace:*"`.
- **Versions shared by several projects** live in the `catalog:` of
  `pnpm-workspace.yaml` and are referenced as `"zod": "catalog:"`. One
  place to bump React, Nest, Drizzle, Zod, TypeScript…
- Each project lists its own dependencies in its `package.json`. A backend
  app also lists the runtime dependencies of its libs (see
  [Build system](nx.md#packages-that-ship-sources)).

## Documentation inside the projects

Each project has a `README.md` (what it is, how to use it) and, often, a
`CLAUDE.md` (the rules to follow when changing it).

## See also

- [Build system (Nx)](nx.md)
- [Project boundaries](boundaries.md)
- [Architecture](architecture.md)
