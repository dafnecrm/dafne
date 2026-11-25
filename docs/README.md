# Dafne monorepo documentation

Dafne is a set of business apps (the sales app is the first) built in one
monorepo: pnpm workspaces for the packages, Nx for tasks and caching, NestJS
for the backends, Next.js for the frontends, PostgreSQL with Drizzle for the data.

These pages describe **how the monorepo works**: its structure, the shared
platform (sign-in, databases, migrations, boundaries) and the `dafne` CLI.
They don't describe the features of the individual apps: for those, see each
app's `README.md`.

## Pages

| Page                                     | What's in it                                                                      |
| ---------------------------------------- | --------------------------------------------------------------------------------- |
| [Getting started](getting-started.md)    | Prerequisites, environment files, first run                                       |
| [Monorepo structure](structure.md)       | `apps/` and `packages/`, every project and its role, the pnpm catalog             |
| [Build system (Nx)](nx.md)               | Projects, targets, caching, project references, packages that ship sources        |
| [Project boundaries](boundaries.md)      | Scope tags, who may depend on whom, how it is enforced                            |
| [Architecture](architecture.md)          | Apps, shared sign-in (`apps/auth`), sessions, app access, contracts               |
| [Databases and migrations](databases.md) | One schema per app, `auth`, `core`, the migrator, deploy                           |
| [Documents](documents.md)                | PDFs from Word templates admins upload: tags, API, Gotenberg, giving a resource documents |
| [Logs and observability](observability.md) | Logging (pino, `createLogger`), OpenTelemetry and Grafana (Loki, Tempo, Faro), local Grafana, Grafana Cloud |
| [Scheduled tasks](tasks.md)             | `apps/sales-tasks`: `@Task` handlers, schedules (BullMQ), one run at a time, starting tasks from another backend, the admin pages |
| [The AI assistant](assistant.md)        | Providers (Anthropic, Ollama…), models, agents, tools, confirmations, model eval |
| [The `dafne` CLI](cli.md)                | Generators (`g backend-resource`, `g frontend-resource`, `g frontend-app`…), `remove backend-db-column`, `sync contract`, `sync frontend-resource`, `db` commands, task shortcuts |
| [Column tags](column-tags.md)            | `@api` and `@form` in table files: the defaults, each tag, what the syncs leave alone |
| [Recipes](workflows.md)                  | Step-by-step: add a resource and its pages, remove a column, sync the pages, a lib, an app, a frontend app or lib, a dependency |
| [CI and contributing](contributing.md)   | Pull requests, CI checks, code owners, testing the CLI                            |

Planned work that isn't implemented yet is in [ROADMAP.md](../ROADMAP.md).

## Quick start

```sh
pnpm install
cp apps/auth/.env.example apps/auth/.env           # and the same for sales-api, sales-tasks, sales-web
cp packages/backend/migrator/.env.example packages/backend/migrator/.env
pnpm dafne dev                                     # PostgreSQL, Redis, database, migrations, then https://sales-web.dafne.localhost…
```

Details in [Getting started](getting-started.md).

## License

Copyright (C) 2026 Luca Lulani.

Dafne is free software, licensed under the
[GNU Affero General Public License v3.0 only](../LICENSE) (`AGPL-3.0-only`):
you may use, modify and distribute it, also commercially, provided that the
modified versions stay under the same license and that whoever runs a
modified version over a network offers its users the source code. Every
workspace package declares `"license": "AGPL-3.0-only"`, and the CLI's
templates give it to the packages they generate. Contributions are accepted
under the same license (see [CI and contributing](contributing.md)).
