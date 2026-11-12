[← Index](README.md)

# Architecture

Dafne is a family of apps that share sign-in and users. Each app has a
frontend (Next.js), an API (NestJS) and its own schema in the Postgres
database. One service,
`apps/auth`, handles sign-in for all of them.

```
browser ──► sales-web ──/api/auth/*──► apps/auth ──► auth schema
                    └─ data ───────► sales-api ──► sales schema (FK → auth.user)
                                       └─ session? ─► apps/auth
```

## Shared sign-in: `apps/auth`

- Runs [Better Auth](https://www.better-auth.com) under `/api/auth/*`, the
  users API (`/users`) and the app access (`app_access`), on the
  `auth` schema. It's built from `@dafne/backend-auth`,
  `@dafne/backend-users` and `@dafne/backend-database-auth`.
- **Only this app runs Better Auth** and writes the `auth` schema. The
  apps' APIs never add `AuthModule`; they only read `auth.user` (joins,
  foreign keys).
- The frontends **proxy `/api/auth/*`** to it (`next.config.ts`), so the
  session cookie (`dafne.session_token`) belongs to the frontend's origin.
  With `COOKIE_DOMAIN` (e.g. `cliente.it`) it belongs to the parent domain,
  and every app under it (`sales.cliente.it`, `reporting.cliente.it`) shares
  the sign-in.
- On startup it creates the admin from `ADMIN_EMAIL` / `ADMIN_PASSWORD`.
- Verification emails are sent with Resend, in the user's language.

## App access

`app_access` says which user can use which app, and with which role:
the session carries it as `user.apps` (e.g. `{ sales: "admin" }`).

- A new user gets the apps in `DEFAULT_APPS` (e.g. `sales`).
- Global admins (`role: admin`) can use every app.

## Sessions in the apps' APIs: `@dafne/backend-session`

An app's API checks sessions without Better Auth:

```ts
// the app's root module
SessionModule.forRoot({ app: 'sales' }),
```

This registers a global `SessionGuard`. For each request it:

1. reads the cookie and asks `AUTH_URL/api/auth/get-session` (cached for 5
   seconds per cookie);
2. answers **401** without a session, **403** if the user can't use this app;
3. puts the session on the request.

If `apps/auth` is unreachable the answer is **503**, not "signed out".

Decorators, with the same shape as `@thallesp/nestjs-better-auth`'s:
`@Session()`, `@AllowAnonymous()`, `@OptionalAuth()`, `@Roles(['admin'])`
(the user's role in this app).

## Frontend ↔ backend: contracts

The frontend calls the APIs **from its server**, with `backendFetch` (the
app's API) and `authFetch` (`apps/auth`) from `@dafne/frontend-api/server`.
They forward the browser's cookies, the user's language
(`Accept-Language`) and `Origin: APP_URL` (Better Auth's CSRF check).

Both sides share **`@dafne/contracts`**, so they can't drift:

- request schemas (Zod) and response types, one file per resource;
- schemas hold **message keys** (`customers.name.required`), not texts.
  The texts are in `contracts/src/messages` (`en`, `it`);
- the backend validates with `ZodValidationPipe` and translates errors with
  `I18nExceptionFilter` (`@dafne/backend-common`, default locale `it`);
  the frontend translates the same keys.

## CRUD resources: one interface

Every CRUD resource (customers, products, activities, sales orders, sales
order types) has the same controller and service methods, typed by
`@dafne/backend-crud`. The compiler checks them (`implements`), and
`dafne g backend-resource` writes them:

| Route            | Controller / service | Service signature                            |
| ---------------- | -------------------- | -------------------------------------------- |
| `GET /`          | `list`               | `list(query?): Promise<List>`                |
| `GET /:id`       | `get`                | `get(id): Promise<Detail>` (404 if missing)  |
| `POST /`         | `create`             | `create(body, actor): Promise<Detail>`       |
| `PUT /:id`       | `update`             | `update(id, body, actor): Promise<Detail>`   |
| `DELETE /:id`    | `delete` (204)       | `delete(id, actor): Promise<void>` (logical) |

- Every list answers a `Page<T>` (`@dafne/contracts`): `{ items, total, limit,
  offset }`, e.g. `ProductsList = Page<ListedProduct>`.
- `actor` is the signed-in `SessionUser` (`session.user`), not only its id.
- Extra routes sit next to them with their own names (`PATCH
  /activities/:id/close`, `POST /sales-orders/:id/status`).
- A resource that lacks some of the five implements a `Pick` of the
  interface: `users` (in `apps/auth`) has `list`, `get` and `create`, and
  no write hooks, since Better Auth writes them.
- Who may call a route is decided by Nest guards (`@Roles()`), not by the
  interface.

### Write hooks

`create`, `update` and `delete` run through the resource's `CrudHooks`
(`registry.for('<resource>', { db, load })` in the service). That runner
opens one transaction and runs, in order:

1. `previous` (update, delete): the record before the write, read only
   when the operation has hooks;
2. **pre** hooks: they may change `context.body`, or stop the write by
   returning a message key (403) or throwing;
3. the write itself;
4. `result` (create, update): the record after the write, read in the
   transaction;
5. **post** hooks: they may write related rows with `context.tx`, and a
   failure rolls everything back.

After the commit come the **afterCommit** hooks, for emails, notifications
and calls to other systems. They have no transaction, the response doesn't
wait for them, and their errors are only logged.

Hooks are injectable classes, registered from any module:

```ts
@Module({
  imports: [
    CrudHooksModule.forFeature('customers', {
      delete: { pre: [NoOpenOrdersHook] },
      create: { afterCommit: [WelcomeEmailHook] },
    }, { imports: [NotificationsModule] }),
  ],
})
export class SalesOrdersModule {}
```

Registrations from several modules add up, in import order. A lib can then
hook into a resource it depends on (sales orders into customers) without
that resource knowing about it. Hooks are a business rule on the data: who
may call the endpoint stays with Nest guards.

### Change log

`@dafne/backend-changelog` records a resource's changes in the
`changelog` schema ([Databases](databases.md#the-change-log)). A
resource's module turns it on, and the lib needs no edits:

```ts
ChangelogModule,
ChangelogModule.forFeature<SalesOrderDetail>('sales-orders', {
  fields: ['notes', 'customerId', 'typeId', 'items'],
  // optional: how a field is logged (e.g. items without product names)
  map: { items: (items) => items.map(({ position, productId, quantity }) => ({ position, productId, quantity })) },
}),
FsmModule.forFeature({ …, imports: [ChangelogModule], post: [changelogTransitionHook('sales-orders')] }),
```

- `forFeature` adds a **post** write hook (create, update, delete), so
  the change is saved in the write's transaction or not at all. It
  compares `previous` and `result` on the listed `fields`: a create logs
  their first values, an update only what changed (nothing if nothing
  did), a delete no fields.
- `changelogTransitionHook(resource)` is a hook of **every** transition
  of the state machine (`FsmModule.forFeature({ pre, post })`): it logs
  `{ status: { from, to } }` as a `transition`. Keep `status` out of
  `fields`, so a status change is logged once. In a create that moves
  straight out of `draft`, the transition is logged before the create
  (it runs inside the write).
- `ChangelogService.list(resource, id, query)` reads a record's changes,
  newest first (`Page<ChangeEntry>` of `@dafne/contracts`), e.g.
  `GET /sales-orders/:id/changes`.

## Better Auth options shared by both sides

`@dafne/auth-options` holds the options that don't depend on the database
or the environment (user fields such as `firstname`, `lastname`; the admin
plugin). The backend (`createAuth`) adds database, secret and URLs; the
frontend imports only the **type**, to infer the user's fields in the
client.

## Adding an app

A new app follows the same shape: its API with
`SessionModule.forRoot({ app: '<name>' })`, its own schema
(`<name>`), its frontend proxying `/api/auth`. `dafne g backend-app`
generates the API (see [CLI](cli.md#g-app)).

## See also

- [Databases and migrations](databases.md)
- [Project boundaries](boundaries.md)
- [Getting started](getting-started.md)
