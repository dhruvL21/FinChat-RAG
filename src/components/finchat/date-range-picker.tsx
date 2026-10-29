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
    <div className={cn("inline-block shrink-0", className)}>
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className="w-auto justify-start text-left font-semibold text-slate-800 bg-white border border-slate-200 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-2xs h-9 px-3 text-xs rounded-xl whitespace-nowrap"
          >
            <CalendarIcon className="mr-2 h-3.5 w-3.5 text-slate-600 shrink-0" />
            {mounted && date?.from ? (
              date.to ? (
                <span className="truncate text-xs font-semibold text-slate-800">
                  {format(date.from, "LLL dd, y")} - {format(date.to, "LLL dd, y")}
                </span>
              ) : (
                <span className="text-xs font-semibold text-slate-800">{format(date.from, "LLL dd, y")}</span>
              )
            ) : (
              <span className="text-xs font-semibold text-slate-800">All Time (Filter)</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0 z-[100] rounded-2xl border border-slate-200/90 shadow-[0_20px_45px_-4px_rgba(0,0,0,0.25)] bg-white overflow-hidden max-w-[96vw] sm:max-w-none" align="end">
          <Calendar
            initialFocus
            mode="range"
            defaultMonth={date?.from || new Date()}
            selected={date}
            onSelect={handleSelect}
            numberOfMonths={isMobile ? 1 : 2}
          />
          <div className="p-2.5 border-t border-slate-100 flex items-center justify-between gap-2 bg-slate-50/70">
            <Button 
              variant="ghost" 
              size="sm" 
              className="text-xs h-8 text-slate-600 hover:text-slate-900 rounded-xl px-3"
              onClick={() => handleSelect(undefined)}
            >
              All Time
            </Button>
            <Button 
              variant="secondary" 
              size="sm" 
              className="text-xs h-8 font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200/60 rounded-xl px-3"
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
