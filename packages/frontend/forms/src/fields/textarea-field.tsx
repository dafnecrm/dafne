'use client'

import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import { Textarea } from '@dafne/frontend-ui/components/textarea'
import React from 'react'
import { useFieldContext } from '../form-context.ts'
import type { BaseFieldProps, OwnProps } from './base.ts'
import { useErrorText } from './error-text.ts'

/** A multi-line text input; the field's value is a string ("" when blank). */
export function TextareaField({
  label,
  className,
  controlClassName,
  orientation,
  ...props
}: BaseFieldProps & Omit<React.ComponentProps<typeof Textarea>, OwnProps>) {
  const field = useFieldContext<string>()
  const errorText = useErrorText()

  return (
    <Field
      className={className}
      orientation={orientation}
      data-invalid={!field.state.meta.isValid}
    >
      <FieldLabel htmlFor={field.name} className={'text-nowrap'}>
        {label}
      </FieldLabel>
      <Textarea
        id={field.name}
        className={controlClassName}
        name={field.name}
        value={field.state.value ?? ''}
        aria-invalid={!field.state.meta.isValid}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
        {...props}
      />
      <FieldError>
        {field.state.meta.errors.length > 0 &&
          [...new Set(errorText(field.state.meta.errors))].map(
            (message, i) => <p key={i}>{message}</p>
          )}
      </FieldError>
    </Field>
  )
}
