import { FormErrors, PasswordField, SubmitButton, TextField, UncontrolledField } from "@/components/ui/form"
import { fieldContext, formContext } from "@/lib/app-form/form-context"
import { createFormHook } from "@tanstack/react-form-nextjs"

const { useAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    PasswordField,
    UncontrolledField,
  },
  formComponents: {
    SubmitButton,
    FormErrors
  },
})

export {
  useAppForm
}