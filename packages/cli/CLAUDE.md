# dafne cli

The `dafne` command and an Nx plugin with the backend generators and the
frontend lib generator. Usage is
in `README.md`. The frontend pages, `sync`, `field` and `migration`
are still in the previous CLI, `../cli-old` (`dafne-old`).

TypeScript ESM, Node ≥ 26, **no build**: Node runs `src/index.ts` (type
stripping) and Nx loads the generators from their sources too. Hence only
erasable syntax (no enums, namespaces or constructor parameter properties;
`erasableSyntaxOnly` checks it) and relative imports end in `.ts`.
`pnpm test` (vitest), `pnpm typecheck` (TypeScript 7, its own script).

## Layout

- `generators.json`: the Nx generators (`nx g @dafne/cli:<name>`), each in
  `src/generators/<name>/` with `generator.ts` (default export) and
  `schema.json`:
  - `backend-resource`: contract, table, lib, service, controller; then the
    `fields` (`name:type[:option…]`) go into the table and the contract,
    service and specs are synced with them.
  - `backend-lib`: an empty lib, named as given (not pluralized).
  - `backend-app`: a Nest app in `apps/<name>` (`templates/app`), which
    migrates on startup with `MIGRATE_ON_START=true` (`@dafne/backend-migrator`).
  - `contract`: a contract and its spec.
  - `frontend-lib`: an empty lib in `packages/frontend/<name>`
    (`templates/frontend-lib`), wired into `apps/crm-web` (dependency,
    `transpilePackages`, `nx.sync.ignoredDependencies`, root reference).
  `src/generators/run.ts` (`runGenerator`) wraps them: change set, Prettier,
  warnings, and the next steps printed after Nx writes the files.
- `src/index.ts`, `src/commands/`: the `dafne` command (commander, clack).
  `generate.ts` asks for what's missing (for a resource, the fields, with
  the questions in `field-prompts.ts`) and runs `nx g`. `tasks.ts` maps
  `dev`, `test`, `build`, `lint`, `typecheck`, `run`, `affected` to
  `nx run-many`/`nx affected` (`core/nx.ts`).
- `src/core/changes.ts`: `Changes`, the old CLI's change set rebuilt on the
  Nx `Tree` (`exists`, `read`, `list`, `create`, `update`, `warn`), so the
  field, sync and wiring code from the old CLI works unchanged on it.
- `src/pieces/`: the pieces of a backend resource (`backendPieces`,
  dependency order in `generatePieces`).
- `src/fields/`: column types and builders (`spec.ts`), `--field` specs
  (`parse.ts`: `parseFieldSpec`, and `formatFieldSpec` back), table file
  edits (`table-file.ts`, `operations.ts`: `addField`).
- `src/sync/`: reads a Drizzle table (`table.ts`), decides where each
  column goes (`roles.ts`), merges into the contract (`contract.ts`), the
  service (`service.ts`) and the specs' samples (`service-spec.ts`);
  `resource.ts` (`syncOne`) runs them all; `body.ts` reads a body schema.
- `src/wiring/`: edits to existing files (`backend.ts`: app module,
  package.json, project references, schema.ts, contracts index;
  `frontend.ts`: next.config.ts and tsconfig of `apps/crm-web`;
  `messages.ts`: message catalogs; `ast.ts`: helpers).
- `templates/backend` (copies of the `customers` resource), `templates/app`
  (a minimal `apps/crm-api`), `templates/frontend-lib` (set up like
  `packages/frontend/auth`). Dotfiles are stored without the dot.

## Rules

The rules of `../cli-old/CLAUDE.md` about templates, names, wiring, relations,
messages and formatting still hold here. In short:

- **Templates copy `customers`** (and `apps/crm-api` for the app). When those
  patterns change, update the templates. They are rendered by
  `core/templates.ts` (EJS, escaping off), not by devkit's `generateFiles`,
  which escapes `<%= %>`.
- **Generators only touch the `Tree`**, through `Changes`. Nx writes it if
  the generator succeeds, and never with `--dry-run`. `create` fails on an
  existing file unless `--force`.
- **Wiring must be idempotent** (`ensure*` helpers) and is text insertions
  located with ts-morph, keeping the file's quotes, indents and commas.
- **Formatting:** `Changes.format()` runs Prettier on created files, and on
  edited files only if they were Prettier-clean before (not devkit's
  `formatFiles`: it would reformat `crm-api.module.ts`). A `.prettierrc`
  created in the same run is used for the files next to it.
- **A lib wired into an app** adds to the app its package, its
  dependencies (rspack loads npm packages from the app's `node_modules`),
  and the project references `nx sync` would write.
- **Generated code holds message keys**, and `syncMessages` adds them to the
  catalogs before the generator returns.
- **Scope tags:** generated packages get their `nx.tags` (`scope:backend`,
  `scope:frontend`), see `../../tools/boundaries.mjs`.
- Fixed paths are in `core/workspace.ts` (`apps/<app>`, `packages/backend`,
  `packages/frontend`, `packages/contracts`). The default app is `crm-api`.

## Testing

- `test/generators.test.ts` runs each generator on a copy of
  `test/fixtures/project` through an Nx `FsTree` (`test/helpers.ts`). The
  fixtures are copies of the real files the wiring edits: refresh them
  when those change.
- The other tests come from the old CLI (fields, contract/service sync).
- **Changing a template or a generator:** also check the generated code.
  Never generate into the real workspace to test.
  1. Copy the monorepo into a scratch folder (without `node_modules`,
     `.next`, `.git`, `dist`, `.env`, `.nx`, `out-tsc`), `pnpm install --offline`.
  2. There: `pnpm dafne g resource invoice --field … -y`, `g lib`, `g app`,
     `g contract`, `g frontend-lib`, then `pnpm install --offline` and `npx nx sync`.
  3. `npx nx sync:check` must find nothing, and
     `npx nx run-many -t lint typecheck test build` must pass.
