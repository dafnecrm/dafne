# @dafne/frontend-forms

Building blocks of the frontend's forms, on
[TanStack Form](https://tanstack.com/form).

## Entry points

| Import                         | What                                                                                                                                                                                                                                                     |
| ------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `@dafne/frontend-forms`        | `formSchema`. Safe on the server (schemas, server actions).                                                                                                                                                                                              |
| `@dafne/frontend-forms/client` | form contexts, the fields (`TextField`, `PasswordField`, `NumberField`, `SelectField`, `DatePickerField`, `TextEditorField`…), `SubmitButton`, `FormErrors`, `FIELD_COMPONENTS` / `FORM_COMPONENTS`, `useErrorText`, `useResetOnLeave`, `setServerError` |

## Usage

The app builds its form hook with its own fields as well
(`apps/frontend/lib/app-form/app-form.ts`):

```ts
const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: { ...FIELD_COMPONENTS, CountrySelectField },
  formComponents: FORM_COMPONENTS,
});
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

There is no build: `apps/frontend` compiles the sources (`transpilePackages`
in its `next.config.ts`).
