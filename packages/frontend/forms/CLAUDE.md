# @dafne/frontend-forms

Building blocks of the frontend's forms (TanStack Form). TypeScript sources
compiled by Next. Relative imports end in `.ts`/`.tsx`.

- `.`: `formSchema`, safe on the server (schemas, server actions).
- `./client`: contexts, the fields (`TextField`, `SelectField`, …),
  `FIELD_COMPONENTS` / `FORM_COMPONENTS`, `useErrorText`,
  `useResetOnLeave`, `setServerError`.
- The app builds its `useAppForm` with `createFormHook`, adding its own
  fields (e.g. `CountrySelectField`, which calls the backend). Fields that
  depend on the app's data stay in the app.
- Error texts: contract keys (`contracts.*`) and the app's keys, translated
  by `useErrorText`.
