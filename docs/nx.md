[← Index](README.md)

# Build system (Nx)

## Projects are workspace packages

Every project is a pnpm workspace package, with its own `package.json` and
its own dependencies. There is **no `project.json`**: Nx reads the projects
from the `package.json` files.

- **Targets** are the `package.json` scripts (`build`, `test`, `lint`,
  `dev`…), plus `typecheck`, inferred by the only Nx plugin,
  `@nx/js/typescript` (`tsc --build` over the project references).
- **`nx.json`** holds the shared settings: caching, named inputs and the
  defaults of each target.
- **The `nx` field of a `package.json`** holds the project's own settings:
  tags (`nx.tags`), outputs, extra target options (e.g. `dev` depending on
  `migrate:dev`).

## Running targets

```sh
pnpm build | test | lint | typecheck   # nx run-many over every project
pnpm affected                          # lint, typecheck, test, build of what changed
pnpm nx <target> <project>             # e.g. pnpm nx test @dafne/sales-api
pnpm graph                             # project graph
```

The CLI has shortcuts for the same commands: `pnpm dafne test`,
`pnpm dafne dev`… (see [CLI](cli.md#running-tasks)).

## Caching and inputs

`build`, `test`, `typecheck` and `lint` are cached (`nx.json`):

| Target      | Inputs                                                       | Notes                       |
| ----------- | ------------------------------------------------------------ | --------------------------- |
| `build`     | the project's `production` files and its dependencies' ones   | runs `^build` first         |
| `typecheck` | every file of the project, `production` files of dependencies |                             |
| `test`      | every file of the project, `production` files of dependencies |                             |
| `lint`      | every file of the project                                     |                             |

- `production` is every file except specs, e2e specs, `test/` and the
  vitest configs.
- `pnpm-workspace.yaml` is a global input: changing the catalog invalidates
  every cache.
- `dev` and `start` are continuous and never cached; migration targets
  (`migrate`, `migrate:dev`, `migration:generate`) are not
  cached either.

## TypeScript project references

The `references` in the tsconfigs follow the `package.json` dependencies:

```sh
pnpm nx sync          # updates the references after adding a dependency
pnpm nx sync:check    # fails if they are out of date (run by CI)
```

- Shared compiler options are in `tsconfig.base.json`; the root
  `tsconfig.json` references the projects.
- Two exceptions keep their own tsconfig and `typecheck` script: the
  frontend (Next) and the CLI (TypeScript 7).
- The generators of the CLI add the references themselves; `pnpm nx sync`
  afterwards is still the safe step.

## Packages that ship sources

Some packages have **no build**: they ship TypeScript sources, compiled by
whoever imports them.

- **`@dafne/contracts`**: Next compiles it (`transpilePackages`), the
  backend bundles it (`apps/sales-api/rspack.config.js`).
- **Frontend libs** (`packages/frontend/*`): listed in the frontend's
  `transpilePackages` and in the `nx.sync.ignoredDependencies` of its
  `tsconfig.json`. `dafne g frontend-lib` adds both.
- **Relative imports end in `.ts`** in these packages (Turbopack doesn't map
  `.js` to `.ts`).

Backend apps are bundled with **rspack**: it bundles the `@dafne/*`
sources, but loads npm packages from the app's own `node_modules` at
runtime. So **an app lists every runtime dependency of its libs** in its
`package.json`. The generators of the CLI do that when they wire a lib into
an app.

## Hidden folders

`.nxignore` hides the CLI's test fixtures, which look like projects
(`packages/cli/test/fixtures`).

## See also

- [Monorepo structure](structure.md)
- [Project boundaries](boundaries.md)
- [CI and contributing](contributing.md)
