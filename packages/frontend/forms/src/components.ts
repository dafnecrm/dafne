import {
  CheckboxField,
  DatePickerField,
  DateTimePickerField,
  NumberField,
  PasswordField,
  SelectField,
  TextareaField,
  TextEditorField,
  TextField,
  UncontrolledField,
} from "./fields/index.ts";
import { FormErrors, SubmitButton } from "./form-components/index.ts";

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
