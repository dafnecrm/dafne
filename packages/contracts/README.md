# @dafne/contracts

The API contracts, shared by the backend (`apps/sales-api`, `packages/backend/*`)
and the frontend (`apps/sales-web`): request schemas (Zod) and response
types. So the two sides can't drift.

## Contents

One file per resource (`customers.ts`, `products.ts`, `activities.ts`,
`users.ts`, `geo.ts`, `countries.ts`), each with:

- body and query schemas (`customerBodySchema`, `listCustomersQuerySchema`…)
  and their types;
- response types (`CustomerDetail`, `CustomersList`…).

Plus:

- `common.ts`: helpers for schemas (`requiredText`, `optionalText`,
  `optionalDate`, `pageQuery`, `SORT_DIRECTIONS`) and `Json<T>` (a response
  type as it arrives in JSON, dates as strings).
- `messages/`: the validation and error texts (`en.ts`, `it.ts`),
  `CONTRACT_MESSAGES`, `translateMessage`. Schemas hold message keys
  (`customers.name.required`), translated by the backend
  (`@dafne/backend-common`) and by the frontend.

## Rules

- Plain Zod only: no Nest or Node code, since the frontend imports it too.
- TypeScript sources, no build: Next compiles them (`transpilePackages`),
  the backend bundles them (rspack).
- Relative imports end in `.ts` (Turbopack doesn't map `.js` to `.ts`).
- A new contract: `pnpm dafne g contract <name>` (or with a whole resource,
  `pnpm dafne g backend-resource <name>`).
- A change here needs both the backend and the frontend owners
  (`.github/CODEOWNERS`).

## Tasks

```sh
pnpm nx test @dafne/contracts
pnpm nx typecheck @dafne/contracts
```
