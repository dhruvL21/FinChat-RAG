'use client';

import * as React from "react"
import { format, subMonths } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { DateRange } from "react-day-picker"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface DatePickerWithRangeProps {
  className?: string;
  onRangeChange: (range: DateRange | undefined) => void;
}

export function DatePickerWithRange({
  className,
  onRangeChange,
}: DatePickerWithRangeProps) {
  const [mounted, setMounted] = React.useState(false);
  const [date, setDate] = React.useState<DateRange | undefined>(undefined);

  React.useEffect(() => {
    setMounted(true);
    // Initialize date only on client to avoid hydration mismatch
    const initialRange = {
      from: subMonths(new Date(), 1),
      to: new Date(),
    };
    setDate(initialRange);
    onRangeChange(initialRange);
  }, []); // Only run once on mount

  // Sync state changes with parent, but only after initial mount
  React.useEffect(() => {
    if (mounted) {
      onRangeChange(date);
    }
  }, [date, mounted, onRangeChange]);

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-[240px] md:w-[300px] justify-start text-left font-normal bg-white/50 border-primary/20",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {mounted && date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
