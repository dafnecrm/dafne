@AGENTS.md

# dafne frontend

Next.js app. It calls the NestJS backend (`../backend`, a separate repo,
checked out side by side) from the server through `backendFetch`
(`lib/backend.ts`). It needs `../backend` to build: it imports the
backend's API contracts and, type-only, its auth options.

## API types come from the backend

Never write API request or response types by hand. They live in the
backend's `libs/contracts` (rules in `../backend/CLAUDE.md`) and are
imported as `@backend/contracts` (path in `tsconfig.json`).

- `lib/<resource>.ts` re-exports response types as
  `export type CustomerDetail = Json<contracts.CustomerDetail>`. `Json<T>`
  turns dates into strings, as they arrive in JSON.
- Forms validate with the contract schema itself (same rules and messages
  as the backend). Wrap it with `formSchema<FormValues>()(schema)`
  (`lib/app-form/form-schema.ts`), where the form values are all strings
  ("" when blank). It only compiles if the form values are valid input for
  the schema.
- Modules that also run in the browser and only need names (table configs,
  `lib/*-table.ts`) import **types only** from `@backend/contracts` and check
  literals with `satisfies CustomerSortField[]`. A value import pulls Zod
  (~100 KB) into the page's bundle.
- `next.config.ts` sets `turbopack.root` to the parent folder, so
  Turbopack can read `../backend`. `allowImportingTsExtensions` in
  `tsconfig.json` is needed for the contracts' `.ts` imports.
