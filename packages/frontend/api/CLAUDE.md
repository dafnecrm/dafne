# @dafne/frontend-api

Calls the Nest API (`apps/api`) from the frontend's server. Ships
TypeScript sources, compiled by Next. Relative imports end in `.ts`.

- `.`: `BackendError` (status + message) and `errorMessage`; no Next imports,
  safe in client code.
- `./server`: `backendFetch(path, init)` (forwards the browser's cookies,
  sends `Origin: APP_URL` for Better Auth's CSRF check and the user's
  language as `Accept-Language`, throws `BackendError`), `BACKEND_URL`,
  `APP_URL` (env, with local defaults).
- Response types are not here: they come from `@dafne/contracts`.
