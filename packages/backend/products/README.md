# @dafne/backend-products

Nest lib of the products resource: `ProductsModule`, with its
controller (REST API) and `ProductsService` (Drizzle queries).
Registered in `apps/sales-api` (`SalesApiModule`).

## API

Every route needs a signed-in user of the CRM (the session cookie of
`apps/auth`, checked by `@dafne/backend-session`).

| Method   | Path            | What                                |
| -------- | --------------- | ----------------------------------- |
| `GET`    | `/products`     | List, with paging, filters and sort |
| `GET`    | `/products/:id` | One product                         |
| `POST`   | `/products`     | Create                              |
| `PUT`    | `/products/:id` | Update                              |
| `DELETE` | `/products/:id` | Delete (soft: sets `deletedAt`)     |

Request schemas and response types are in `@dafne/contracts`
(`products.ts`); bodies and queries are validated with `ZodValidationPipe`
(`@dafne/backend-common`). The table is in `@dafne/backend-database`
(`tables/products.ts`).

## Usage

```ts
import { ProductsModule, ProductsService } from '@dafne/backend-products';
```

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/backend-products
pnpm nx lint @dafne/backend-products
pnpm nx typecheck @dafne/backend-products
```
