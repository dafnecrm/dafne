# @dafne/frontend-forms

Building blocks of the frontend's forms (TanStack Form). TypeScript sources
compiled by Next. Relative imports end in `.ts`/`.tsx`.

- `.`: `formSchema`, safe on the server (schemas, server actions).
- `./client`: contexts, the fields (`TextField`, `SelectField`, …),
  `FIELD_COMPONENTS` / `FORM_COMPONENTS`, `createAppFormHook`,
  `useErrorText`, `useResetOnLeave`, `setServerError`.
- `./leave-guard`: `LeaveGuardProvider` (a `"use client"` module), its own
  entry so that server layouts can render it (`./client` isn't one).
- `useResetOnLeave(form)` resets the form when its page is hidden and,
  under a `LeaveGuardProvider` (the app's `(app)` layout), asks before
  following a link away from it with unsaved changes, and before
  Back/Forward where the Navigation API can cancel it (`leave-guard.tsx`).
- `useAppForm` (`./client`) has the generic fields and Zod's messages in
  the user's language; the apps' forms use it directly. A form that needs
  more fields builds its own hook with `createAppFormHook` (e.g.
  `@dafne/frontend-customers` adds `CountrySelectField` of
  `@dafne/frontend-geo`, which calls the backend). Fields that call the
  backend live in their feature lib, not here: this lib can't depend on
  them (they depend on its contexts).
- `setServerError(formApi, error)` shows a server error in `FormErrors`:
  a string, or a `ServerError` (`{ error, status?, messageKey? }`, what a
  server action builds from `BackendError`). A 4xx `status` titles the
  alert "Couldn't save" (`form.serverRejected`), not "Something went
  wrong"; a `messageKey` (`<resource>.<field>.<rule>`) also puts the
  message under that field, until its value changes or the form validates.
  `FormErrors` scrolls to the alert and focuses it once per submit attempt.
- Error texts: contract keys (`contracts.*`) and the app's keys, translated
  by `useErrorText`.
- Layout: `src/fields/`, one file per field (`text-field.tsx`,
  `select-field.tsx`…) plus what they share (`base.ts`: `BaseFieldProps`,
  `OwnProps`; `error-text.ts`: `useErrorText`; `date-value.ts`), exported
  by `fields/index.ts`; `src/form-components/`: `SubmitButton`,
  `FormErrors` (`FORM_COMPONENTS`). A new field gets its file there and
  its place in `FIELD_COMPONENTS` (`components.ts`).
