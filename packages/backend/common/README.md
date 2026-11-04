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
