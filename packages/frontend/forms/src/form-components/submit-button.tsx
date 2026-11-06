'use client'

import { Button } from '@dafne/frontend-ui/components/button'
import { Spinner } from '@dafne/frontend-ui/components/spinner'
import { useFormContext } from '../form-context.ts'

/**
 * Submit button. The form's onSubmit handler calls form.handleSubmit, so the
 * button only submits the form. Pass `pending` while a server action runs.
 */
export function SubmitButton({
  label,
  pending,
  className,
}: {
  label: string
  pending?: boolean
  className?: string
}) {
  const form = useFormContext()
  return (
    // isFieldsValid ignores form-level server errors, so a failed request can be retried.
    <form.Subscribe
      selector={(state) => [state.isSubmitting, state.isFieldsValid]}
    >
      {([isSubmitting, isFieldsValid]) => (
        <Button
          type="submit"
          className={className}
          disabled={pending || isSubmitting || !isFieldsValid}
        >
          {(pending || isSubmitting) && <Spinner data-icon="inline-start" />}
          {label}
        </Button>
      )}
    </form.Subscribe>
  )
}
