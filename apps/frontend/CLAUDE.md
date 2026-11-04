@AGENTS.md

# dafne frontend

Next.js app, part of the Dafne monorepo (see `../../CLAUDE.md`). It calls the
NestJS backend (`../api`) from the server through `backendFetch`
(`lib/backend.ts`). It imports the API contracts from the workspace
package `@dafne/contracts` and, type-only, the backend's auth options
(`@dafne/backend-auth/options`, a dev dependency). Its `tsconfig.json`
tells `nx sync` not to add project references (Next compiles the
packages' sources).

## API types come from the backend

Never write API request or response types by hand. They live in
`@dafne/contracts` (`../../packages/contracts`, rules in `../backend/CLAUDE.md`),
a workspace dependency compiled by Next (`transpilePackages`).

- `lib/<resource>.ts` re-exports response types as
  `export type CustomerDetail = Json<contracts.CustomerDetail>`. `Json<T>`
  turns dates into strings, as they arrive in JSON.
- Forms validate with the contract schema itself (same rules and messages
  as the backend). Wrap it with `formSchema<FormValues>()(schema)`
  (`lib/app-form/form-schema.ts`), where the form values are all strings
  ("" when blank). It only compiles if the form values are valid input for
  the schema.
- Modules that also run in the browser and only need names (table configs,
  `lib/*-table.ts`) import **types only** from `@dafne/contracts` and check
  literals with `satisfies CustomerSortField[]`. A value import pulls Zod
  (~100 KB) into the page's bundle.
- `next.config.ts` sets `turbopack.root` to the monorepo root, so
  Turbopack can read the workspace packages (`../../packages`). `allowImportingTsExtensions` in
  `tsconfig.json` is needed for the contracts' `.ts` imports.

## Languages (next-intl)

English and Italian (`i18n/routing.ts`; Italian is the default). Every
route lives under `app/[locale]/`, but the locale is never in the URL: the
proxy (`proxy.ts`) picks it from the `NEXT_LOCALE` cookie (set by the
language menu in `nav-user.tsx`), else `Accept-Language`, and rewrites
`/customers` to `/it/customers`. Links and redirects stay unprefixed
(`/customers`). Pages are prerendered once per locale.

- No text in components: use `useTranslations()` (client and sync server
  components) or `await getTranslations()` (async ones, server actions,
  `generateMetadata`). Texts are in `messages/en.json` and
  `messages/it.json`; a new key goes in both.
- Messages are typed (`i18n/global.d.ts`): a missing key fails `tsc`, and
  `i18n/messages.check.ts` fails it when the two files differ.
- Plain-data modules (`lib/navigation.ts`, `lib/*-table.ts`, option lists)
  hold message keys (`MessageKey`, `i18n/keys.ts`), translated where they
  are shown: `useOptionLabels` / `useOptionLabel` (`i18n/options.ts`).
- Table columns are built in a `use<S>Columns()` hook with `useMemo`, so
  their headers can be translated.
- Validation messages come from the contracts as keys
  (`customers.name.required`); `components/ui/form.tsx` translates them
  from the `contracts` messages (the backend's catalog, merged in
  `i18n/request.ts`). Zod's own messages follow the locale (`useAppForm`).
- `backendFetch` sends `Accept-Language`, so API errors arrive translated.
- Dates (`useDateLocale`), currencies (`formatCurrency(value, locale)`) and
  country names (`countryName`) follow the app's language.
