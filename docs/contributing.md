[← Index](README.md)

# CI and contributing

## Pull requests

`main` changes only through pull requests. The `affected` CI check is
required to merge.

## What CI runs

`.github/workflows/ci.yml`, on every pull request and push to `main`:

| Step                                                   | What it checks                                                        |
| ------------------------------------------------------ | --------------------------------------------------------------------- |
| `pnpm install --frozen-lockfile`                        | the lockfile matches the `package.json` files                          |
| `pnpm nx sync:check`                                   | project references in line with the dependencies                       |
| `pnpm boundaries`                                      | [project boundaries](boundaries.md)                                    |
| `pnpm nx affected -t lint typecheck test build`        | only the projects touched by the PR, and those that depend on them     |

- `nx affected` compares with the PR's base, or with `main`'s last green
  commit (`nrwl/nx-set-shas`).
- A new push to the same PR cancels the run still going.
- **A PR that changes only documentation** (`*.md`, `docs/`) skips the
  checks: the `affected` job still runs and passes, since `main` requires
  it.

Run the same locally before pushing:

```sh
pnpm nx sync:check && pnpm boundaries && pnpm affected
```

## Code owners

`.github/CODEOWNERS` assigns the reviewers of each folder (apps, backend
libs, frontend libs, CLI, CI and monorepo config). A change to
**`packages/contracts`** needs **both the backend and the frontend owners**,
since both sides depend on it.

## Rules of thumb

- New backend libs, apps, contracts and frontend libs come from the
  [`dafne` CLI](cli.md), not from hand-made folders or `@nx/nest`.
- After adding a dependency between workspace packages: `pnpm install` and
  `pnpm nx sync`.
- Shared versions go in the pnpm catalog.
- The frontend never imports a backend package (see
  [boundaries](boundaries.md)).
- Each project's `CLAUDE.md` holds its own rules: read it before changing
  the project.

## Changing the CLI

The generators copy real code: the backend templates are copies of the
`customers` resource, the app template of `apps/crm-api`, the frontend lib
template of `packages/frontend/auth`. When those patterns change, update the
templates in `packages/cli/templates`.

- `pnpm nx test @dafne/cli` runs each generator on a copy of
  `packages/cli/test/fixtures/project`. The fixtures are copies of the real
  files the wiring edits: refresh them when those files change.
- **Never generate into the real workspace to test.** To check the generated
  code end to end:
  1. copy the monorepo into a scratch folder (without `node_modules`,
     `.next`, `.git`, `dist`, `.env`, `.nx`, `out-tsc`) and run
     `pnpm install --offline`;
  2. there, run the generators (`pnpm dafne g resource invoice --field … -y`,
     `g lib`, `g app`, `g contract`, `g frontend-lib`), then
     `pnpm install --offline` and `npx nx sync`;
  3. `npx nx sync:check` must find nothing, and
     `npx nx run-many -t lint typecheck test build` must pass.

The CLI's internals are described in `packages/cli/CLAUDE.md`.

## See also

- [Build system (Nx)](nx.md)
- [Project boundaries](boundaries.md)
- [The `dafne` CLI](cli.md)
