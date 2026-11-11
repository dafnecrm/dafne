'use client'

import { Field, FieldLabel } from '@dafne/frontend-ui/components/field'
import { useFieldContext } from '../form-context.ts'
import type { BaseFieldProps } from './base.ts'
import { Switch } from '@dafne/frontend-ui/components/switch'

/** Always horizontal: the box, then its label. */
export function SwitchField({
  label,
  className,
  controlClassName,
  orientation
}: BaseFieldProps) {
  const field = useFieldContext<boolean>()

  return (
    <Field
      orientation={orientation}
      className={className}
      data-invalid={!field.state.meta.isValid}
    >
      {label && <FieldLabel htmlFor={field.name}>
        {label}
      </FieldLabel>}
      <Switch
        id={field.name}
        className={controlClassName}
        name={field.name}
        // Submit "off" when unchecked so the server always receives a value.
        uncheckedValue="off"
        checked={field.state.value}
        onCheckedChange={(checked) => field.handleChange(checked)}
        onBlur={field.handleBlur}
      />
    </Field>
  )
}
