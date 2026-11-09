'use client'

import { useFieldContext, useErrorText, type BaseFieldProps } from '@dafne/frontend-forms/client'
import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import { ProductSelect } from './product-select.tsx'
import { cn } from '@dafne/frontend-ui/lib/utils'
import type { ProductOption } from '../actions.ts'

/**
 * A product, picked by typing part of its name (see ProductSelect).
 * The value is the product's ID (a number), null when none is chosen.
 */
export function ProductSelectField({
  label,
  placeholder,
  disabled,
  className,
  controlClassName,
  orientation,
  onProductChange,
}: BaseFieldProps & {
  placeholder?: string
  disabled?: boolean
  onProductChange?: (product: ProductOption | null) => void
}) {
  const field = useFieldContext<number | null>()
  const errorText = useErrorText()

  return (
    <Field
      className={className}
      orientation={orientation}
      data-invalid={!field.state.meta.isValid}
    >
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <ProductSelect
        id={field.name}
        name={field.name}
        value={field.state.value}
        onValueChange={field.handleChange}
        onProductChange={onProductChange}
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
