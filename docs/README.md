# Dafne monorepo documentation

Dafne is a set of business apps (the sales app is the first) built in one
monorepo: pnpm workspaces for the packages, Nx for tasks and caching, NestJS
for the backends, Next.js for the frontends, MySQL with Drizzle for the data.

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
| [Databases and migrations](databases.md) | One database per app, `dafne_auth`, `dafne_core`, the migrator, deploy            |
| [The `dafne` CLI](cli.md)                | Generators (`g backend-resource`, `g frontend-resource`, `g frontend-app`…), `db` commands, task shortcuts       |
| [Recipes](workflows.md)                  | Step-by-step: add a resource and its pages, a lib, an app, a frontend app or lib, a dependency         |
| [CI and contributing](contributing.md)   | Pull requests, CI checks, code owners, testing the CLI                            |

Planned work that isn't implemented yet is in [ROADMAP.md](../ROADMAP.md).

## Quick start

```sh
pnpm install
cp apps/auth/.env.example apps/auth/.env           # and the same for sales-api, sales-web
cp packages/backend/migrator/.env.example packages/backend/migrator/.env
pnpm dafne db migrate                              # creates and migrates every dafne_* database
pnpm dafne dev                                     # auth (3001), sales-api (3000), sales-web (4000)
```

Details in [Getting started](getting-started.md).
