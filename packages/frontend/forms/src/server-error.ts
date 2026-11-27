import type { AnyFormApi } from "@tanstack/react-form-nextjs";

/** An error from a server action, as the forms show it. */
export interface ServerError {
  /** The message, already in the user's language. */
  error: string;
  /** The backend's HTTP status: 4xx is a rejection the user can fix. */
  status?: number;
  /**
   * The contract key of the message (`<resource>.<field>.<rule>`): the
   * field it names, if the form has it, shows the message too.
   */
  messageKey?: string;
  /** The field the error is about, when the caller knows it (wins over `messageKey`). */
  field?: string;
}

/** What <FormErrors /> finds in the form's `errorMap.onServer`. */
export interface ServerErrorValue {
  message: string;
  status?: number;
}

/** Stops the field errors of the form's last server error. */
const clearings = new WeakMap<AnyFormApi, () => void>();

/**
 * Shows an error from the server (e.g. a Better Auth call, or a server
 * action's `ServerError`) in <FormErrors />, and under its `field` or the
 * one its `messageKey` names. It's cleared the next time the form validates without
 * errors (the field's, also when its value changes). TanStack types
 * `onServer` from a server validator, which these forms don't have.
 */
export function setServerError(
  formApi: AnyFormApi,
  error: string | ServerError,
) {
  clearings.get(formApi)?.();
  clearings.delete(formApi);

  if (typeof error === "string") {
    formApi.setErrorMap({ onServer: error });
    return;
  }
  const value: ServerErrorValue = {
    message: error.error,
    status: error.status,
  };
  formApi.setErrorMap({ onServer: value });

  const field = error.field && formApi.fieldInfo[error.field]?.instance
    ? error.field
    : fieldOf(formApi, error.messageKey);
  if (!field) {
    return;
  }
  setFieldServerError(formApi, field, error.error);
  const fieldValue = formApi.getFieldValue(field);
  const clear = () => {
    subscription.unsubscribe();
    clearings.delete(formApi);
    setFieldServerError(formApi, field, undefined);
  };
  const subscription = formApi.store.subscribe(() => {
    if (
      !formApi.state.errorMap.onServer ||
      formApi.getFieldValue(field) !== fieldValue
    ) {
      clear();
    }
  });
  clearings.set(formApi, clear);
}

/** The first segment after the resource of `key` that is a field of the form. */
function fieldOf(formApi: AnyFormApi, key: string | undefined) {
  return key
    ?.split(".")
    .slice(1)
    .find((segment) => formApi.fieldInfo[segment]?.instance);
}

function setFieldServerError(
  formApi: AnyFormApi,
  field: string,
  message: string | undefined,
) {
  formApi.setFieldMeta(field, (meta) =>
    meta && {
      ...meta,
      errorMap: { ...meta.errorMap, onServer: message },
    },
  );
}
