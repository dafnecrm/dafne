# @dafne/frontend-forms

Building blocks of the frontend's forms, on
[TanStack Form](https://tanstack.com/form).

## Entry points

| Import                         | What                                                                                                                                                                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@dafne/frontend-forms`        | `formSchema`. Safe on the server (schemas, server actions).                                                                                                                                                                                              |
| `@dafne/frontend-forms/client` | form contexts, the fields (`TextField`, `PasswordField`, `NumberField`, `SelectField`, `DatePickerField`, `TextEditorField`…), `SubmitButton`, `FormErrors`, `FIELD_COMPONENTS` / `FORM_COMPONENTS`, `useAppForm`, `createAppFormHook`, `useErrorText`, `useResetOnLeave`, `setServerError` |

## Usage

Forms use `useAppForm` (the generic fields; Zod's messages follow the
user's language). A form that needs more fields builds its own hook
(e.g. `packages/frontend/customers/src/components/form-hook.ts`):

```ts
export const useAppForm = createAppFormHook({ CountrySelectField });
```

Forms validate with the contract schema, typed for the form's values:

```ts
const schema = formSchema<CustomerFormValues>()(customerBodySchema);
```

Error messages (contract keys and the app's keys) are translated by
`useErrorText`.

## Tasks

From the monorepo root:

```sh
pnpm nx test @dafne/frontend-forms
pnpm nx typecheck @dafne/frontend-forms
```

There is no build: `apps/sales-web` compiles the sources (`transpilePackages`
in its `next.config.ts`).
