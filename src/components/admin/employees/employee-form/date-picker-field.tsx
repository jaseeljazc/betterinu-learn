"use client"

import { format, parseISO } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

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
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {value ? format(selected!, "dd MMM yyyy") : placeholder}
        </Button>
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
