'use client'

import { DatePicker, type DatePickerProps } from '@dafne/frontend-ui/components/date-picker'
import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import { useFieldContext } from '../form-context.ts'
import type { BaseFieldProps, OwnProps } from './base.ts'
import { useErrorText } from './error-text.ts'
import { parseDateValue, toDateValue } from './date-value.ts'

/**
 * A date picked from a calendar; the field's value is "YYYY-MM-DD" ("" when
 * blank), the same format as an `<input type="date">`.
 */
export function DatePickerField({
  label,
  className,
  controlClassName,
  orientation,
  ...props
}: BaseFieldProps & Omit<DatePickerProps, OwnProps>) {
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
      <DatePicker
        id={field.name}
        name={field.name}
        className={controlClassName}
        value={parseDateValue(field.state.value)}
        aria-invalid={!field.state.meta.isValid}
        onChange={(date) => field.handleChange(date ? toDateValue(date) : '')}
        onBlur={field.handleBlur}
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
