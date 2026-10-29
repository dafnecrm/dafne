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
- `app/(app)/<plural>/`: list, detail, new and edit pages, table
  (`<plural>-table.tsx`: table and columns), the action menus
  (`<singular>-table-actions.tsx` for the rows,
  `<singular>-detail-actions.tsx` for the detail page, each with its own
  items) and the confirmation dialogs they share (`<singular>-dialogs.tsx`:
  `Delete<Singular>Dialog`, with `then="list"` to go back to the list after
  it, or the default `"refresh"`), form (`<singular>-form.tsx`),
  detail (`<singular>-detail.tsx`), server actions (`actions.ts`).

Each resource starts with one `name` field. It has soft delete and
created/updated by, as customers do.

It also registers the code in `nest-cli.json`, `tsconfig.json` paths,
`ApiModule`, `database/src/schema.ts`, `contracts/src/index.ts` and
`frontend/lib/navigation.ts`. Re-running never registers twice. Nothing is
written until every file is generated, and new files are formatted with the
target package's Prettier config.

Afterwards: `dafne migration generate`, then replace `name`
with the real fields.

## Adding or removing a field

```sh
dafne field add activities dueDate datetime
dafne field add activities status enum --values open,done --required --default open
dafne field add activities notes text --api internal        # never in the contract
dafne field add activities customer ref --to customers     # foreign key + relations
dafne field remove activities customer
```

Every argument is optional: `dafne field add` alone asks for the table, the
name, the type and its settings (required/unique/index, default, contract
tags; for a ref the table, the relation, on delete and the reverse name).
`dafne field remove` lists the table's columns and relations and asks
before removing. With `-y` (or without a terminal), a missing argument is an
error instead.

Types: `string` (`--length`), `text`, `int`, `bigint`, `float`, `decimal`
(`--precision`, `--scale`), `boolean`, `date`, `datetime`, `enum`
(`--values`), `json`, `ref`. Other options: `--required`, `--unique`,
`--index`, `--default`, `--after <column>`, `--api <tags>`. New columns go
before `createdAt`. Afterwards the contract is synced (see below; skip it
with `--no-sync`).

A `ref` adds a foreign key to `--to <resource>`, with `--relation`:

| Relation | Column | Relations |
|---|---|---|
| `many-to-one` (default) | `<name>Id` here, indexed | `activity.customer` (one), `customer.activities` (many) |
| `one-to-one` | `<name>Id` here, unique | one on both sides |
| `one-to-many` | `<this>Id` on the other table | `customer.<name>` (many), the other way one |
| `many-to-many` | junction table `<this>_<other>` | many on both sides, `through` the junction |

`--inverse <name>` names the relation on the other table, and
`--no-inverse` leaves it out. `--on-delete` takes `cascade`, `set null`,
`restrict` or `no action`: the default is `set null`, or `restrict` with
`--required`.

Both relations go in the file that holds the key (or the junction), so the
table files never import each other. The first ref also switches
`schema.ts` to `mergeRelations(...)` (`libs/database/src/merge-relations.ts`):
it combines the relation parts table by table, where the old spread kept
only the last part of a table. `field remove` takes a column (with its
indexes and relations) or a relation name, e.g. a many-to-many with its
junction table. `auth.ts` is never edited (Better Auth generates it).

## Migrations

```sh
dafne migration generate add-activity-customer   # name asked if missing
dafne migration generate --custom backfill       # empty, for SQL by hand
dafne migration fix [folder]                     # default: the latest
```

`generate` runs drizzle-kit in `backend/`, with the terminal attached, so you
can answer when it asks whether a column was renamed. It then prints the
statements of the new migration.

drizzle-kit 1.0.0-rc.5 drops `ON DELETE`/`ON UPDATE` from foreign keys inside
`CREATE TABLE`. `generate` puts them back from the migration's
`snapshot.json`; skip that with `--no-fix`. `fix` does the same for a
migration made with `pnpm migration:generate`. Only fix migrations no
database has applied yet. The backend applies pending migrations when it
starts.

## Syncing a contract with its table

After changing a table in `backend/libs/database/src/tables/`:

```sh
dafne sync contract activities     # or --all; --dry-run to preview
```

It updates `libs/contracts/src/<plural>.ts`: the body schema, sort and
filter fields, list query and response types. It adds new columns, drops
the ones removed from the API and keeps hand-written validation. Members
that aren't columns (e.g. `addresses`) are left alone.

It also updates the queries in
`libs/<plural>/src/<plural>.service.ts`; skip that with `--no-service`:
- the list's `select({...})` gets the listed columns;
- the detail's `findFirst({ columns })` leaves out (`key: false`) the
  columns that aren't in the response, e.g. `internal` ones;
- the create's `values({...})` and the update's `set({...})` save the body
  fields (`key: body.key`).

Only members of the form `key: <table>.key`, `key: false` and
`key: body.key` are managed. Ids, dates, users and computed values stay as
they are.

The sample bodies in the specs follow the body too:
- in `<plural>.service.spec.ts`, every `body({...})`;
- in the contract's `<plural>.spec.ts`, every `failedFields({...})` and
  `<singular>BodySchema.parse/safeParse({...})`, plus the expected result in
  `expect(parse(...)).toEqual({...})`.

They get the new required fields, with a sample value, and lose the fields
that left the body. Other unknown keys stay: they may be there on purpose,
like the `deletedAt` the schema must reject. Assertions aren't changed.

It doesn't touch the frontend: use `dafne sync form|table|detail` there.

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

## Syncing a form with its contract

```sh
dafne sync form activities     # --dry-run to preview
```

It adds the contract body fields that a form lacks, in
`frontend/app/(app)/<plural>/`. It never changes what's already there.
- **`schema.ts`:**
  - the values type: enums, booleans and numbers get their own type, e.g.
    `Record<Exclude<keyof ActivityBody, "type">, string> & { type: ActivityType }`;
  - the enum options (`TYPE_OPTIONS`);
  - the default values: dates are cut to what the inputs show, required
    numbers start at the table default (or 0).
- **`<singular>-form.tsx`:** a `<form.AppField>` after the last one:
  - text, email, date and datetime-local use `TextField`;
  - enums use `SelectField`, booleans `CheckboxField`, numbers `NumberField`
    (a number, empty = null).

A field counts as present when the form has a `<form.AppField name="…">`
for it, wherever it is and however it was changed. For a field the form
sends without an input, add `{/* dafne-ignore: customerId */}` to the form.
The field still gets its value type and default. Inputs and defaults whose
field left the contract are reported, not removed.

## Syncing a table and a detail page with the contract

```sh
dafne sync table activities     # lib/<plural>-table.ts and <plural>-table.tsx
dafne sync detail activities    # <singular>-detail.tsx
```

Both work like `sync form`. They read `Listed<S>`, `<S>Detail` and the
sort/filter fields of the contract and only add what's missing. A field
counts as present when the file already uses it, wherever it is. Things
whose field left the contract are reported, not removed.

- **`sync table`:**
  - in `lib/<plural>-table.ts`: sort fields in contract order, and filters
    (enum and boolean ones as pick-lists);
  - enum labels (`ACTIVITY_TYPE_OPTIONS`), shared with the columns and the
    detail page;
  - in `app/(app)/<plural>/<plural>-table.tsx` (table and columns): a
    column per listed field, before "Added". `id`,
    `updatedAt` and foreign key ids are never added. Fields that aren't
    sortable get `enableSorting: false`.
- **`sync detail`:** in `<singular>-detail.tsx`, the detail sections. The
  `[id]/page.tsx` page loads the record and keeps `PageContent` (title,
  actions); what it shows, like the name, isn't added again. It adds a `<Detail>` per field
  the page doesn't read
  (`activity.<field>`), in a "Details" section. The section is created
  before "Record" if missing.

To keep a field out, write `{/* dafne-ignore: firstname, lastname */}` (or
`// dafne-ignore: …` in a .ts file) in that file. Lists are often curated:
the users list, for example, leaves out on purpose fields that
`sync table users` would add.

## Development

`pnpm dev g ...` runs from source; `pnpm test` runs generators against
`test/fixtures/project` (copies of the real files that get edited) in a
temp folder; refresh the fixtures when those files change.
