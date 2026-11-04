"use client"

import * as React from "react"
import { useTranslations } from "next-intl"
import { cn } from "cn"
import { CalendarIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { useDateLocale } from "@/components/local-date"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { formatDate, type DateFormat } from "@/lib/dates"

type CalendarProps = React.ComponentProps<typeof Calendar>

type DatePickerProps = {
  /** The selected date, or undefined when empty. */
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  /** How the selected date is shown in the button. */
  format?: DateFormat
  /** Disables the whole picker. Use `disabledDays` to disable some days. */
  disabled?: boolean
  /** Days that can't be picked (react-day-picker matchers). */
  disabledDays?: CalendarProps["disabled"]
  /** "dropdown" shows month/year selects, handy for far dates (e.g. birth dates). */
  captionLayout?: CalendarProps["captionLayout"]
  startMonth?: Date
  endMonth?: Date
  id?: string
  name?: string
  className?: string
  "aria-invalid"?: boolean
  "aria-describedby"?: string
  onBlur?: () => void
}

/**
 * A button that opens a calendar to pick one date. Controlled: pass `value`
 * and `onChange`. The popover closes when a date is picked.
 */
function DatePicker({
  value,
  onChange,
  placeholder,
  format = "longDate",
  disabled,
  disabledDays,
  captionLayout = "dropdown",
  startMonth,
  endMonth,
  className,
  onBlur,
  ...buttonProps
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const locale = useDateLocale()
  const t = useTranslations("form")

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next)
        if (!next) onBlur?.()
      }}
    >
      <PopoverTrigger
        disabled={disabled}
        render={
          <Button
            variant="outline"
            data-slot="date-picker"
            data-empty={!value}
            className={cn(
              "w-full justify-start text-left font-normal data-[empty=true]:text-muted-foreground",
              className
            )}
            {...buttonProps}
          />
        }
      >
        <CalendarIcon />
        {value ? formatDate(value, format, { locale }) : <span>{placeholder ?? t("pickDate")}</span>}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={value}
          defaultMonth={value}
          onSelect={(date) => {
            onChange?.(date)
            setOpen(false)
          }}
          disabled={disabledDays}
          captionLayout={captionLayout}
          startMonth={startMonth}
          endMonth={endMonth}
          locale={locale}
          autoFocus
        />
      </PopoverContent>
    </Popover>
  )
}

export { DatePicker, type DatePickerProps }
