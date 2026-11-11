'use client'

import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import { Input } from '@dafne/frontend-ui/components/input'
import { InputGroup, InputGroupInput } from '@dafne/frontend-ui/components/input-group'
import React from 'react'
import { useFieldContext } from '../form-context.ts'
import type { BaseFieldProps, OwnProps } from './base.ts'
import { useErrorText } from './error-text.ts'

export type TextFieldProps = BaseFieldProps & {
  uncontrolled?: boolean
  children?: React.ReactNode
} & Omit<React.ComponentProps<typeof Input>, OwnProps>

export function TextField({
  label,
  className,
  controlClassName,
  uncontrolled,
  orientation,
  children,
  ...props
}: TextFieldProps) {
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
      <InputGroup className={controlClassName}>
        <InputGroupInput
          id={field.name}
          name={field.name}
          value={!uncontrolled ? field.state.value : (field.state.value ?? '')}
          aria-invalid={!field.state.meta.isValid}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          {...props}
          readOnly={uncontrolled || props.readOnly}
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
