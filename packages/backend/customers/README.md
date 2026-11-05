# @dafne/backend-customers

Nest lib of the customers resource: `CustomersModule`, with its
controller (REST API) and `CustomersService` (Drizzle queries).
Registered in `apps/sales-api` (`SalesApiModule`).

## API

Every route needs a signed-in user of the CRM (the session cookie of
`apps/auth`, checked by `@dafne/backend-session`).

| Method   | Path             | What                                                        |
| -------- | ---------------- | ----------------------------------------------------------- |
| `GET`    | `/customers`     | List, with paging, filters and sort (deleted ones left out) |
| `GET`    | `/customers/:id` | One customer, with addresses                                |
| `POST`   | `/customers`     | Create                                                      |
| `PUT`    | `/customers/:id` | Update                                                      |
| `DELETE` | `/customers/:id` | Delete (soft: sets `deletedAt`)                             |

Request schemas and response types are in `@dafne/contracts`
(`customers.ts`); bodies and queries are validated with `ZodValidationPipe`
(`@dafne/backend-common`). The table is in `@dafne/backend-database`
(`tables/customers.ts`).

## Usage

```ts
import { CustomersModule, CustomersService } from '@dafne/backend-customers';
```

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/backend-customers
pnpm nx lint @dafne/backend-customers
pnpm nx typecheck @dafne/backend-customers
```
