import {
  CheckboxField,
  CountrySelectField,
  DatePickerField,
  DateTimePickerField,
  FormErrors,
  NumberField,
  PasswordField,
  SelectField,
  SubmitButton,
  TextField,
  TextareaField,
  TextEditorField,
  UncontrolledField,
} from "@/components/ui/form"
import { fieldContext, formContext } from "@/lib/app-form/form-context"
import { createFormHook, type AnyFormApi } from "@tanstack/react-form-nextjs"
import { useLocale } from "next-intl"
import { z } from "zod"
import { en, it } from "zod/locales"

const { useAppForm: useBaseAppForm } = createFormHook({
  fieldContext,
  formContext,
  fieldComponents: {
    TextField,
    PasswordField,
    UncontrolledField,
    NumberField,
    TextareaField,
    TextEditorField,
    DatePickerField,
    DateTimePickerField,
    CheckboxField,
    SelectField,
    CountrySelectField,
  },
  formComponents: {
    SubmitButton,
    FormErrors,
  },
})

const ZOD_LOCALES = { en, it }

/**
 * TanStack's form hook, with Zod's own messages (too long, wrong type…) in
 * the user's language. Contract messages are keys, translated where they're
 * shown (components/ui/form.tsx).
 */
const useAppForm: typeof useBaseAppForm = (options) => {
  const locale = useLocale() as keyof typeof ZOD_LOCALES
  z.config((ZOD_LOCALES[locale] ?? en)())
  return useBaseAppForm(options)
}

export { useAppForm }

/**
 * Shows an error from the server (e.g. a Better Auth call) in <FormErrors />.
 * It's cleared the next time the form validates without errors. TanStack
 * types `onServer` from a server validator, which these forms don't have.
 */
export function setServerError(formApi: AnyFormApi, message: string) {
  formApi.setErrorMap({ onServer: message })
}
