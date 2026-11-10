'use client'

import { useFieldContext, useErrorText, type BaseFieldProps } from '@dafne/frontend-forms/client'
import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import { cn } from '@dafne/frontend-ui/lib/utils'
import type { SalesOrderTypeOption } from '../actions.ts'
import { SalesOrderTypeSelect } from './sales-order-type-select'

/**
 * A customer, picked by typing part of their name (see CustomerSelect).
 * The value is the customer's ID as text ("12"), "" when none is chosen.
 */
export function SalesOrderTypeSelectField({
  label,
  placeholder,
  disabled,
  className,
  controlClassName,
  orientation,
  option,
}: BaseFieldProps & {
  placeholder?: string
  disabled?: boolean
  /** The value's sales order type, when known (see the select). */
  option?: SalesOrderTypeOption | null
}) {
  const field = useFieldContext<string>()
  const errorText = useErrorText()

  return (
    <Field
      className={className}
      orientation={orientation}
      data-invalid={!field.state.meta.isValid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <SalesOrderTypeSelect
        id={field.name}
        name={field.name}
        value={field.state.value}
        option={option}
        onValueChange={field.handleChange}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn('w-full', controlClassName)}
        aria-invalid={!field.state.meta.isValid} />
      <FieldError>
        {field.state.meta.errors.length > 0 &&
          [...new Set(errorText(field.state.meta.errors))].map(
            (message, i) => <p key={i}>{message}</p>
          )}
      </FieldError>
    </Field>
  )
}
