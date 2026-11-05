[← Index](README.md)

# The `dafne` CLI

`@dafne/cli` (`packages/cli`) is the `dafne` command. It does three things:

- **generates** backend code, apps, contracts and frontend libs, through
  this workspace's own Nx generators;
- runs the **database** migrations;
- gives **shortcuts** for Nx tasks.

## Running it

From the root, with no build (Node runs the TypeScript sources):

```sh
pnpm dafne <command>
pnpm dafne --help
pnpm dafne g --help
```

Arguments left out are asked interactively. With `-y` (`--yes`) the CLI
never prompts and fails instead, which suits scripts and CI.

## Generating: `dafne g`

```sh
dafne g <kind> <name> [options]
```

| Kind           | What it creates                                                       |
| -------------- | --------------------------------------------------------------------- |
| `resource`     | contract + table + Nest lib with module, service, controller and specs |
| `lib`          | an empty Nest lib, `@dafne/backend-<name>`                             |
| `app`          | a NestJS app in `apps/<name>`                                          |
| `contract`     | a contract in `packages/contracts`                                    |
| `frontend-lib` | an empty frontend lib, `@dafne/frontend-<name>`                        |

Common options:

| Option          | Meaning                                                           |
| --------------- | ----------------------------------------------------------------- |
| `--dry-run`     | show what would change, write nothing                             |
| `--force`       | overwrite files that already exist (otherwise creating one fails) |
| `-y`, `--yes`   | never prompt                                                      |
| `--app <name>`  | `lib`, `resource`: the backend app to wire into (default `crm-api`) |
| `--port <port>` | `app`: default port (3001; `PORT` overrides it)                   |
| `--field <spec>`| `resource`: a field of the new table, repeatable                  |

Names: a resource or contract can be singular or plural (`invoice`,
`invoices`, `invoiceItem`); a lib, frontend lib or app is used as given.

Nothing is written unless the whole generator succeeds. New files are
formatted with Prettier; edited files only if they were Prettier-clean
before. Wiring is idempotent: running again never registers twice.

### `g resource`

```sh
dafne g resource invoice
dafne g resource invoice \
  --field number:string:length=20:required:unique \
  --field status:enum:values=draft|sent|paid:default=draft \
  --field dueDate:date \
  --field customer:ref:to=customers
```

It creates, following the patterns of the `customers` resource:

- `packages/backend/<plural>/`: the lib `@dafne/backend-<plural>` (module,
  service, controller, specs), a workspace package;
- `packages/contracts/src/<plural>.ts` and its spec;
- `packages/backend/database/src/tables/<plural>.ts`.

And wires them: the lib into the app (`package.json`, app module, project
references), the table into `schema.ts`, the contract into the contracts'
index, the message keys into the catalogs.

Each resource starts with a sample `name` field, soft delete (`deletedAt`)
and created/updated by. Without `--field`, the CLI asks for the fields one
by one (an empty name ends the list). The fields go into the table; then the
contract, the service and the specs are synced with them.

#### Field specs

```
name:type[:option…]
```

| Part   | Values                                                                                                     |
| ------ | ---------------------------------------------------------------------------------------------------------- |
| Types  | `string`, `text`, `int`, `bigint`, `float`, `decimal`, `boolean`, `date`, `datetime`, `enum`, `json`, `ref` |
| Flags  | `required`, `unique`, `index`, `editor` (rich text, `text` only)                                           |
| Values | `length`, `values`, `default`, `precision`, `scale`, `api`, `to`, `relation`, `on-delete`, `inverse`        |

Lists use `|` (`values=draft|sent|paid`); `inverse=-` means no inverse
relation.

A `ref` adds a foreign key to the table in `to`:

| `relation`              | Column                          |
| ----------------------- | ------------------------------- |
| `many-to-one` (default) | `<name>Id` here, indexed        |
| `one-to-one`            | `<name>Id` here, unique         |
| `one-to-many`           | `<this>Id` on the other table   |
| `many-to-many`          | junction table `<this>_<other>` |

`on-delete`: `cascade`, `set null`, `restrict`, `no action` (default
`set null`, or `restrict` when `required`).

`api` controls where a column shows up in the contract:

| Tag                   | Effect                          |
| --------------------- | ------------------------------- |
| `internal`            | never in the contract           |
| `readonly`            | in responses only               |
| `writeonly`           | in the body only                |
| `detail`              | in the detail, not in the list  |
| `filter` / `nofilter` | force or prevent filtering      |
| `sort` / `nosort`     | force or prevent sorting        |

### `g lib`

```sh
dafne g lib reports                  # @dafne/backend-reports, wired into crm-api
dafne g lib jobs --app worker        # wired into apps/worker
```

An empty Nest lib in `packages/backend/<name>` (module, `index.ts`, vitest),
tagged `scope:backend` and registered in the app.

### `g app`

```sh
dafne g app worker --port 3002
```

A NestJS app in `apps/<name>`, set up like a minimal `apps/crm-api`:
rspack build, vitest, oxlint, Prettier, a root module and a controller.
Its `main.ts` migrates on startup with `MIGRATE_ON_START=true`.

### `g contract`

```sh
dafne g contract report              # packages/contracts/src/reports.ts + spec
```

### `g frontend-lib`

```sh
dafne g frontend-lib charts          # @dafne/frontend-charts
```

An empty lib in `packages/frontend/<name>`, set up like
`packages/frontend/auth`, tagged `scope:frontend`, and wired into
`apps/crm-web`: dependency, `transpilePackages` in `next.config.ts`,
`nx.sync.ignoredDependencies`, root project reference.

### After generating

The generator prints the next steps. Usually:

```sh
pnpm install          # links the new package
pnpm nx sync          # TypeScript project references
pnpm dafne db generate   # after a new table: its migration
```

### Running the generators with Nx

Each kind is an Nx generator of `@dafne/cli`:

```sh
pnpm nx g @dafne/cli:backend-resource invoice --fields=number:string:required
pnpm nx g @dafne/cli:backend-lib reports
pnpm nx g @dafne/cli:backend-app worker
pnpm nx g @dafne/cli:contract report
pnpm nx g @dafne/cli:frontend-lib charts
pnpm nx list @dafne/cli
```

Don't use `@nx/nest`'s generators: they write a `project.json`, which this
workspace doesn't use.

## Databases

```sh
dafne db migrate                         # apply every database's pending migrations
dafne db generate                        # a migration of @dafne/backend-database (dafne_crm)
dafne db generate <package> --name x     # of another database package
dafne db generate --custom --name x      # an empty migration, for SQL by hand
dafne db move <from> <to>                # one time: move every table of a database
```

They run the targets of `@dafne/backend-migrator` and of the database
packages. `migrate` needs `MIGRATIONS_DATABASE_URL`. See
[Databases and migrations](databases.md).

## Running tasks

```sh
dafne dev                            # @dafne/auth, @dafne/crm-api, @dafne/crm-web in watch mode
dafne dev @dafne/worker              # given projects
dafne test                           # every project
dafne test @dafne/backend-customers
dafne build | lint | typecheck [projects...]
dafne run test:e2e @dafne/crm-api    # any target
dafne affected                       # lint, typecheck, test, build of what changed
dafne affected test                  # only some targets
dafne projects                       # list the projects
dafne projects -t dev                # those with a target
```

They run `nx run-many` (or `nx affected`) with the terminal attached; Nx
adds the dependencies each target needs.

| Option            | Meaning                                                   |
| ----------------- | --------------------------------------------------------- |
| `--pick`          | choose the projects interactively, from those with the target |
| `--skip-nx-cache` | run even what is cached                                   |

## See also

- [Recipes](workflows.md)
- [Databases and migrations](databases.md)
- [Build system (Nx)](nx.md)
- [CI and contributing](contributing.md#changing-the-cli)
