# dafne cli

The `dafne` command and an Nx plugin with the backend and frontend
generators. Usage is
in `README.md`.

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
    (`templates/frontend-lib`), wired into a frontend app, `--app` (default
    `sales-web`): dependency, `transpilePackages`,
    `nx.sync.ignoredDependencies`, root reference.
  - `frontend-resource` and one generator per part, `frontend-data`,
    `frontend-actions`, `frontend-list`, `frontend-detail`, `frontend-form`,
    `frontend-nav`: thin wrappers of `generateFrontendPieces`
    (`src/generators/frontend-pieces.ts`) over the frontend pieces, in
    `apps/<app>` (`--app`, default `sales-web`). The list, detail and form
    are synced with the contract; message keys go into the app's catalogs.
  - `frontend-app`: a Next app in `apps/<name>` (`templates/frontend-app`,
    every file rendered, binaries copied as they are).
  - `remove-backend-db-column`: `removeField` for each column, then
    `syncOne` (with the dropped columns) and `syncDropped`
    (`sync/dropped.ts`: default sort, enums, specs) on each table that
    changed, and `pruneContractMessages`. The migration is the command's.
  - `contract-sync` (`dafne sync contract`): `syncOne` on a resource, or
    with `all` on every table file that has a contract (one the sync can't
    read is skipped, its partial edits undone with `Changes.checkpoint`);
    `service: false` leaves the service and its spec alone. Then
    `syncMessages`.
  - `frontend-resource-sync` (`dafne sync frontend-resource`): `syncResourcePages` (`sync/frontend.ts`)
    with `prune` (unless `keep`): the list, detail and form syncs also
    remove what the contract dropped, then the enum labels it no longer
    has, and `useIdForDropped` puts the record's label
    (`${t("<plural>.singular")} ${<record>.id}`) where the pages still read a
    dropped field; with `keep` those reads are warned as `file:line`.
    Then `pruneFrontendMessages`.
  `src/generators/run.ts` (`runGenerator`) wraps them: change set, Prettier,
  warnings, and the next steps printed after Nx writes the files.
- `src/index.ts`, `src/commands/`: the `dafne` command (commander, clack).
  `generate.ts` asks for what's missing (for a backend resource, the
  fields, with the questions in `field-prompts.ts`) and runs `nx g`: its
  kinds are the generators' names, and it rejects options a kind doesn't
  take. `remove.ts` (`dafne remove backend-db-column`: asks for the table
  and the columns, runs the generator, then `db generate` unless
  `--no-migration` or declined) and `sync.ts` (`dafne sync contract`,
  `dafne sync frontend-resource`) do the same for their generators. `tasks.ts` maps
  `dev`, `test`, `build`, `lint`, `typecheck`, `run`, `affected` to
  `nx run-many`/`nx affected` (`core/nx.ts`).
- `src/core/changes.ts`: `Changes`, the old CLI's change set rebuilt on the
  Nx `Tree` (`exists`, `read`, `list`, `create`, `update`, `warn`), so the
  field, sync and wiring code from the old CLI works unchanged on it.
- `src/pieces/`: the pieces of a resource, `backendPieces` and
  `frontendPieces` (`data`, `actions`, `list`, `detail`, `form`, `nav`);
  `generatePieces` adds the missing dependencies (by marker file). `Ctx.app`
  is the backend app for backend pieces, the frontend app for frontend ones.
- `src/fields/`: column types and builders (`spec.ts`), `--field` specs
  (`parse.ts`: `parseFieldSpec`, and `formatFieldSpec` back), table file
  edits (`table-file.ts`, `operations.ts`: `addField`).
- `src/sync/`: reads a Drizzle table (`table.ts`), decides where each
  column goes (`roles.ts`), merges into the contract (`contract.ts`), the
  service (`service.ts`) and the specs' samples (`service-spec.ts`);
  `resource.ts` (`syncOne`) runs them all; `body.ts` reads a body schema.
  Frontend: `response.ts` reads a contract's responses, `form.ts`,
  `table-page.ts` and `detail.ts` add the missing fields to the form, the
  list and the detail, and with `prune` remove what the contract dropped;
  `frontend.ts` runs them on a resource's files (`syncForm`, `syncList`,
  `syncDetailPage`, all three in `syncResourcePages`) and holds their
  paths. `dropped.ts` fixes what removed columns leave in the backend
  (default sort, enums, specs).
- `src/wiring/`: edits to existing files (`backend.ts`: app module,
  package.json, project references, schema.ts, contracts index;
  `frontend.ts`: next.config.ts and tsconfig of a frontend app, sidebar
  links (`wireNav`, `lib/navigation.ts`);
  `messages.ts`: message catalogs, `syncMessages` adds keys and
  `prune*Messages` removes those the changed files stopped using;
  `ast.ts`: helpers).
- `templates/backend` and `templates/frontend` (copies of the `customers`
  resource), `templates/app` (a minimal `apps/sales-api`),
  `templates/frontend-app` (`apps/sales-web` without its resources and
  users pages), `templates/frontend-lib` (set up like
  `packages/frontend/auth`). Dotfiles are stored without the dot.

## Rules

Templates, names, wiring, relations, messages and formatting:

- **Templates copy `customers`** (and `apps/sales-api`, `apps/sales-web`
  for the apps). When those
  patterns change, update the templates. They are rendered by
  `core/templates.ts` (EJS, escaping off), not by devkit's `generateFiles`,
  which escapes `<%= %>`.
- **A resource starts with no field**: only a `serial` `id`, the dates and the audit
  columns. Its body is `z.strictObject({})`, its only filter the `id`
  (always a filter, unless `@api nofilter`: a query param of digits that
  the service matches with `eq`, the other filters with `ilike`), the pages name a record
  `${t("<plural>.singular")} ${<record>.id}` (title, breadcrumb, dialogs,
  aria-labels), the list sync adds the id as the first column, linking
  to the detail page, when the contract lists it (`@api` tags may not),
  and the form has an empty fields grid, where the sync
  puts the first `<form.AppField>`. The tests that need a field add a
  `name` themselves. A key to a serial id is `integer`, `requiredId` /
  `optionalId` in the contract, the `id` kind (text input) in the form.
- **Generators only touch the `Tree`**, through `Changes`. Nx writes it if
  the generator succeeds, and never with `--dry-run`. `create` fails on an
  existing file unless `--force`.
- **Wiring must be idempotent** (`ensure*` helpers) and is text insertions
  located with ts-morph, keeping the file's quotes, indents and commas.
- **Formatting:** `Changes.format()` runs Prettier on created files, and on
  edited files only if they were Prettier-clean before (not devkit's
  `formatFiles`: it would reformat `sales-api.module.ts`). A `.prettierrc`
  created in the same run is used for the files next to it.
- **A lib wired into an app** adds to the app its package, its
  dependencies (rspack loads npm packages from the app's `node_modules`),
  and the project references `nx sync` would write.
- **Generated code holds message keys**, and `syncMessages` adds them to the
  catalogs before the generator returns. Removals prune only the keys the
  run's changed files used before and no file uses now.
- **ts-morph forgets nodes when the text changes** (`insertText`,
  `removeText`, `replaceWithText`): a loop that edits looks its nodes up
  again after each edit, never reuses a list collected before.
- **Scope tags:** generated packages get their `nx.tags` (`scope:backend`,
  `scope:frontend`), see `../../tools/boundaries.mjs`.
- Fixed paths are in `core/workspace.ts` (`apps/<app>`, `packages/backend`,
  `packages/frontend`, `packages/contracts`). The default apps are
  `sales-api` (backend) and `sales-web` (frontend).

## Testing

- `test/generators.test.ts` runs each generator on a copy of
  `test/fixtures/project` through an Nx `FsTree` (`test/helpers.ts`). The
  fixtures are copies of the real files the wiring edits: refresh them
  when those change.
- The other tests come from the old CLI (fields, contract/service sync,
  form/list/detail sync).
- **Changing a template or a generator:** also check the generated code.
  Never generate into the real workspace to test.
  1. Copy the monorepo into a scratch folder (without `node_modules`,
     `.next`, `.git`, `dist`, `.env`, `.nx`, `out-tsc`), `pnpm install --offline`.
  2. There: `pnpm dafne g backend-resource invoice --field … -y`,
     `g frontend-resource invoice`, `g backend-lib`, `g backend-app`,
     `g contract`, `g frontend-app`, `g frontend-lib`, and after changing
     a removal or a sync `remove backend-db-column <resource> <column> -y`
     and `sync frontend-resource <resource> -y` on a generated
     resource; then `pnpm install --offline` and `npx nx sync`.
  3. `npx nx sync:check` must find nothing, and
     `npx nx run-many -t lint typecheck test build` must pass.
