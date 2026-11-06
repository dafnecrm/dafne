'use client'

import { Field, FieldError, FieldLabel } from '@dafne/frontend-ui/components/field'
import { InputGroup, InputGroupInput } from '@dafne/frontend-ui/components/input-group'
import { useFieldContext } from '../form-context.ts'
import { useErrorText } from './error-text.ts'
import type { TextFieldProps } from './text-field.tsx'

/**
 * A number input whose field value is a number: what's typed is converted,
 * and an empty input is null (the contract turns it into "not set").
 */
export function NumberField({
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
