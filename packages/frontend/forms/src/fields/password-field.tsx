'use client'

import { InputGroupAddon, InputGroupButton } from '@dafne/frontend-ui/components/input-group'
import { Eye, EyeOff } from 'lucide-react'
import { useTranslations } from 'next-intl'
import { useState } from 'react'
import { TextField, type TextFieldProps } from './text-field.tsx'

export function PasswordField({ label, ...props }: Omit<TextFieldProps, 'type'>) {
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
