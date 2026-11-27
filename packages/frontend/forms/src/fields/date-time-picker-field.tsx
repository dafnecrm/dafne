'use client'

import { cn } from 'cn'
import { DatePicker, type DatePickerProps } from '@dafne/frontend-ui/components/date-picker'
import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import { Input } from '@dafne/frontend-ui/components/input'
import { useTimeZone } from '@dafne/frontend-ui/components/local-date'
import { useTranslations } from 'next-intl'
import { useFieldContext } from '../form-context.ts'
import type { BaseFieldProps, OwnProps } from './base.ts'
import { useErrorText } from './error-text.ts'
import { toLocalDateTime, toUtcInstant } from './date-value.ts'

/**
 * A date picked from a calendar plus a time input, shown in the viewer's
 * time zone. The field's value is the instant as a UTC ISO string
 * ("2026-12-03T23:00:00.000Z", "" when blank), what the backend sends and
 * expects, so it means the same moment on the server. Picking a date first
 * sets the time to 00:00. Blank on the server and during hydration, which
 * can't know the viewer's zone.
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
  const hydrated = useTimeZone() !== null
  const { date, time } = hydrated
    ? toLocalDateTime(field.state.value)
    : { date: undefined, time: '' }
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
            field.handleChange(picked ? toUtcInstant(picked, time) : '')
          }
          onBlur={field.handleBlur}
          {...props}
        />
        <Input
          type="time"
          aria-label={t('timeOf', { label: label ?? field.name })}
          className="w-28 appearance-none [&::-webkit-calendar-picker-indicator]:hidden"
          value={time}
          disabled={!date || props.disabled}
          aria-invalid={invalid}
          onBlur={field.handleBlur}
          onChange={(e) =>
            date &&
            field.handleChange(toUtcInstant(date, e.target.value))
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
