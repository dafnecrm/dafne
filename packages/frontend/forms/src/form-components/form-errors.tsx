'use client'

import { Alert, AlertDescription, AlertTitle } from '@dafne/frontend-ui/components/alert'
import { useSelector } from '@tanstack/react-form-nextjs'
import { TriangleAlertIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useEffect, useRef } from 'react'
import { useFormContext } from '../form-context.ts'
import { useErrorText } from '../fields/error-text.ts'
import type { ServerErrorValue } from '../server-error.ts'

/**
 * The form's errors: the server's (`setServerError`) and the submit's. When
 * they show up after a submit, the alert scrolls into view and takes the
 * focus, since the submit button is often far below it. `rejectedTitle`
 * titles a 4xx server error ("Couldn't save" otherwise), e.g. "Couldn't
 * sign in".
 */
export function FormErrors({ rejectedTitle }: { rejectedTitle?: string } = {}) {
  const form = useFormContext()
  const errorText = useErrorText()
  const t = useTranslations('form')
  const formErrors = useSelector(form.store, (formState) => formState.errorMap)
  const submissionAttempts = useSelector(
    form.store,
    (formState) => formState.submissionAttempts,
  )
  const messages = [
    ...new Set([
      ...errorText(formErrors.onServer),
      ...errorText(formErrors.onSubmit),
    ]),
  ]
  const hasMessages = messages.length > 0
  const ref = useRef<HTMLDivElement>(null)
  // The submit attempt the alert was last brought into view for: once per
  // attempt, so errors that change while typing don't move the page.
  const shownFor = useRef(0)

  useEffect(() => {
    if (submissionAttempts === 0) {
      // The form was reset (e.g. on leaving its page): start over.
      shownFor.current = 0
      return
    }
    if (
      !hasMessages ||
      shownFor.current === submissionAttempts ||
      !ref.current
    ) {
      return
    }
    shownFor.current = submissionAttempts
    const reduceMotion = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    ).matches
    ref.current.scrollIntoView({
      block: 'center',
      behavior: reduceMotion ? 'auto' : 'smooth',
    })
    ref.current.focus({ preventScroll: true })
    // onServer: a server error comes after its submit attempt.
  }, [hasMessages, submissionAttempts, formErrors.onServer])

  return (
    hasMessages && (
      <Alert variant="destructive" ref={ref} tabIndex={-1} className="outline-none">
        <TriangleAlertIcon />
        <AlertTitle>{title(formErrors.onServer)}</AlertTitle>
        <AlertDescription>
          {messages.map((message, i) => (
            <p key={i}>{message}</p>
          ))}
        </AlertDescription>
      </Alert>
    )
  )

  function title(server: unknown) {
    if (!server) {
      return t('hasErrors')
    }
    const status = (server as Partial<ServerErrorValue>).status
    // 4xx: the server turned it down, for a reason the user can fix.
    return typeof status === 'number' && status >= 400 && status < 500
      ? (rejectedTitle ?? t('serverRejected'))
      : t('serverError')
  }
}
