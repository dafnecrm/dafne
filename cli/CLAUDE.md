# dafne cli

Code generator for the Dafne backend (`../backend`, NestJS) and frontend
(`../frontend`, Next.js). `dafne g resource|backend|frontend ...` writes
new files and registers them in the existing ones. Usage is in
`README.md`.

TypeScript ESM, Node ≥ 22, pnpm (workspace package of the Dafne monorepo, see `../CLAUDE.md`). `pnpm dev g ...` runs from source (tsx),
`pnpm build` bundles to `dist/` (tsup), `pnpm test` (vitest),
`pnpm typecheck`.

## Layout

- `src/commands/generate.ts`: commander commands, prompts (@clack/prompts),
  summary and next steps. `generateResource` also takes the fields of a
  new table (`--field`, parsed by `parseFieldSpec`, or asked by
  `askNewFields` in `field.ts`): it adds them with `addField`, then runs
  `syncOne` and `syncFrontend` on the same in-memory change set.
- `src/commands/sync.ts` holds the `dafne sync` commands: `contract` and
  `frontend` (`syncFrontend`: form + table + detail, skipping the parts a
  resource lacks), with `frontend form|table|detail` for one part.
  `frontend` uses positional options, so options after a part go to it.
- `src/commands/migration.ts`: `dafne migration generate|fix`. It runs
  drizzle-kit from `backend/node_modules/.bin` with the terminal attached.
- `src/commands/dev.ts`: `dafne dev`, package scripts as child processes
  (one process group each, so Ctrl+C or a failure stops what they started).
- `src/fields/`: `dafne field add|remove`. `spec.ts` holds the types and
  builders. `table-file.ts` edits one table file (columns, indexes,
  relation parts). `operations.ts` handles the four relation kinds and
  removal.
- `src/sync/service.ts` is the service part of `sync contract`. It edits
  `list<P>` select, `get<S>` findFirst columns and `create<S>`/`update<S>`
  values/set. It only touches members shaped like `key: <table>.key`,
  `key: false` or `key: body.key`; others are hand-written and kept.
- Child tables (`syncChildContract`, `syncChildService`, `childTables` in
  `commands/sync.ts`): other tables of the resource's table file reached
  through a relation, synced into `<child>BodySchema`, the `<Child>`
  interface and the service's relation columns and insert map.
- `src/sync/service-spec.ts` keeps the specs' sample bodies valid: the
  service spec's `body({...})`, and the contract spec's `failedFields` and
  `parse` calls. It only removes keys that were in the body before the sync
  (or were dropped columns), never other unknown keys.
- `src/sync/form.ts` is `dafne sync frontend form`. It reads the contract body
  (`readBody`, which classifies each Zod expression) and adds what's
  missing to the form's `schema.ts` and `<singular>-form.tsx`.
- `src/sync/table-page.ts` and `detail.ts` are `dafne sync frontend table|detail`. They
  read the contract's response with `response.ts` (`readResponse`, plus
  `ignoredKeys` for `dafne-ignore`). The enum labels
  (`<S>_<FIELD>_OPTIONS`) live in `lib/<plural>-table.ts`: it's plain data
  with type-only contract imports, so client components can import it.
- `src/sync/`: `table.ts` reads a Drizzle table (columns, `@api` tags,
  the `@form plain|editor` input of `text` columns, relations); `roles.ts` decides where each column goes (body, list,
  detail, filter, sort) and its Zod/TS types; `contract.ts` merges that
  into the existing contract.
- `src/core/`:
  - `names.ts`: singular/plural names in every casing.
  - `workspace.ts`: finds the Dafne root.
  - `changes.ts`: the in-memory change set.
  - `templates.ts`: EJS rendering.
  - `format.ts`: Prettier.
- `src/generators/`: the pieces (`backend.ts`, `frontend.ts`) and
  dependency resolution (`pieces.ts`).
- `src/wiring/`: edits to existing files. `backend.ts` handles
  nest-cli.json, the tsconfig paths, ApiModule, the database schema, the
  contracts index and the lib's @Module/index. `frontend.ts` handles the
  sidebar (nav titles are keys of the `nav` messages). `messages.ts`
  fills the message catalogs. Shared AST helpers are in `ast.ts`.
- `templates/backend`, `templates/frontend`: one `.ejs` per generated file.

## Rules

- **Templates copy the `customers` resource.** `customers` is the
  reference in both packages, and `../backend/CLAUDE.md` and
  `../frontend/CLAUDE.md` hold their rules. When those patterns change,
  update the templates too. Templates keep one sample field, `name`, plus
  soft delete and created/updated by.
- **Template variables:**
  - `s` and `p` are the singular and plural `Casings`: `kebab`, `camel`,
    `pascal`, `snake`, `constant`, `lower`, `title`.
  - Frontend templates also get `icon`.
  - `<%= %>` writes raw text (escaping is off): the output is code, not
    HTML.
- **Names in generated code:**
  - plural: lib, route, files, classes (`InvoicesService`);
  - singular: table (`invoice`), schemas and types (`invoiceBodySchema`,
    `InvoiceDetail`).
- **Nothing touches the disk until `Changes.commit()`.** Generators call
  `changes.create` and `changes.update` only. `create` fails if the file
  exists (unless `--force`). The first error therefore leaves the project
  untouched, and `--dry-run` just skips the commit.
- **Wiring must be idempotent.** Check before inserting (`ensure*`
  helpers), so running a generator twice registers nothing twice.
- **Wiring edits are text insertions.** ts-morph finds the nodes; the
  helpers in `ast.ts` insert text that copies the file's quotes, indents
  and trailing commas. Don't use ts-morph's own manipulation (`addElement`,
  `addNamedImport`…): its layout doesn't match these files. Each
  `insertText` invalidates earlier nodes, so look them up again afterwards
  (hence the `() => node` getters).
- **Formatting:** `format.ts` runs Prettier on created files, and on
  edited files only if they were Prettier-clean before. Several backend
  files aren't Prettier-clean (e.g. `api.module.ts`), so they're never
  reformatted. JSON files keep their layout (they are edited through
  jsonc-parser).
- **Pieces:** a piece has `deps`, a `marker` file and `generate`.
  `generatePieces` also generates the missing dependencies of the requested
  pieces, and skips the ones whose marker already exists. A new piece needs:
  1. an entry in `backendPieces` or `frontendPieces`;
  2. its templates;
  3. a place in `BACKEND_RESOURCE`/`FRONTEND_RESOURCE` if it belongs to a
     full resource;
  4. a test.
- **`sync contract` edits, it doesn't regenerate.** Members matching a
  column keep their text. Columns are added in table order and removed
  when they leave that part of the API. Non-column members (relations,
  `sortBy`, spreads) stay. The defaults in `roles.ts` must keep
  `customers` in sync with no changes (there is a test for it).
- **Relations live in the file that holds the key.** That file has both
  sides: `activity.customer` and the reverse `customer.activities` both go
  in `activityRelations`. Table files must never import each other both
  ways, because ESM cycles break `defineRelationsPart`, which reads the
  tables eagerly. That's why `schema.ts` combines the parts with
  `mergeRelations` (a per-table merge) instead of a spread; the CLI
  converts it on the first ref. `wireTable` handles both forms.
- **Forms send numbers as numbers and dates as strings.** For numbers, the
  frontend's `NumberField` gives `number | null`. For dates, nullable
  date columns use `optionalDate` in the contracts, which turns "" into
  null. `sync contract` adds it to `packages/contracts/src/common.ts` on first use.
  `formSchema` only compiles when every form value is valid input for the
  contract, so the two must match.
- **Table files are always formatted** after a field edit
  (`Changes.update(..., { format: true })`), even when they weren't
  Prettier-clean before.
- **Generated code holds message keys, never text** (English and
  Italian). Frontend: `t("<plural>.fields.<key>")`, enum labels
  `"<plural>.<field>.<value>"`, from a root `useTranslations()`. Contracts
  and services: `msg('<plural>.<field>.required|invalid')`,
  `msg('<plural>.notFound')`. Before every commit, `syncMessages`
  (`wiring/messages.ts`) adds the keys the run's files use to
  `frontend/messages/*.json` and `packages/contracts/src/messages/*.ts`, with an
  English text derived from the key (`resourceMessages` seeds a new
  resource's titles). Italian gets the English text and a warning. Hooks
  for options (`useOptionLabels`) go after the component's
  `const t = useTranslations()` (`ensureHookLine`), not in render props.
- **Pages live under `frontend/app/[locale]/(app)/`** (the locale is a
  hidden root segment), so route types are `PageProps<"/[locale]/…">`.
- **`frontend`, `backend` and `packages/contracts` are fixed paths** under
  the root (`BACKEND`/`FRONTEND`/`CONTRACTS_SRC` constants). Generated code
  imports the contracts as `@dafne/contracts` (`CONTRACTS_PACKAGE`). The
  CLI must keep working without Nx: it's also meant to be distributed.

## Testing

- **Unit tests:** `test/generate.test.ts` copies `test/fixtures/project`
  to a temp folder and runs the generators there. The fixtures are copies
  of the real files the wiring edits (nest-cli.json, tsconfig.json,
  api.module.ts, schema.ts, contracts index, navigation.ts…). Refresh them
  when the real ones change. `tsconfig.json` excludes them.
- **Changing a template:** also check that the generated code compiles.
  Never generate into the real `../backend` / `../frontend` to test.
  1. Copy the whole monorepo into a scratch folder (without
     `node_modules`, `.next`, `.git`, `dist`, `.env`, `.nx`).
  2. Clone the `node_modules` of the root and of each package with
     `cp -Rc` instead of symlinking: Turbopack won't resolve `next`
     through a symlink outside its root.
  3. Run `pnpm dev g resource invoice --root <copy> -y`.
  4. In the backend copy, run `npx tsc --noEmit` and `npx vitest run`; in
     `packages/contracts`, `npx vitest run`.
  5. In the frontend copy, run `npx next typegen`, then `npx tsc --noEmit`
     and `npx next build`.

## Known issue

drizzle-kit 1.0.0-rc.5 is the latest 1.x and is still unfixed upstream on
the `beta` branch. For MySQL it writes foreign keys inside `CREATE TABLE`
without `ON DELETE`/`ON UPDATE` (`dialects/mysql/convertor.ts`).
`dafne migration generate` (and `migration fix`) put them back from the
migration's `snapshot.json` (`src/migrations/fix.ts`). Once drizzle-kit is
fixed, the fix finds nothing to change; it can then be removed.
