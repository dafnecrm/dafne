@AGENTS.md

# dafne frontend

Next.js app, part of the Dafne monorepo (see `../../CLAUDE.md`). It calls the
NestJS backend (`../api`) from the server through `backendFetch`
(`@dafne/frontend-api/server`; `BackendError` from `@dafne/frontend-api`). It imports the API contracts from the workspace
package `@dafne/contracts` and its auth (Better Auth client, session
helpers, cookies) from `@dafne/frontend-auth` (`../../packages/frontend/auth`;
client code imports `@dafne/frontend-auth/client`, server code
`@/lib/session`). Its `tsconfig.json` tells `nx sync` not to add project
references (Next compiles the packages' sources).

## Frontend libs (`../../packages/frontend/*`)

- `@dafne/frontend-ui`: the shadcn components
  (`@dafne/frontend-ui/components/<name>`), `lib/utils` (`cn`),
  `lib/dates`, `lib/theme`, `lib/message-key` (`MessageKey`),
  `hooks/use-mobile`. Add shadcn components from the lib:
  `pnpm --filter @dafne/frontend-ui shadcn:add <name>`.
- `@dafne/frontend-forms`: `formSchema` (`.`, safe on the server); the
  fields, contexts, `useResetOnLeave`, `setServerError` in `./client`.
  The app's `useAppForm` (`lib/app-form/app-form.ts`) composes them with
  its own fields (`components/country-select-field.tsx`).
- `@dafne/frontend-data-table`: table config and URL state (`.`), the
  `DataTable` component (`./table`).
- `@dafne/frontend-api`, `@dafne/frontend-auth`: see above.
- **Sign-in and users are `apps/auth`'s** (shared by every Dafne app):
  `next.config.ts` proxies `/api/auth/*` to `AUTH_URL`, `lib/session.ts`
  reads sessions there, and the users pages call it with `authFetch`. The
  CRM's data comes from `apps/sales-api` (`backendFetch`, `BACKEND_URL`).
- `app/globals.css` scans the libs for Tailwind classes
  (`@source "../../../packages/frontend"`).
- They hold no texts: they translate the app's message keys with
  `useTranslations()`, checked when the app compiles them.

## API types come from the backend

Never write API request or response types by hand. They live in
`@dafne/contracts` (`../../packages/contracts`, rules in `../backend/CLAUDE.md`),
a workspace dependency compiled by Next (`transpilePackages`).

- `lib/<resource>.ts` re-exports response types as
  `export type CustomerDetail = Json<contracts.CustomerDetail>`. `Json<T>`
  turns dates into strings, as they arrive in JSON.
- Forms validate with the contract schema itself (same rules and messages
  as the backend). Wrap it with `formSchema<FormValues>()(schema)`
  (`@dafne/frontend-forms`), where the form values are all strings
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
  hold message keys (`MessageKey`, `@dafne/frontend-ui/lib/message-key`), translated where they
  are shown: `useOptionLabels` / `useOptionLabel` (`i18n/options.ts`).
- Table columns are built in a `use<S>Columns()` hook with `useMemo`, so
  their headers can be translated.
- Validation messages come from the contracts as keys
  (`customers.name.required`); `useErrorText` (`@dafne/frontend-forms/client`) translates them
  from the `contracts` messages (the backend's catalog, merged in
  `i18n/request.ts`). Zod's own messages follow the locale (`useAppForm`).
- `backendFetch` sends `Accept-Language`, so API errors arrive translated.
- Dates (`useDateLocale`), currencies (`formatCurrency(value, locale)`) and
  country names (`countryName`) follow the app's language.
