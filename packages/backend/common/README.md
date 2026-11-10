# @dafne/backend-common

Shared pieces of the backend libs: validation and translated errors.

## Contents

- `ZodValidationPipe`: validates a body or query with a contract schema
  (`@dafne/contracts`); a failure is a `ZodValidationException` (400) with
  one `path: message` per issue.
- `I18nExceptionFilter`: translates HTTP errors into the request's language
  (`Accept-Language`): contract message keys (`customers.notFound`) and
  Zod's own messages.
- `i18n.ts`: `localeFrom(acceptLanguage)`, `translate`, `zodErrorMap`,
  `LOCALES`, `DEFAULT_LOCALE` (`it`). The texts are the contracts'
  (`CONTRACT_MESSAGES`).
- `postgres-error.ts`: `PostgresErrorCode`, `postgresError(error)` (the
  code, constraint and detail behind a drizzle error) and
  `rethrowPostgresError(rules)`, the `.catch` handler a service uses to
  turn its constraints into client errors with their own message.
- `PostgresErrorInterceptor`: the safety net, registered by each app
  (`APP_INTERCEPTOR`). What no service handled becomes a generic 409
  (`database.duplicate`, `database.stillReferenced`) or 400
  (`database.missingReference`, `database.required`, `database.invalid`)
  instead of a 500, logged with its constraint. HTTP requests only.

## Postgres errors

The service maps the constraints of its own tables, so the mapping holds
whoever calls it (a controller, another service, an FSM transition):

```ts
const rethrowConstraint = rethrowPostgresError([
  {
    code: PostgresErrorCode.UNIQUE_VIOLATION,
    constraint: 'customer_email_unique_idx', // or a RegExp
    error: () => new ConflictException(msg('customers.email.taken')),
  },
]);

await this.db.transaction(async (tx) => { … }).catch(rethrowConstraint);
```

The interceptor catches the rest. Its warning in the log names the
constraint that has no rule yet.

## Usage

```ts
import { ZodValidationPipe } from '@dafne/backend-common';
import { customerBodySchema, type CustomerBody } from '@dafne/contracts';

@Post()
create(@Body(new ZodValidationPipe(customerBodySchema)) body: CustomerBody) {}
```

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/backend-common
pnpm nx lint @dafne/backend-common
pnpm nx typecheck @dafne/backend-common
```
