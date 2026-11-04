# @dafne/backend-activities

Nest lib of the activities resource: `ActivitiesModule`, with its
controller (REST API) and `ActivitiesService` (Drizzle queries).
Registered in `apps/api` (`ApiModule`).

## API

Every route needs a signed-in user (Better Auth session cookie).

| Method   | Path                     | What                                |
| -------- | ------------------------ | ----------------------------------- |
| `GET`    | `/activities`            | List, with paging, filters and sort |
| `GET`    | `/activities/:id`        | One activity                        |
| `POST`   | `/activities`            | Create                              |
| `PUT`    | `/activities/:id`        | Update                              |
| `DELETE` | `/activities/:id`        | Delete (soft: sets `deletedAt`)     |
| `PATCH`  | `/activities/:id/close`  | Close                               |
| `PATCH`  | `/activities/:id/reopen` | Reopen a closed activity            |

Request schemas and response types are in `@dafne/contracts`
(`activities.ts`); bodies and queries are validated with `ZodValidationPipe`
(`@dafne/backend-common`). The table is in `@dafne/backend-database`
(`tables/activities.ts`).

## Usage

```ts
import { ActivitiesModule, ActivitiesService } from '@dafne/backend-activities';
```

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/backend-activities
pnpm nx lint @dafne/backend-activities
pnpm nx typecheck @dafne/backend-activities
```
