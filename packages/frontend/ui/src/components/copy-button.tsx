'use client'

import { Check, Copy } from "lucide-react";
import { Button } from "@dafne/frontend-ui/components/button";
import { useState } from "react";
import { useTranslations } from "next-intl";

export default function CopyButton({
  value,
  closeAfter = 1000,
  ...props
}: {
  value: string
  closeAfter?: number
} & React.ComponentProps<typeof Button>) {
  const [open, setOpen] = useState(false)
  const t = useTranslations("common")

  function copyValue() {
    navigator.clipboard.writeText(value)
    setOpen(true)
    setTimeout(() => {
      setOpen(false)
    }, closeAfter);
  }
  return (
    <Button {...props} onClick={copyValue}>
      {open ? <Check className="text-green-600 dark:text-green-500" /> : <Copy />}
    </Button>
  )
}