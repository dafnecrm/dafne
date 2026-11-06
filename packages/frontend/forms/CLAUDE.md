# @dafne/frontend-forms

Building blocks of the frontend's forms (TanStack Form). TypeScript sources
compiled by Next. Relative imports end in `.ts`/`.tsx`.

- `.`: `formSchema`, safe on the server (schemas, server actions).
- `./client`: contexts, the fields (`TextField`, `SelectField`, …),
  `FIELD_COMPONENTS` / `FORM_COMPONENTS`, `createAppFormHook`,
  `useErrorText`, `useResetOnLeave`, `setServerError`.
- `useAppForm` (`./client`) has the generic fields and Zod's messages in
  the user's language; the apps' forms use it directly. A form that needs
  more fields builds its own hook with `createAppFormHook` (e.g.
  `@dafne/frontend-customers` adds `CountrySelectField` of
  `@dafne/frontend-geo`, which calls the backend). Fields that call the
  backend live in their feature lib, not here: this lib can't depend on
  them (they depend on its contexts).
- Error texts: contract keys (`contracts.*`) and the app's keys, translated
  by `useErrorText`.
- Layout: `src/fields/`, one file per field (`text-field.tsx`,
  `select-field.tsx`…) plus what they share (`base.ts`: `BaseFieldProps`,
  `OwnProps`; `error-text.ts`: `useErrorText`; `date-value.ts`), exported
  by `fields/index.ts`; `src/form-components/`: `SubmitButton`,
  `FormErrors` (`FORM_COMPONENTS`). A new field gets its file there and
  its place in `FIELD_COMPONENTS` (`components.ts`).
