'use client'

import { cn } from 'cn'
import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import {
  InputGroupTextEditor,
  type TextEditor,
} from '@dafne/frontend-ui/components/text-editor'
import React, { ReactNode } from 'react'
import { useFieldContext } from '../form-context.ts'
import type { BaseFieldProps, OwnProps } from './base.ts'
import { useErrorText } from './error-text.ts'
import { InputGroup } from '@dafne/frontend-ui/components/input-group'

/** A rich text editor; the field's value is HTML ("" when empty). */
export function TextEditorField({
  label,
  className,
  controlClassName,
  orientation,
  children,
  ...props
}: { children?: ReactNode } & BaseFieldProps &
  Omit<React.ComponentProps<typeof TextEditor>, OwnProps | 'contentClassName'>) {
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
      <InputGroup>
        <InputGroupTextEditor
          id={field.name}
          contentClassName={cn("min-h-40", controlClassName)}
          value={field.state.value ?? ''}
          aria-invalid={!field.state.meta.isValid}
          onChange={field.handleChange}
          onBlur={field.handleBlur}
          {...props}
        />
        {children}
      </InputGroup>
      <FieldError>
        {field.state.meta.errors.length > 0 &&
          [...new Set(errorText(field.state.meta.errors))].map(
            (message, i) => <p key={i}>{message}</p>
          )}
      </FieldError>
    </Field>
  )
}
