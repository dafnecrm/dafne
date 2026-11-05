# @dafne/backend-session

Sign-in for the apps' APIs (e.g. `apps/sales-api`), without Better Auth in
them. The session is `apps/auth`'s.

## How it works

`SessionModule.forRoot({ app: 'sales' })` registers a global guard,
`SessionGuard`. For each request it:

1. reads the cookie and asks `AUTH_URL/api/auth/get-session` (cached for
   5 seconds per cookie);
2. refuses with 401 without a session, with 403 if the user can't use this
   app (`user.apps[app]`, from `app_access`; global admins always can);
3. puts the session on the request for `@Session()`.

An unreachable or failing `apps/auth` is a 503, not "signed out".

## Usage

```ts
// the app's root module
SessionModule.forRoot({ app: 'sales' }),

// a controller
import { Session, type UserSession, AllowAnonymous, Roles } from '@dafne/backend-session';

@Post()
create(@Session() session: UserSession) {
  return this.service.create(body, session.user.id);
}

@Get('health') @AllowAnonymous() health() {}
@Delete(':id') @Roles(['admin']) remove() {}   // the user's role in this app
```

`@OptionalAuth()`: `@Session()` may be undefined. The decorators have the
same shape as `@thallesp/nestjs-better-auth`'s, so a controller only
changes its import.

## Configuration

`AUTH_URL` (default `http://localhost:3001`).

## Tasks

```sh
pnpm nx test @dafne/backend-session
pnpm nx lint @dafne/backend-session
pnpm nx typecheck @dafne/backend-session
```
