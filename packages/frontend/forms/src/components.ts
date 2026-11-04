import {
  CheckboxField,
  DatePickerField,
  DateTimePickerField,
  FormErrors,
  NumberField,
  PasswordField,
  SelectField,
  SubmitButton,
  TextareaField,
  TextEditorField,
  TextField,
  UncontrolledField,
} from "./fields.tsx";

/** The generic fields, for `createFormHook({ fieldComponents })`. */
export const FIELD_COMPONENTS = {
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
};

/** The form-level components, for `createFormHook({ formComponents })`. */
export const FORM_COMPONENTS = { SubmitButton, FormErrors };
