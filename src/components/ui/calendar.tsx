"use client"

import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { DayPicker } from "react-day-picker"

import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"

export type CalendarProps = React.ComponentProps<typeof DayPicker>

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("p-3 select-none", className)}
      classNames={{
        root: "relative",
        months: "flex flex-col sm:flex-row gap-4 relative",
        month: "space-y-3",
        month_caption: "flex justify-center items-center h-7 relative",
        caption_label: "text-sm font-semibold text-slate-800",
        nav: "flex items-center justify-between absolute inset-x-1 top-0 h-7 pointer-events-none z-10",
        button_previous: cn(
          buttonVariants({ variant: "outline" }),
          "pointer-events-auto h-7 w-7 bg-white p-0 opacity-70 hover:opacity-100 flex items-center justify-center rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 text-slate-700"
        ),
        button_next: cn(
          buttonVariants({ variant: "outline" }),
          "pointer-events-auto h-7 w-7 bg-white p-0 opacity-70 hover:opacity-100 flex items-center justify-center rounded-lg border border-slate-200 shadow-2xs hover:bg-slate-50 text-slate-700"
        ),
        month_grid: "w-full border-collapse",
        weekdays: "flex w-full",
        weekday: "text-slate-400 rounded-md w-9 font-medium text-[0.8rem] text-center",
        weeks: "flex flex-col gap-1 mt-2",
        week: "flex w-full",
        day: "h-9 w-9 text-center text-sm p-0 relative flex items-center justify-center focus-within:relative focus-within:z-20",
        day_button: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 p-0 font-normal hover:bg-slate-100 rounded-lg text-slate-800 transition-colors"
        ),
        range_start: "rounded-l-lg bg-blue-100/70 [&>button]:bg-blue-600 [&>button]:text-white [&>button]:hover:bg-blue-700 [&>button]:font-bold [&>button]:rounded-lg",
        range_middle: "bg-blue-50/80 rounded-none [&>button]:bg-transparent [&>button]:text-blue-900 [&>button]:hover:bg-blue-100/60 [&>button]:rounded-none",
        range_end: "rounded-r-lg bg-blue-100/70 [&>button]:bg-blue-600 [&>button]:text-white [&>button]:hover:bg-blue-700 [&>button]:font-bold [&>button]:rounded-lg",
        selected: "[&>button]:bg-blue-600 [&>button]:text-white [&>button]:hover:bg-blue-700 [&>button]:font-bold [&>button]:rounded-lg",
        today: "font-bold text-blue-600 [&>button]:border [&>button]:border-blue-400/60 [&>button]:font-bold",
        outside: "text-slate-300 opacity-40 aria-selected:opacity-40",
        disabled: "text-slate-300 opacity-30 cursor-not-allowed pointer-events-none",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) => 
          orientation === 'left' ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}
Calendar.displayName = "Calendar"

export { Calendar }
