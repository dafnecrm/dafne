# dafne cli

Code generator for the Dafne backend (`../backend`, NestJS) and frontend
(`../frontend`, Next.js). `dafne g resource|backend|frontend ...` writes
new files and registers them in the existing ones. Usage is in
`README.md`.

TypeScript ESM, Node ≥ 22, pnpm. `pnpm dev g ...` runs from source (tsx),
`pnpm build` bundles to `dist/` (tsup), `pnpm test` (vitest),
`pnpm typecheck`.

## Layout

- `src/commands/generate.ts`: commander commands, prompts (@clack/prompts),
  summary and next steps. `src/commands/sync.ts` is `dafne sync contract`.
- `src/commands/migration.ts`: `dafne migration generate|fix`. It runs
  drizzle-kit from `backend/node_modules/.bin` with the terminal attached.
- `src/fields/`: `dafne field add|remove`. `spec.ts` holds the types and
  builders. `table-file.ts` edits one table file (columns, indexes,
  relation parts). `operations.ts` handles the four relation kinds and
  removal.
- `src/sync/form.ts` is `dafne sync form`. It reads the contract body
  (`readBody`, which classifies each Zod expression) and adds what's
  missing to the form's `schema.ts` and `<singular>-form.tsx`.
- `src/sync/table-page.ts` and `detail.ts` are `dafne sync table|detail`. They
  read the contract's response with `response.ts` (`readResponse`, plus
  `ignoredKeys` for `dafne-ignore`). The enum labels
  (`<S>_<FIELD>_OPTIONS`) live in `lib/<plural>-table.ts`: it's plain data
  with type-only contract imports, so client components can import it.
- `src/sync/`: `table.ts` reads a Drizzle table (columns, `@api` tags,
  relations); `roles.ts` decides where each column goes (body, list,
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
  sidebar. Shared AST helpers are in `ast.ts`.
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
  null. `sync contract` adds it to `contracts/src/common.ts` on first use.
  `formSchema` only compiles when every form value is valid input for the
  contract, so the two must match.
- **Table files are always formatted** after a field edit
  (`Changes.update(..., { format: true })`), even when they weren't
  Prettier-clean before.
- **`frontend` and `backend` are fixed folder names** under the root
  (`BACKEND`/`FRONTEND` constants).

## Testing

- **Unit tests:** `test/generate.test.ts` copies `test/fixtures/project`
  to a temp folder and runs the generators there. The fixtures are copies
  of the real files the wiring edits (nest-cli.json, tsconfig.json,
  api.module.ts, schema.ts, contracts index, navigation.ts…). Refresh them
  when the real ones change. `tsconfig.json` excludes them.
- **Changing a template:** also check that the generated code compiles.
  Never generate into the real `../backend` / `../frontend` to test.
  1. Copy both packages into a scratch folder (without `node_modules`,
     `.next`, `.git`, `dist`, `.env`).
  2. Clone the `node_modules` with `cp -Rc` instead of symlinking:
     Turbopack won't resolve `next` through a symlink outside its root.
  3. Run `pnpm dev g resource invoice --root <copy> -y`.
  4. In the backend copy, run `npx tsc --noEmit` and `npx vitest run`.
  5. In the frontend copy, run `npx next typegen`, then `npx tsc --noEmit`
     and `npx next build`.

## Known issue

drizzle-kit 1.0.0-rc.5 is the latest 1.x and is still unfixed upstream on
the `beta` branch. For MySQL it writes foreign keys inside `CREATE TABLE`
without `ON DELETE`/`ON UPDATE` (`dialects/mysql/convertor.ts`).
`dafne migration generate` (and `migration fix`) put them back from the
migration's `snapshot.json` (`src/migrations/fix.ts`). Once drizzle-kit is
fixed, the fix finds nothing to change; it can then be removed.
