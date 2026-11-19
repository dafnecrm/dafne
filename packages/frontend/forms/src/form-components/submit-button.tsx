'use client'

import type { ComponentProps } from 'react'
import { Button } from '@dafne/frontend-ui/components/button'
import { Spinner } from '@dafne/frontend-ui/components/spinner'
import { useFormContext } from '../form-context.ts'

/**
 * Submit button. The form's onSubmit handler calls form.handleSubmit, so the
 * button only submits the form. Pass `pending` while a server action runs.
 * With `submitMeta`, it submits with that meta instead (the form's
 * `onSubmit` gets it as `meta`, see `onSubmitMeta`): a second way to save,
 * e.g. "save and update prices".
 */
export function SubmitButton({
  label,
  pending,
  className,
  submitMeta,
  variant,
}: {
  label: string
  pending?: boolean
  className?: string
  submitMeta?: unknown
  /** The button's look (Button's variants); the default one when omitted. */
  variant?: ComponentProps<typeof Button>['variant']
}) {
  const form = useFormContext()
  return (
    // isFieldsValid ignores form-level server errors, so a failed request can be retried.
    <form.Subscribe
      selector={(state) => [state.isSubmitting, state.isFieldsValid]}
    >
      {([isSubmitting, isFieldsValid]) => (
        <Button
          variant={variant}
          type={submitMeta === undefined ? 'submit' : 'button'}
          onClick={
            submitMeta === undefined
              ? undefined
              : () => {
                  void form.handleSubmit(submitMeta)
                }
          }
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
