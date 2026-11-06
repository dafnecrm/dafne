'use client'

import { cn } from 'cn'
import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dafne/frontend-ui/components/select'
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
}: BaseFieldProps & {
  options: readonly { value: string; label: string }[]
  emptyLabel?: string
  /** Shows the value but doesn't let it change. */
  disabled?: boolean
}) {
  const field = useFieldContext<string | null>()
  const errorText = useErrorText()
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
        <SelectTrigger
          id={field.name}
          className={cn('w-full', controlClassName)}
          aria-invalid={!field.state.meta.isValid}
          onBlur={field.handleBlur}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {items.map((option) => (
            <SelectItem key={option.value ?? ''} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError>
        {field.state.meta.errors.length > 0 &&
          [...new Set(errorText(field.state.meta.errors))].map(
            (message, i) => <p key={i}>{message}</p>
          )}
      </FieldError>
    </Field>
  )
}
