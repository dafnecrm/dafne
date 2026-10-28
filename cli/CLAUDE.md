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
  summary and next steps.
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
without `ON DELETE`/`ON UPDATE` (`dialects/mysql/convertor.ts`). The
migration of every generated table therefore loses `ON DELETE SET NULL` on
`created_by_id`/`updated_by_id`, and the next steps printed for a backend
`table` say so. Remove that hint once drizzle-kit is fixed.
