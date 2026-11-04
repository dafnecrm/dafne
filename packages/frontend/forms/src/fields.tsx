'use client'

import { useFieldContext, useFormContext } from './form-context.ts'
import { cn } from 'cn'
import { Checkbox } from '@dafne/frontend-ui/components/checkbox'
import { DatePicker, type DatePickerProps } from '@dafne/frontend-ui/components/date-picker'
import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import { Input } from '@dafne/frontend-ui/components/input'
import { Textarea } from '@dafne/frontend-ui/components/textarea'
import { TextEditor } from '@dafne/frontend-ui/components/text-editor'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@dafne/frontend-ui/components/select'
import { Button } from '@dafne/frontend-ui/components/button'
import { Spinner } from '@dafne/frontend-ui/components/spinner'
import { Alert, AlertDescription, AlertTitle } from '@dafne/frontend-ui/components/alert'
import { useSelector } from '@tanstack/react-form-nextjs'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from '@dafne/frontend-ui/components/input-group'
import { Eye, EyeOff, TriangleAlertIcon } from 'lucide-react'
import React, { useState } from 'react'
import { useTranslations } from 'next-intl'

/** Props every field takes. */
export type BaseFieldProps = {
  label: string
  /** Classes of the whole field (label, control and errors). */
  className?: string
  /** Classes of the control itself (input box, textarea, editor area…), e.g. its height. */
  controlClassName?: string
} & Pick<React.ComponentProps<typeof Field>, 'orientation'>

/** Props of the control that the field sets itself. */
type OwnProps =
  | 'id'
  | 'name'
  | 'value'
  | 'aria-invalid'
  | 'onChange'
  | 'onBlur'
  | 'className'

type TextFieldProps = BaseFieldProps & {
  addons?: React.ReactNode[]
  uncontrolled?: boolean
} & Omit<React.ComponentProps<typeof Input>, OwnProps>

function TextField({
  label,
  className,
  controlClassName,
  addons,
  uncontrolled,
  orientation,
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
        {addons}
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

function PasswordField({ label, ...props }: Omit<TextFieldProps, 'type'>) {
  const [showPassword, setShowPassword] = useState(false)
  const t = useTranslations('form')
  const showPasswordAddon = [
    <InputGroupAddon key={2} align={'inline-end'}>
      <InputGroupButton
        aria-label={showPassword ? t('hidePassword') : t('showPassword')}
        onClick={() => setShowPassword((show) => !show)}
      >
        {showPassword ? <EyeOff /> : <Eye />}
      </InputGroupButton>
    </InputGroupAddon>,
  ]
  return (
    <TextField
      label={label}
      type={showPassword ? 'text' : 'password'}
      addons={showPasswordAddon}
      {...props}
    />
  )
}

function UncontrolledField({
  label,
  ...props
}: Omit<TextFieldProps, 'uncontrolled'>) {
  return <TextField label={label} uncontrolled {...props} />
}

/**
 * A number input whose field value is a number: what's typed is converted,
 * and an empty input is null (the contract turns it into "not set").
 */
function NumberField({
  label,
  className,
  controlClassName,
  addons,
  orientation,
  ...props
}: Omit<TextFieldProps, 'type' | 'uncontrolled'>) {
  const field = useFieldContext<number | null>()
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
        {addons}
        <InputGroupInput
          id={field.name}
          name={field.name}
          type="number"
          value={field.state.value ?? ''}
          aria-invalid={!field.state.meta.isValid}
          onBlur={field.handleBlur}
          onChange={(e) =>
            field.handleChange(
              e.target.value === '' ? null : e.target.valueAsNumber
            )
          }
          {...props}
        />
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

/** A multi-line text input; the field's value is a string ("" when blank). */
function TextareaField({
  label,
  className,
  controlClassName,
  orientation,
  ...props
}: BaseFieldProps & Omit<React.ComponentProps<typeof Textarea>, OwnProps>) {
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
      <Textarea
        id={field.name}
        className={controlClassName}
        name={field.name}
        value={field.state.value ?? ''}
        aria-invalid={!field.state.meta.isValid}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
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

/** A rich text editor; the field's value is HTML ("" when empty). */
function TextEditorField({
  label,
  className,
  controlClassName,
  orientation,
  ...props
}: BaseFieldProps &
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
      <TextEditor
        id={field.name}
        contentClassName={cn("min-h-40", controlClassName)}
        value={field.state.value ?? ''}
        aria-invalid={!field.state.meta.isValid}
        onChange={field.handleChange}
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

/** "YYYY-MM-DD" to a local Date (midnight), or undefined when blank/invalid. */
function parseDateValue(value: string | null | undefined) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (!match) return undefined
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

/** A local Date to "YYYY-MM-DD". */
function toDateValue(date: Date) {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

/**
 * A date picked from a calendar; the field's value is "YYYY-MM-DD" ("" when
 * blank), the same format as an `<input type="date">`.
 */
function DatePickerField({
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
function DateTimePickerField({
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

/**
 * A choice from a fixed list; the field's value is the option's `value`.
 * With `emptyLabel` the choice is optional: that item sets the value to null.
 */
function SelectField({
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

/** Always horizontal: the box, then its label. */
function CheckboxField({
  label,
  className,
  controlClassName,
}: Omit<BaseFieldProps, 'orientation'>) {
  const field = useFieldContext<boolean>()

  return (
    <Field
      orientation="horizontal"
      className={className}
      data-invalid={!field.state.meta.isValid}
    >
      <Checkbox
        id={field.name}
        className={controlClassName}
        name={field.name}
        // Submit "off" when unchecked so the server always receives a value.
        uncheckedValue="off"
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
      />
      <FieldLabel htmlFor={field.name} className="font-normal">
        {label}
      </FieldLabel>
    </Field>
  )
}

/**
 * Submit button. The form's onSubmit handler calls form.handleSubmit, so the
 * button only submits the form. Pass `pending` while a server action runs.
 */
function SubmitButton({
  label,
  pending,
  className,
}: {
  label: string
  pending?: boolean
  className?: string
}) {
  const form = useFormContext()
  return (
    // isFieldsValid ignores form-level server errors, so a failed request can be retried.
    <form.Subscribe
      selector={(state) => [state.isSubmitting, state.isFieldsValid]}
    >
      {([isSubmitting, isFieldsValid]) => (
        <Button
          type="submit"
          className={className}
          disabled={pending || isSubmitting || !isFieldsValid}
        >
          {(pending || isSubmitting) && <Spinner data-icon="inline-start" />}
          {label}
        </Button>
      )}
    </form.Subscribe>
  )
}

/** Flattens a validation error (string, issue, list or map of them) into messages. */
/**
 * The messages of field or form errors, translated: contract keys
 * ("customers.name.required") and frontend keys ("auth.validation.email")
 * become text in the user's language; other text is shown as is.
 */
function useErrorText() {
  const t = useTranslations()
  return (error: unknown) =>
    errorMessages(error).map((message) => {
      const contract = `contracts.${message}`
      if (t.has(contract as never)) return t(contract as never)
      return t.has(message as never) ? t(message as never) : message
    })
}

function errorMessages(error: unknown): string[] {
  if (!error) return []
  if (typeof error === 'string') return [error]
  if (Array.isArray(error)) return error.flatMap(errorMessages)
  if (typeof error === 'object') {
    if ('message' in error && typeof error.message === 'string')
      return [error.message]
    return Object.values(error).flatMap(errorMessages)
  }
  return []
}

function FormErrors() {
  const form = useFormContext()
  const errorText = useErrorText()
  const t = useTranslations('form')
  const formErrors = useSelector(form.store, (formState) => formState.errorMap)
  const messages = [
    ...new Set([
      ...errorText(formErrors.onServer),
      ...errorText(formErrors.onSubmit),
    ]),
  ]

  return (
    messages.length > 0 && (
      <Alert variant="destructive">
        <TriangleAlertIcon />
        <AlertTitle>
          {formErrors.onServer ? t('serverError') : t('hasErrors')}
        </AlertTitle>
        <AlertDescription>
          {messages.map((message, i) => (
            <p key={i}>{message}</p>
          ))}
        </AlertDescription>
      </Alert>
    )
  )
}

export {
  useErrorText,
  TextField,
  PasswordField,
  UncontrolledField,
  NumberField,
  TextareaField,
  TextEditorField,
  DatePickerField,
  DateTimePickerField,
  CheckboxField,
  SelectField,
  SubmitButton,
  FormErrors,
}
