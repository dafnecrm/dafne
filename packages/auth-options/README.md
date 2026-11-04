# @dafne/auth-options

The [Better Auth](https://www.better-auth.com) options that don't depend on
the database or the environment: the user's extra fields (`firstname`,
`lastname`, avatar checks) and the plugins (admin).

- The backend (`@dafne/backend-auth`, `createAuth`) adds the database,
  the secret and the URLs.
- The frontend (`@dafne/frontend-auth`) imports only the **type**
  `AuthOptions`, to infer the user's fields in the client.

It's a shared package (`scope:shared`): no Nest, no database, no backend
packages. Shared packages may only depend on other shared packages.

## Tasks

```sh
pnpm nx typecheck @dafne/auth-options
```
