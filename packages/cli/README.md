# @dafne/cli

The `dafne` command: generates backend code and frontend libs through Nx
generators, runs the database migrations and Nx tasks.

From the root: `pnpm dafne <command>` (no build needed). Arguments left out
are asked interactively; `-y` fails instead.

## Generating

```sh
dafne g resource invoice             # contract + table + lib with service and controller
dafne g lib reports                  # empty Nest lib: @dafne/backend-reports
dafne g app worker --port 3002       # NestJS app in apps/worker
dafne g contract report              # packages/contracts/src/reports.ts
dafne g frontend-lib charts          # @dafne/frontend-charts, used by apps/crm-web
dafne g lib jobs --app worker        # wire the lib into another app (default: crm-api)
```

Options: `--dry-run`, `--force` (overwrite), `-y`.

`g resource` asks for the fields of the new table (an empty name ends the
list), or takes them with `--field`, repeatable:

```sh
dafne g resource invoice \
  --field number:string:length=20:required:unique \
  --field status:enum:values=draft|sent|paid:default=draft \
  --field dueDate:date \
  --field customer:ref:to=customers
```

The spec is `name:type[:option…]`. Types: `string`, `text`, `int`, `bigint`,
`float`, `decimal`, `boolean`, `date`, `datetime`, `enum`, `json`, `ref`.
Flags: `required`, `unique`, `index`, `editor`. Values: `length`, `values`,
`default`, `precision`, `scale`, `api`, `to`, `relation`, `on-delete`,
`inverse` (`-` for none); lists use `|`.

The fields go into the table, then the contract, the service and their
specs are synced with them. The sample `name` field stays.

Each command runs a generator of this package, which can also be run with
Nx directly:

```sh
pnpm nx g @dafne/cli:backend-resource invoice --fields=number:string:required
pnpm nx g @dafne/cli:backend-lib reports
pnpm nx g @dafne/cli:backend-app worker
pnpm nx g @dafne/cli:contract report
pnpm nx g @dafne/cli:frontend-lib charts
pnpm nx list @dafne/cli
```

After generating: `pnpm install` (links new packages), `pnpm nx sync`
(project references), and for a table `pnpm dafne db generate`.
The generator prints these steps.

## Databases

```sh
dafne db generate                    # a migration of @dafne/backend-database (dafne_crm)
dafne db generate <package> --name x # of another database package
dafne db migrate                     # apply every database's migrations, in one order
dafne db move dafne dafne_crm        # one time: move the old `dafne` database
```

They run the targets of `@dafne/backend-migrator` (see its README).

## Running tasks

```sh
dafne dev                            # @dafne/auth, @dafne/crm-api and @dafne/crm-web in watch mode
dafne dev @dafne/worker              # given projects
dafne test                           # every project; or dafne test @dafne/backend-customers
dafne build | lint | typecheck [projects...]
dafne run test:e2e @dafne/crm-api        # any target
dafne affected                       # lint, typecheck, test and build what changed
dafne projects -t dev                # list the projects (with a target)
```

They run `nx run-many` (with the dependencies Nx adds), with the terminal
attached. `--pick` chooses the projects from those with the target;
`--skip-nx-cache` reruns cached tasks.
