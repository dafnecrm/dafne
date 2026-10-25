'use client'

import { useFieldContext, useFormContext } from '@/lib/form-context'
import { Field, FieldError, FieldLabel } from './field'
import { Input } from "./input"
import { Button } from './button'
import { Spinner } from './spinner'
import { Alert, AlertDescription, AlertTitle } from './alert'
import { useSelector } from '@tanstack/react-form-nextjs'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from './input-group'
import { Eye, EyeOff } from 'lucide-react'
import React, { useRef, useState } from 'react'

type TextFieldProps = {
  label: string
  className?: string
  addons?: React.ReactNode[]
  uncontrolled?: boolean
} & Pick<React.ComponentProps<typeof Field>, 'orientation'>
  & Omit<React.ComponentProps<typeof Input>, "name" | "value" | "ariaInvalid" | "onChange" | "onBlur" | "className">

function TextField({ label, className, addons, uncontrolled, orientation, ...props }: TextFieldProps) {
  const field = useFieldContext<string>()

  return (
    <Field className={className} orientation={orientation} data-invalid={!field.state.meta.isValid}>
      <FieldLabel htmlFor={field.name} className={"text-nowrap"}>{label}</FieldLabel>
      <InputGroup>
        {addons}
        <InputGroupInput
          id={field.name}
          name={field.name}
          value={!uncontrolled ? field.state.value : field.state.value ?? ''}
          aria-invalid={!field.state.meta.isValid}
          onBlur={field.handleBlur}
          onChange={(e) => field.handleChange(e.target.value)}
          {...props}
          readOnly={uncontrolled || props.readOnly}
        />
      </InputGroup>
      <FieldError>
        {field.state.meta.errors.reduce((errors, error) => {
          if (!errors.find((e: any) => e.code === error.code)) {
            errors.push(error)
          }
          return errors;
        }, []).map((error: any, i: number) => <p key={i}>{error?.message}</p>)}
      </FieldError>
    </Field>
  )
}

function PasswordField({ label, ...props }: Omit<TextFieldProps, 'type'>) {
  const [showPassword, setShowPassword] = useState(false)
  const showPasswordAddon = [
    <InputGroupAddon key={2} align={"inline-end"}>
      <InputGroupButton
        aria-label={showPassword ? 'Hide password' : 'Show password'}
        onClick={() => setShowPassword((show) => !show)}
      >
        {showPassword ? <EyeOff /> : <Eye />}
      </InputGroupButton>
    </InputGroupAddon>
  ]
  return <TextField
    label={label}
    type={showPassword ? 'text' : 'password'}
    addons={showPasswordAddon}
    {...props}
  />
}

function UncontrolledField({ label, ...props }: Omit<TextFieldProps, 'uncontrolled'>) {
  return <TextField
    label={label}
    uncontrolled
    {...props}
  />
}

function SubmitButton({ label }: { label: string }) {
  const form = useFormContext()
  return (
    <form.Subscribe selector={(state) => [state.isSubmitting, state.canSubmit]}>
      {([isSubmitting, canSubmit]) => (
        <Button type="submit" disabled={isSubmitting || !canSubmit} onClick={form.handleSubmit}>
          {isSubmitting && <Spinner />}
          {label}
        </Button>
      )}
    </form.Subscribe>
  )
}

function FormErrors() {
  const form = useFormContext()
  const formErrors = useSelector(form.store, (formState) => formState.errorMap)

  return formErrors.onSubmit && <Alert variant="destructive">
    <AlertTitle>Form has errors!</AlertTitle>
    <AlertDescription>
      {Object.keys(formErrors.onSubmit).reduce((errors, k) => {
        return errors.concat(formErrors.onSubmit[k]);
      }, []).map((error: any, i: number) => <p key={i}>{error?.message}</p>)}
    </AlertDescription>
  </Alert>
}

export {
  TextField,
  PasswordField,
  UncontrolledField,
  SubmitButton,
  FormErrors
}
