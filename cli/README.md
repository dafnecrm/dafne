# @dafne/cli

Generates code for the Dafne backend (NestJS) and frontend (Next.js),
following the patterns of the `customers` resource.

## Usage

```sh
cd cli && pnpm install && pnpm build && npm link   # once: `dafne` on PATH
# or, without linking: pnpm --dir cli dev g ...
```

Run it anywhere inside the Dafne folder (the one holding `backend/` and
`frontend/`), or pass `--root`. A missing argument is asked for
interactively; `-y` fails instead.

```sh
dafne g resource invoice              # backend + frontend
dafne g resource invoice --backend    # or --frontend
dafne g backend <piece> invoice       # contract | table | lib (module) | service | controller
dafne g frontend <piece> invoice      # data | actions | table | detail | form | nav
dafne g frontend page reports/monthly # blank page at app/(app)/reports/monthly
dafne g frontend component status-badge --client [--dir components]
```

The name can be singular or plural (`invoice`, `invoices`, `invoiceItem`).
A piece also generates the pieces it needs when they're missing (a
`controller` brings the lib, contract, table and service).

Options: `--dry-run`, `--force` (overwrite), `--skip-wiring` (don't edit
existing files), `--root <dir>`, `-y`; for the sidebar `--section <title>`
(default `CRM`), `--icon <LucideIcon>` (default `FileIcon`), `--admin`.

## What it generates

Backend:
- `libs/<plural>/`: module, service (+ spec), controller.
- `libs/contracts/src/<plural>.ts` (+ spec).
- `libs/database/src/tables/<plural>.ts`.

Frontend:
- `lib/<plural>.ts` and `lib/<plural>-table.ts`.
- `app/(app)/<plural>/`: list, detail, new and edit pages, form, actions.

Each resource starts with one `name` field. It has soft delete and
created/updated by, as customers do.

It also registers the code in `nest-cli.json`, `tsconfig.json` paths,
`ApiModule`, `database/src/schema.ts`, `contracts/src/index.ts` and
`frontend/lib/navigation.ts`. Re-running never registers twice. Nothing is
written until every file is generated, and new files are formatted with the
target package's Prettier config.

Afterwards: `cd backend && pnpm migration:generate`, then replace `name`
with the real fields.

## Syncing a contract with its table

After changing a table in `backend/libs/database/src/tables/`:

```sh
dafne sync contract activities     # or --all; --dry-run to preview
```

It updates `libs/contracts/src/<plural>.ts`: the body schema, sort and
filter fields, list query and response types. It adds new columns, drops
the ones removed from the API and keeps hand-written validation. Members
that aren't columns (e.g. `addresses`) are left alone. It doesn't touch the
service or the frontend: the typecheck shows what to update there.

Which column goes where follows the customers contract:
- `id` and server-filled columns (`defaultNow`, `$onUpdate`…) are in
  responses only.
- `deletedAt` is in the detail only.
- `createdById`/`updatedById` and names like password/token are left out.

Override that with a comment above the column:

```ts
/** @api internal */          // backend only: never in the contract
testinternal: varchar('testinternal', { length: 10 }),
```

| Tag | Effect |
|---|---|
| `internal` | never in the contract |
| `readonly` | in responses only |
| `writeonly` | in the body only |
| `detail` | in the detail, not in the list |
| `filter` / `nofilter` | force or prevent filtering |
| `sort` / `nosort` | force or prevent sorting |

## Development

`pnpm dev g ...` runs from source; `pnpm test` runs generators against
`test/fixtures/project` (copies of the real files that get edited) in a
temp folder; refresh the fixtures when those files change.
