# dafne

Monorepo (pnpm workspaces + Nx) of the Dafne CRM. Each project has its own
`CLAUDE.md` with its rules:

| Folder               | Package            | What                                              |
| -------------------- | ------------------ | ------------------------------------------------- |
| `backend/`           | `@dafne/backend`   | NestJS API (Nest monorepo: `apps/api`, `libs/*`)  |
| `frontend/`          | `@dafne/frontend`  | Next.js app                                       |
| `packages/contracts` | `@dafne/contracts` | API schemas (Zod) and response types, shared      |
| `cli/`               | `@dafne/cli`       | `dafne` code generator for backend and frontend   |

## Commands (from the root)

- `pnpm install`: installs every project (one `pnpm-lock.yaml`, here).
- `pnpm build | test | lint | typecheck`: `nx run-many` over all projects.
- `pnpm affected`: lint, typecheck, test and build only what changed.
- `pnpm nx <target> <project>`, e.g. `pnpm nx test @dafne/backend`.
- `pnpm dafne <command>` runs the CLI from source (e.g. `pnpm dafne dev`).

## Rules

- **Nx is only a task runner**: no Nx plugins, no `project.json`. Targets
  are the `package.json` scripts; `nx.json` holds caching and inputs, and
  the `nx` field of a `package.json` its outputs. The Nest libs stay in
  `backend/nest-cli.json`, managed by the `dafne` CLI.
- **Shared versions** go in the `catalog:` of `pnpm-workspace.yaml`
  (`"zod": "catalog:"`). Workspace packages are `"workspace:*"`.
- **`@dafne/contracts` ships TypeScript sources** (no build): Next compiles
  it through `transpilePackages`, the backend bundles it through
  `backend/rspack.config.js`.
- **New project dependencies Nx can't see** (tsconfig paths, like the
  frontend's `@backend/auth-options`) go in `nx.implicitDependencies`.

## Workflow

- `main` only changes through pull requests. CI
  (`.github/workflows/ci.yml`) runs `nx affected -t lint typecheck test
  build` on each PR, so only the touched projects and their dependents.
- `.github/CODEOWNERS` assigns the reviewers of each folder; a change to
  `packages/contracts` needs both the backend and the frontend owners.
