import type { AnyFormApi } from "@tanstack/react-form-nextjs";

/**
 * Shows an error from the server (e.g. a Better Auth call) in <FormErrors />.
 * It's cleared the next time the form validates without errors. TanStack
 * types `onServer` from a server validator, which these forms don't have.
 */
export function setServerError(formApi: AnyFormApi, message: string) {
  formApi.setErrorMap({ onServer: message });
}
