import type { Field } from '@dafne/frontend-ui/components/field'
import type React from 'react'

/** Props every field takes. */
export type BaseFieldProps = {
  label: string
  /** Classes of the whole field (label, control and errors). */
  className?: string
  /** Classes of the control itself (input box, textarea, editor area…), e.g. its height. */
  controlClassName?: string
} & Pick<React.ComponentProps<typeof Field>, 'orientation'>

/** Props of the control that the field sets itself. */
export type OwnProps =
  | 'id'
  | 'name'
  | 'value'
  | 'aria-invalid'
  | 'onChange'
  | 'onBlur'
  | 'className'
