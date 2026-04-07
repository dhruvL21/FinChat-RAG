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
import { useIsMobile } from "@/hooks/use-mobile"

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
  const isMobile = useIsMobile();

  React.useEffect(() => {
    setMounted(true);
    const initialRange = {
      from: subMonths(new Date(), 1),
      to: new Date(),
    };
    setDate(initialRange);
    onRangeChange(initialRange);
  }, []);

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
              "w-fit min-w-[160px] md:min-w-[280px] justify-start text-left font-normal bg-white/80 border-primary/20 hover:bg-white hover:border-primary/40 transition-all shadow-sm",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
            {mounted && date?.from ? (
              date.to ? (
                <span className="truncate text-xs md:text-sm">
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </span>
              ) : (
                <span className="text-xs md:text-sm">{format(date.from, "LLL dd, y")}</span>
              )
            ) : (
              <span className="text-xs md:text-sm font-medium">Filter by date</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[100]" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={setDate}
            numberOfMonths={isMobile ? 1 : 2}
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
