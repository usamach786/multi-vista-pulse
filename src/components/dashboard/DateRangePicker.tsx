import { useMemo, useState } from "react";
import { Calendar as CalendarIcon } from "lucide-react";
import { type DateRange } from "react-day-picker";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type PresetKey = "today" | "7" | "30" | "custom";

export interface DateRangeValue {
  start?: Date;
  end?: Date;
  preset: PresetKey;
}

interface Props {
  value: DateRangeValue;
  onChange: (v: DateRangeValue) => void;
  className?: string;
}

const PRESETS: { key: PresetKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7", label: "Last 7 Days" },
  { key: "30", label: "Last 30 Days" },
  { key: "custom", label: "Custom Range" },
];

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

function formatRange(start?: Date, end?: Date): string {
  if (!start && !end) return "Select range";
  const fmt = (d: Date) => d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  if (start && end) return `${fmt(start)} – ${fmt(end)}`;
  return fmt((start || end)!);
}

function presetToRange(preset: PresetKey): { start?: Date; end?: Date } {
  const today = startOfToday();
  if (preset === "today") return { start: today, end: today };
  if (preset === "7") return { start: daysAgo(6), end: today };
  if (preset === "30") return { start: daysAgo(29), end: today };
  return {};
}

export function DateRangePicker({ value, onChange, className }: Props) {
  const [open, setOpen] = useState(false);
  const range = useMemo<DateRange | undefined>(() => {
    if (value.start && value.end) return { from: value.start, to: value.end };
    if (value.start) return { from: value.start };
    return undefined;
  }, [value.start, value.end]);

  const applyPreset = (preset: PresetKey) => {
    if (preset === "custom") {
      onChange({ preset: "custom", start: value.start, end: value.end });
      return;
    }
    const { start, end } = presetToRange(preset);
    onChange({ preset, start, end });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          className={cn("h-9 min-w-[230px] justify-between font-normal", className)}
        >
          <span className="flex items-center gap-2">
            <CalendarIcon className="h-4 w-4 text-muted-foreground" />
            {formatRange(value.start, value.end)}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-auto p-0"
      >
        <div className="flex">
          <div className="flex w-40 shrink-0 flex-col gap-1 border-r border-border/60 bg-muted/30 p-2">
            {PRESETS.map((p) => (
              <button
                key={p.key}
                onClick={() => applyPreset(p.key)}
                className={cn(
                  "rounded-md px-3 py-2 text-left text-sm transition-colors",
                  value.preset === p.key
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
          <div className="p-2">
            <Calendar
              mode="range"
              selected={range}
              numberOfMonths={1}
              defaultMonth={value.start || new Date()}
              disabled={{ after: startOfToday() }}
              onSelect={(selected) => {
                if (!selected) return;
                const from = selected.from;
                const to = selected.to ?? selected.from;
                onChange({ preset: "custom", start: from, end: to });
                if (from && to && from.getTime() !== to.getTime()) {
                  setOpen(false);
                }
              }}
            />
            <div className="flex items-center justify-between gap-2 border-t border-border/60 px-2 pb-1 pt-2 text-xs text-muted-foreground">
              <span>
                {value.start && value.end
                  ? `${(value.end.getTime() - value.start.getTime()) / 86_400_000 + 1} day(s) selected`
                  : "Pick a start and end date"}
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setOpen(false)}
                className="h-7"
              >
                Done
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
