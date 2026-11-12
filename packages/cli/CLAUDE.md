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
  - `backend-resource`: contract, table, lib, service, controller (in a
    lib of its own, or with `lib` in `packages/backend/<lib>/src/<plural>`
    of an existing one: `Ctx.lib`, `resourceSrc`; `serviceFile` finds the
    service either way for the syncs); then the
    `fields` (`name:type[:option…]`) go into the table and the contract,
    service and specs are synced with them.
  - `backend-changelog` (and `backend-resource` with `changelog`):
    `addChangelog` (`wiring/changelog.ts`) turns on a resource's change
    log: `<singular>.changelog.ts` (`templates/backend/changelog.ts`,
    the body's fields), `ChangelogModule.forFeature` in the module,
    `registry.for(<P>_RESOURCE…)` in the service, `GET :id/changes` and
    `ChangelogService` in the controller, the lib's and the app's
    dependencies and references. Each step is skipped when done already.
    With `partition`, a hand-written migration of
    `@dafne/backend-database-changelog` (`migration.sql` and a snapshot
    chained to the last one) for `changelog.change_<plural>`: one
    `CREATE TABLE … PARTITION OF`, or, when the resource was logged
    already, the version that moves its rows out of `change_default`. A
    module with a state machine gets a warning: its
    `changelogTransitionHook` is added by hand.
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
    `apps/<app>` (`--app`, default `sales-web`) or in a frontend lib
    (`--lib`; `resolveTarget`: the lib given, else where the resource
    already is, else the app). The list, detail and form are synced with
    the contract; message keys go into the app's catalogs, or the lib's
    for the resource's own namespace. A logged resource (`loggedFields`,
    `wiring/changelog.ts`: `ChangelogModule.forFeature` in its module,
    the fields of `<singular>.changelog.ts`, plus `status` with
    `changelogTransitionHook`) gets its history when
    `packages/frontend/changelog` exists (`hasChangelogFrontend`):
    `FrontendCtx.changelog` (the templates' `changelog`, else null) adds
    the fetcher, the server action, `<singular>-changelog.tsx` and the
    History item of the detail actions; `wireChangelogFrontend` (after the
    pieces: a new lib's package.json is theirs) wires the lib and its
    texts (`wireMessages`). Existing pages: `historyOfPages`
    (`sync/history.ts`, run by `backend-changelog` on the default app and
    by `frontend-resource-sync`) adds what they lack with `addHistory`
    (the fetcher and action from `templates/frontend/partials`, which the
    data and actions templates include too; the sheet; the History item,
    its state and the sheet placed after Edit and the menu of the detail
    actions, warned when those aren't found) and `syncHistoryFields`
    (the logged fields the sheet's `fields` lacks).
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
    Then `historyOfPages` (a logged resource's history) and
    `pruneFrontendMessages`.
  `src/generators/run.ts` (`runGenerator`) wraps them: change set, Prettier,
  warnings, and the next steps printed after Nx writes the files.
- `src/index.ts`, `src/commands/`: the `dafne` command (commander, clack).
  `generate.ts` asks for what's missing (for a backend resource, a new
  lib or an existing one, the id, the fields, with the questions in `field-prompts.ts`, whether it keeps a change log;
  for `backend-resource --changelog` and `backend-changelog`, whether it gets a partition of its own; `backend-changelog`
  first checks the resource exists, `crudResources`, and offers the closest, `core/names.ts` `closest`) and runs `nx g`: its
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
  is the backend app for backend pieces, the frontend app for frontend ones;
  `FrontendCtx.target` says whether the frontend code goes into the app or a lib.
- `src/core/frontend-target.ts`: `FrontendTarget` (app, or lib with its
  `dir` and `pkg`), `findFrontendTarget`, the paths of a resource's files
  in either layout (`dataFiles`, `formFiles`… `routeDir` always in the
  app) and `pageRefs`, how the synced code refers to them (imports, links,
  message-key type).
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
  `syncDetailPage`, all three in `syncResourcePages`) on an app or lib
  target. `dropped.ts` fixes what removed columns leave in the backend
  (default sort, enums, specs).
- `src/wiring/`: edits to existing files (`backend.ts`: app module,
  package.json, project references, schema.ts, contracts index;
  `frontend.ts`: next.config.ts and tsconfig of a frontend app, sidebar
  links (`wireNav`, `lib/navigation.ts`), a lib for a resource
  (`createFrontendLib`, `wireResourceLib`: exports, dependencies, index,
  catalogs, `wireLibMessages` in `i18n/request.ts` and `global.d.ts`);
  `messages.ts`: message catalogs (the app's JSON, the contracts', the
  libs' `messages/<locale>.ts` found by `libCatalogs` from their
  `<X>MessageKey` type), `syncMessages` adds keys and
  `prune*Messages` removes those the changed files stopped using;
  `ast.ts`: helpers).
- `templates/backend` and `templates/frontend` (copies of the `customers`
  resource; their services and controllers implement `CrudService` /
  `CrudController` from `@dafne/backend-crud`, and the syncs find the
  methods by those fixed names: `list`, `get`, `create`, `update`; the
  writes run in `this.hooks` callbacks (`CrudHooks`), still named `body`),
  `templates/app` (a minimal `apps/sales-api`),
  `templates/frontend-lib-resource` (a resource in a lib: copies of
  `packages/frontend/sales-orders` without its order-specific code, `app/`
  for its route pages),
  `templates/frontend-app` (`apps/sales-web` without its resources and
  users pages), `templates/frontend-lib` (set up like
  `packages/frontend/auth`). Dotfiles are stored without the dot.

## Rules

Templates, names, wiring, relations, messages and formatting:

- **Templates copy `customers`** (and `packages/frontend/sales-orders` for
  a resource in a lib, `apps/sales-api`, `apps/sales-web` for the apps). When those
  patterns change, update the templates. They are rendered by
  `core/templates.ts` (EJS, escaping off), not by devkit's `generateFiles`,
  which escapes `<%= %>`.
- **A resource starts with no field**: only an `id`, the dates and the audit
  columns. The id is `serial` unless `idType` is `uuid` or `varchar`
  (`idLength`, default 36): `core/id.ts` holds what the backend templates
  write for each (`id` in their data, `renderBackend`), the frontend
  templates type it as `<S>Detail["id"]`. Its body is `z.strictObject({})`, its only filter and first sort
  field the `id` (always both, whatever its type, unless `@api nofilter` /
  `@api nosort`; as a filter a query param of digits, a
  uuid or text up to the id's length). A key to another record is a filter
  too: the id and the keys are in the service's `EXACT_FILTERS` (matched
  with `eq`; `syncService` keeps it in line, and adds it to a service from
  before it), the other filters use `ilike`), the pages name a record
  `${t("<plural>.singular")} ${<record>.id}` (title, breadcrumb, dialogs,
  aria-labels), the list sync adds the id as the first column, linking
  to the detail page, when the contract lists it (`@api` tags may not),
  and the form has an empty "Details" section (a `DetailSection` grid),
  where the sync puts the first `<form.AppField>`. The tests that need a field add a
  `name` themselves. A key to a serial id is `integer`, `requiredId` /
  `optionalId` in the contract, the `id` kind (text input) in the form; a
  key to a uuid id is `uuid`, `requiredUuid` / `optionalUuid` in the
  contract (the `uuid` kind, a text input, in the form); to a varchar id a
  `varchar` of its length, `requiredText` / `optionalText`.
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
     `g frontend-resource invoice`, `g frontend-resource <other> --lib <lib>`, `g backend-lib`, `g backend-app`,
     `g contract`, `g frontend-app`, `g frontend-lib`, and after changing
     a removal or a sync `remove backend-db-column <resource> <column> -y`
     and `sync frontend-resource <resource> -y` on a generated
     resource; then `pnpm install --offline` and `npx nx sync`.
  3. `npx nx sync:check` must find nothing, and
     `npx nx run-many -t lint typecheck test build` must pass.
