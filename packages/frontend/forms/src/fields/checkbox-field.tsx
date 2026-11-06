'use client'

import { Checkbox } from '@dafne/frontend-ui/components/checkbox'
import { Field, FieldLabel } from '@dafne/frontend-ui/components/field'
import { useFieldContext } from '../form-context.ts'
import type { BaseFieldProps } from './base.ts'

/** Always horizontal: the box, then its label. */
export function CheckboxField({
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
