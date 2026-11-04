# @dafne/frontend-api

Calls the Nest API (`apps/api`) from the frontend's server.

## Entry points

| Import                       | What                                                                                     |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| `@dafne/frontend-api`        | `BackendError` (status + message), `errorMessage`. No Next imports: safe in client code. |
| `@dafne/frontend-api/server` | `backendFetch(path, init)`, `BACKEND_URL`, `APP_URL`                                     |

`backendFetch` forwards the browser's cookies, sends `Origin: APP_URL`
(Better Auth's CSRF check) and the user's language (`Accept-Language`, so
errors arrive translated), and throws a `BackendError` when the response
is not ok.

## Usage

```ts
import { backendFetch } from "@dafne/frontend-api/server";
import type { CustomerDetail } from "@/lib/customers";

const res = await backendFetch(`/customers/${id}`);
const customer: CustomerDetail = await res.json();
```

## Configuration

`BACKEND_URL` (default `http://localhost:3000`) and `APP_URL` (default
`http://localhost:4000`, must be in the backend's `TRUSTED_ORIGINS`).

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/frontend-api
pnpm nx typecheck @dafne/frontend-api
```

There is no build: `apps/frontend` compiles the sources (`transpilePackages`
in its `next.config.ts`).
