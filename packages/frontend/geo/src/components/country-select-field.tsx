'use client'

import { useFieldContext, useErrorText, type BaseFieldProps } from '@dafne/frontend-forms/client'
import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import { cn } from 'cn'
import { CountrySelect } from './country-select.tsx'

/**
 * A country, picked by typing part of its name (see CountrySelect). The
 * value is the ISO code ("IT"), "" when none is chosen.
 */
export function CountrySelectField({
  label,
  placeholder,
  disabled,
  className,
  controlClassName,
  orientation,
}: BaseFieldProps & {
  placeholder?: string
  disabled?: boolean
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
      <CountrySelect
        id={field.name}
        name={field.name}
        value={field.state.value}
        onValueChange={field.handleChange}
        onBlur={field.handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className={cn('w-full', controlClassName)}
        aria-invalid={!field.state.meta.isValid}
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
