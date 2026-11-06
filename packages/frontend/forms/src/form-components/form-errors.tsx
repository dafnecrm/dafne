'use client'

import { Alert, AlertDescription, AlertTitle } from '@dafne/frontend-ui/components/alert'
import { useSelector } from '@tanstack/react-form-nextjs'
import { TriangleAlertIcon } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useFormContext } from '../form-context.ts'
import { useErrorText } from '../fields/error-text.ts'

export function FormErrors() {
  const form = useFormContext()
  const errorText = useErrorText()
  const t = useTranslations('form')
  const formErrors = useSelector(form.store, (formState) => formState.errorMap)
  const messages = [
    ...new Set([
      ...errorText(formErrors.onServer),
      ...errorText(formErrors.onSubmit),
    ]),
  ]

  return (
    messages.length > 0 && (
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>
          {formErrors.onServer ? t('serverError') : t('hasErrors')}
        </AlertTitle>
        <AlertDescription>
          {messages.map((message, i) => (
            <p key={i}>{message}</p>
          ))}
        </AlertDescription>
      </Alert>
    )
  )
}
