# dafne

Monorepo (pnpm workspaces + Nx) of the Dafne CRM. Each project has its own
`CLAUDE.md` with its rules:

| Folder               | Package            | What                                              |
| -------------------- | ------------------ | ------------------------------------------------- |
| `apps/api`           | `@dafne/api`       | NestJS API (the app: `src/`, migrations)          |
| `packages/backend/*` | `@dafne/backend-*` | The backend's Nest libs (customers, auth…)        |
| `apps/frontend`      | `@dafne/frontend`  | Next.js app                                       |
| `packages/contracts` | `@dafne/contracts` | API schemas (Zod) and response types, shared      |
| `packages/cli`       | `@dafne/cli`       | `dafne` code generator for backend and frontend   |

`apps/` holds what runs or deploys, `packages/` what is shared or published.

## Commands (from the root)

- `pnpm install`: installs every project (one `pnpm-lock.yaml`, here).
- `pnpm build | test | lint | typecheck`: `nx run-many` over all projects.
- `pnpm affected`: lint, typecheck, test and build only what changed.
- `pnpm nx <target> <project>`, e.g. `pnpm nx test @dafne/api`.
- `pnpm dafne <command>` runs the CLI from source (e.g. `pnpm dafne dev`).

## Rules

- **Every project is a workspace package** (its own `package.json`, with
  its dependencies), no `project.json`. Targets are the `package.json`
  scripts, plus `typecheck` from the only Nx plugin, `@nx/js/typescript`
  (`tsc --build` over TypeScript project references). `nx.json` holds caching
  and inputs, the `nx` field of a `package.json` its outputs.
- **New backend libs come from the `dafne` CLI** (`dafne g backend lib <name>`, or a
  whole resource), not from Nx generators: it writes the package, adds it to
  the app and to the project references, as `nx sync` would. Then run
  `pnpm install`.
- **Project references** (`references` in the tsconfigs) follow the
  `package.json` dependencies: `pnpm nx sync` updates them, and CI fails
  when they're out of date. Shared compiler options are in
  `tsconfig.base.json`. The frontend (Next) and the CLI (TypeScript 7) keep
  their own tsconfig and `typecheck` script.
- **Shared versions** go in the `catalog:` of `pnpm-workspace.yaml`
  (`"zod": "catalog:"`). Workspace packages are `"workspace:*"`.
- **`@dafne/contracts` ships TypeScript sources** (no build): Next compiles
  it through `transpilePackages`, the backend bundles it through
  `apps/api/rspack.config.js`.
- **The app lists every runtime dependency of its libs** too: rspack
  bundles the `@dafne/*` sources, but loads npm packages from
  `apps/api/node_modules` at runtime.
- `.nxignore` hides the CLI's test fixtures, which look like projects.

## Workflow

- `main` only changes through pull requests. CI
  (`.github/workflows/ci.yml`) runs `nx affected -t lint typecheck test
  build` on each PR, so only the touched projects and their dependents.
- `.github/CODEOWNERS` assigns the reviewers of each folder; a change to
  `packages/contracts` needs both the backend and the frontend owners.
