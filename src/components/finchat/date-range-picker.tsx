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
  }, []);

  const handleSelect = (newDate: DateRange | undefined) => {
    setDate(newDate);
    onRangeChange(newDate);
  };

  return (
    <div className={cn("grid gap-2", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant={"outline"}
            className={cn(
              "w-fit min-w-[130px] md:min-w-[210px] justify-start text-left font-medium bg-white border-slate-200 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs h-9 text-xs rounded-xl",
              !date && "text-slate-600"
            )}
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-500 shrink-0" />
            {mounted && date?.from ? (
              date.to ? (
                <span className="truncate text-xs">
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </span>
              ) : (
                <span className="text-xs">{format(date.from, "LLL dd, y")}</span>
              )
            ) : (
              <span className="text-xs font-medium">All Time (Filter)</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[100]" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from || new Date()}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={isMobile ? 1 : 2}
          />
          <div className="p-2.5 border-t flex items-center justify-between gap-2 bg-muted/20">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-7 text-muted-foreground hover:text-foreground"
              onClick={() => handleSelect(undefined)}
            >
              All Time
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="text-xs h-7 font-bold text-primary"
              onClick={() => handleSelect({ from: subMonths(new Date(), 1), to: new Date() })}
            >
              Last 30 Days
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  )
}
