'use client'

import { TextField, type TextFieldProps } from './text-field.tsx'

export function UncontrolledField({
  label,
  ...props
}: Omit<TextFieldProps, 'uncontrolled'>) {
  return <TextField label={label} uncontrolled {...props} />
}
