import { CheckboxField, FormErrors, PasswordField, SubmitButton, TextField, UncontrolledField } from "@/components/ui/form"
import { fieldContext, formContext } from "@/lib/app-form/form-context"
import { createFormHook } from "@tanstack/react-form-nextjs"

const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    PasswordField,
    UncontrolledField,
    CheckboxField,
  },
  formComponents: {
    SubmitButton,
    FormErrors
  },
})

export {
  useAppForm
}

/**
 * Prepares a server action's form state for `mergeForm`. mergeForm copies
 * keys that are `undefined` too, so `initialFormState` (values: undefined)
 * would wipe the form's values.
 */
export function definedState<T extends object>(state: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(state).filter(([, value]) => value !== undefined),
  ) as Partial<T>
}
