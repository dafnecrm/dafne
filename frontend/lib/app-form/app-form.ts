import {
  CheckboxField,
  FormErrors,
  PasswordField,
  SubmitButton,
  TextField,
  UncontrolledField,
} from "@/components/ui/form"
import { fieldContext, formContext } from "@/lib/app-form/form-context"
import { createFormHook, type AnyFormApi } from "@tanstack/react-form-nextjs"

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
    FormErrors,
  },
})

export { useAppForm }

/**
 * Shows an error from the server (e.g. a Better Auth call) in <FormErrors />.
 * It's cleared the next time the form validates without errors. TanStack
 * types `onServer` from a server validator, which these forms don't have.
 */
export function setServerError(formApi: AnyFormApi, message: string) {
  formApi.setErrorMap({ onServer: message })
}
