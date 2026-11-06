'use client'

import { cn } from 'cn'
import { DatePicker, type DatePickerProps } from '@dafne/frontend-ui/components/date-picker'
import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import { Input } from '@dafne/frontend-ui/components/input'
import { useTranslations } from 'next-intl'
import { useFieldContext } from '../form-context.ts'
import type { BaseFieldProps, OwnProps } from './base.ts'
import { useErrorText } from './error-text.ts'
import { parseDateValue, toDateValue } from './date-value.ts'

/** "YYYY-MM-DDTHH:mm" split into its date and time ("" when missing). */
function splitDateTimeValue(value: string | null | undefined) {
  const [date = '', time = ''] = (value ?? '').split('T')
  return { date: parseDateValue(date), time: time.slice(0, 5) }
}

/**
 * A date picked from a calendar plus a time input; the field's value is
 * "YYYY-MM-DDTHH:mm" ("" when blank), the same format as an
 * `<input type="datetime-local">`. Picking a date first sets the time to 00:00.
 */
export function DateTimePickerField({
  label,
  className,
  controlClassName,
  orientation,
  ...props
}: BaseFieldProps & Omit<DatePickerProps, OwnProps>) {
  const field = useFieldContext<string>()
  const errorText = useErrorText()
  const t = useTranslations('form')
  const { date, time } = splitDateTimeValue(field.state.value)
  const invalid = !field.state.meta.isValid

  return (
    <Field
      className={className}
      orientation={orientation}
      data-invalid={invalid}
    >
      <FieldLabel htmlFor={field.name} className={'text-nowrap'}>
        {label}
      </FieldLabel>
      <div className={cn('flex gap-2', controlClassName)}>
        <DatePicker
          id={field.name}
          name={field.name}
          className="min-w-0 flex-1"
          value={date}
          aria-invalid={invalid}
          onChange={(picked) =>
            field.handleChange(
              picked ? `${toDateValue(picked)}T${time || '00:00'}` : ''
            )
          }
          onBlur={field.handleBlur}
          {...props}
        />
        <Input
          type="time"
          aria-label={t('timeOf', { label })}
          className="w-28 appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
          value={time}
          disabled={!date || props.disabled}
          aria-invalid={invalid}
          onBlur={field.handleBlur}
          onChange={(e) =>
            date &&
            field.handleChange(
              `${toDateValue(date)}T${e.target.value || '00:00'}`
            )
          }
        />
      </div>
      <FieldError>
        {field.state.meta.errors.length > 0 &&
          [...new Set(errorText(field.state.meta.errors))].map(
            (message, i) => <p key={i}>{message}</p>
          )}
      </FieldError>
    </Field>
  )
}
