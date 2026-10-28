'use client'

import { useFieldContext, useFormContext } from '@/lib/app-form/form-context'
import { Checkbox } from './checkbox'
import { Field, FieldError, FieldLabel } from './field'
import { Input } from './input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './select'
import { Button } from './button'
import { Spinner } from './spinner'
import { Alert, AlertDescription, AlertTitle } from './alert'
import { useSelector } from '@tanstack/react-form-nextjs'
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from './input-group'
import { Eye, EyeOff } from 'lucide-react'
import React, { useState } from 'react'

type TextFieldProps = {
  label: string
  className?: string
  addons?: React.ReactNode[]
  uncontrolled?: boolean
} & Pick<React.ComponentProps<typeof Field>, 'orientation'> &
  Omit<
    React.ComponentProps<typeof Input>,
    'name' | 'value' | 'ariaInvalid' | 'onChange' | 'onBlur' | 'className'
  >

function TextField({
  label,
  className,
  addons,
  uncontrolled,
  orientation,
  ...props
}: TextFieldProps) {
  const field = useFieldContext<string>()

  return (
    <Field
      className={className}
      orientation={orientation}
      data-invalid={!field.state.meta.isValid}
    >
      <FieldLabel htmlFor={field.name} className={'text-nowrap'}>
        {label}
      </FieldLabel>
      <InputGroup>
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
          [...new Set(errorMessages(field.state.meta.errors))].map(
            (message, i) => <p key={i}>{message}</p>
          )}
      </FieldError>
    </Field>
  )
}

function PasswordField({ label, ...props }: Omit<TextFieldProps, 'type'>) {
  const [showPassword, setShowPassword] = useState(false)
  const showPasswordAddon = [
    <InputGroupAddon key={2} align={'inline-end'}>
      <InputGroupButton
        aria-label={showPassword ? 'Hide password' : 'Show password'}
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
  addons,
  orientation,
  ...props
}: Omit<TextFieldProps, 'type' | 'uncontrolled'>) {
  const field = useFieldContext<number | null>()

  return (
    <Field
      className={className}
      orientation={orientation}
      data-invalid={!field.state.meta.isValid}
    >
      <FieldLabel htmlFor={field.name} className={'text-nowrap'}>
        {label}
      </FieldLabel>
      <InputGroup>
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
          [...new Set(errorMessages(field.state.meta.errors))].map(
            (message, i) => <p key={i}>{message}</p>
          )}
      </FieldError>
    </Field>
  )
}

/** A choice from a fixed list; the field's value is the option's `value`. */
function SelectField({
  label,
  options,
  className,
}: {
  label: string
  options: readonly { value: string; label: string }[]
  className?: string
}) {
  const field = useFieldContext<string>()

  return (
    <Field className={className} data-invalid={!field.state.meta.isValid}>
      <FieldLabel htmlFor={field.name}>{label}</FieldLabel>
      <Select
        items={options}
        name={field.name}
        value={field.state.value}
        onValueChange={(value) => value !== null && field.handleChange(value)}
      >
        <SelectTrigger
          id={field.name}
          className="w-full"
          aria-invalid={!field.state.meta.isValid}
          onBlur={field.handleBlur}
        >
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <FieldError>
        {field.state.meta.errors.length > 0 &&
          [...new Set(errorMessages(field.state.meta.errors))].map(
            (message, i) => <p key={i}>{message}</p>
          )}
      </FieldError>
    </Field>
  )
}

function CheckboxField({
  label,
  className,
}: {
  label: string
  className?: string
}) {
  const field = useFieldContext<boolean>()

  return (
    <Field
      orientation="horizontal"
      className={className}
      data-invalid={!field.state.meta.isValid}
    >
      <Checkbox
        id={field.name}
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
  const formErrors = useSelector(form.store, (formState) => formState.errorMap)
  const messages = [
    ...new Set([
      ...errorMessages(formErrors.onServer),
      ...errorMessages(formErrors.onSubmit),
    ]),
  ]

  return (
    messages.length > 0 && (
      <Alert variant="destructive">
        <AlertTitle>
          {formErrors.onServer ? 'Something went wrong' : 'Form has errors!'}
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
  TextField,
  PasswordField,
  UncontrolledField,
  NumberField,
  CheckboxField,
  SelectField,
  SubmitButton,
  FormErrors,
}
