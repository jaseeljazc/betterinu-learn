"use client"

import { format, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { inputCls } from "./types"

type DatePickerFieldProps = {
  value: string
  onChange: (val: string) => void
  placeholder?: string
}

export function DatePickerField({
  value,
  onChange,
  placeholder = "Pick a date",
}: DatePickerFieldProps) {
  const selected = value ? parseISO(value) : undefined
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={`${inputCls} flex items-center gap-2 text-left w-full ${
            !value ? "text-muted" : ""
          }`}
        >
          <CalendarIcon className="size-3.5 text-muted shrink-0" />
          {value ? format(selected!, "dd MMM yyyy") : placeholder}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={(date) => onChange(date ? format(date, "yyyy-MM-dd") : "")}
          captionLayout="dropdown"
          startMonth={new Date(1950, 0)}
          endMonth={new Date(new Date().getFullYear() + 5, 11)}
        />
      </PopoverContent>
    </Popover>
  )
}
