'use client'

import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import {
  InputGroup,
  InputGroupSelectTrigger,
} from '@dafne/frontend-ui/components/input-group'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectValue,
} from '@dafne/frontend-ui/components/select'
import React from 'react'
import { useFieldContext } from '../form-context.ts'
import type { BaseFieldProps } from './base.ts'
import { useErrorText } from './error-text.ts'

/**
 * A choice from a fixed list; the field's value is the option's `value`.
 * With `emptyLabel` the choice is optional: that item sets the value to null.
 */
export function SelectField({
  label,
  options,
  emptyLabel,
  disabled,
  className,
  controlClassName,
  orientation,
  children,
}: BaseFieldProps & {
  options: readonly { value: string; label: string }[]
  emptyLabel?: string
  /** Shows the value but doesn't let it change. */
  disabled?: boolean
  children?: React.ReactNode
}) {
  const field = useFieldContext<string | null>()
  const errorText = useErrorText()
  // The list opens under the whole group (addons included), at its width.
  const groupRef = React.useRef<HTMLDivElement>(null)
  const items =
    emptyLabel === undefined
      ? options
      : [{ value: null, label: emptyLabel }, ...options]

  return (
    <Field
      className={className}
      orientation={orientation}
      data-invalid={!field.state.meta.isValid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <InputGroup ref={groupRef} className={controlClassName}>
        <Select
          items={items}
          name={field.name}
          disabled={disabled}
          value={field.state.value ?? null}
          onValueChange={(value) =>
            (value !== null || emptyLabel !== undefined) &&
            field.handleChange(value)
          }
        >
          <InputGroupSelectTrigger
            id={field.name}
            aria-invalid={!field.state.meta.isValid}
            onBlur={field.handleBlur}
          >
            <SelectValue />
          </InputGroupSelectTrigger>
          <SelectContent anchor={groupRef} alignItemWithTrigger={false}>
            {items.map((option) => (
              <SelectItem key={option.value ?? ''} value={option.value}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
