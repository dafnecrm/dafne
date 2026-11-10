import { useTranslations } from 'next-intl'

/**
 * The messages of field or form errors, translated: contract keys
 * ("customers.name.required") and frontend keys ("auth.validation.email")
 * become text in the user's language; other text is shown as is.
 */
export function useErrorText() {
  const t = useTranslations()
  return (error: unknown) =>
    errorMessages(error).map((message) => {
      const contract = `contracts.${message}`
      if (t.has(contract as never)) {
        return t(contract as never)
      }
      return t.has(message as never) ? t(message as never) : message
    })
}

/** Flattens a validation error (string, issue, list or map of them) into messages. */
function errorMessages(error: unknown): string[] {
  if (!error) {
    return []
  }
  if (typeof error === 'string') {
    return [error]
  }
  if (Array.isArray(error)) {
    return error.flatMap(errorMessages)
  }
  if (typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string') {
      return [error.message]
    }
    return Object.values(error).flatMap(errorMessages)
  }
  return []
}
