# dafne backend

NestJS API (Nest monorepo: `apps/api`, libraries in `libs/*`, imported as
`@app/<lib>`), part of the Dafne monorepo (see `../CLAUDE.md`). The API
contracts live in the workspace package `@dafne/contracts`
(`../packages/contracts`), shared with the frontend (`../frontend`).

## API contracts (shared with the frontend)

API request and response types live **only** in `@dafne/contracts`
(`../packages/contracts`). The backend and the frontend both import them
as `@dafne/contracts`, so the frontend never writes API types itself.

- **Requests** (bodies, query strings) are Zod schemas, e.g.
  `customerBodySchema`, `listCustomersQuerySchema`. Use `z.strictObject` so
  unknown fields are rejected. Messages are user-facing: the frontend forms
  show them too.
- **Responses** are TypeScript interfaces with dates as `Date`, e.g.
  `CustomerDetail`, `UsersList`. Service and controller methods declare them
  as return types, so the compiler checks the code against the contract.
- Shared helpers are in `contracts/src/common.ts`: `requiredText`,
  `optionalText` (blank, null or missing all become null), `pageQuery`
  (limit/offset), `SORT_DIRECTIONS`, `Json<T>` (the client-side type, dates
  as strings).
- `@dafne/contracts` holds plain Zod only, with no Nest, Node or database
  imports, because it ends up in the frontend bundle.
- Inside `packages/contracts`, relative imports end in `.ts` (`./common.ts`),
  not `.js` like the rest of the backend, because the frontend's bundler
  (Turbopack) can't map `.js` to `.ts`. `rewriteRelativeImportExtensions`
  in `tsconfig.json` allows it.
- The package ships TypeScript sources and has no build step.
  `rspack.config.js` bundles `@dafne/*` into the API, since Nest's rspack
  defaults leave everything in `node_modules` external. Its specs run in
  the package itself (`pnpm --filter @dafne/contracts test`).

## Messages (English and Italian)

User-facing messages are keys, never text: `msg('customers.name.required')`
(`packages/contracts/src/messages`), for Zod errors and for exceptions
(`new NotFoundException(msg('customers.notFound'))`). `msg` only accepts
keys of `messages/en.ts`; `it.ts` must have the same keys (typed by
`ContractMessages`). The frontend shows the same texts.

- `I18nExceptionFilter` (global, `@app/common`) translates key messages
  (also `"path: key"`) into the request's `Accept-Language` (Italian by
  default), and re-parses validation failures so Zod's own messages are in
  that language too.
- Emails pick their language with `localeFrom(request.headers…)`.

## Validation

- Validate with `ZodValidationPipe` from `@app/common`, per parameter:
  `@Body(new ZodValidationPipe(customerBodySchema)) body: CustomerBody`.
  The parameter type is the schema's output (`z.output`).
- There's no global ValidationPipe and no class-validator: don't add DTO
  classes.
- Errors are 400 with `message: ["path: message", ...]`.

## Adding an endpoint

1. Add the request schema and response type to
   `packages/contracts/src/<resource>.ts`, then export the file from `index.ts`.
2. Use them in the controller (pipe + return type) and in the service.
3. In the frontend, add the `Json<...>` alias (see `../frontend/CLAUDE.md`).
