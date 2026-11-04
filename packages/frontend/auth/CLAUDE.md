# @dafne/frontend-auth

Better Auth for the frontend (`apps/crm-web`). Ships TypeScript sources:
Next compiles them (`transpilePackages`). Relative imports end in `.ts`.

- `.`: shared by browser and server: `SESSION_COOKIES`, `isAdmin`,
  `authErrorKey`, types `Session` / `User`.
- `./client`: `authClient` (browser) and `useAuthErrorMessage`. Never import
  `./server` from client code.
- `./server`: `createSessionHelpers({ backendUrl, appUrl })` →
  `getCurrentUser` / `requireUser` (uses `next/headers`). The app creates
  them once (`apps/crm-web/lib/session.ts`).
- User fields and plugins are inferred from `@dafne/auth-options`
  (type only). When the backend adds a server plugin, add its client
  counterpart in `src/plugins.ts`.
- Error messages are the app's: `auth.errors.*` and `common.errors.generic`
  in `apps/crm-web/messages/*.json`.
