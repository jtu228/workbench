import { getChinaDayMark } from "@/lib/cn-holidays";
import { cn } from "@/lib/utils";

export function DayMarkMeta({
  date,
  muted,
}: {
  date: Date;
  muted?: boolean;
}) {
  const mark = getChinaDayMark(date);
  if (!mark.isRest && !mark.isMakeupWork) return null;

  return (
    <div className={cn("flex min-w-0 flex-col items-end gap-0.5 leading-none", muted && "opacity-40")}>
      {mark.isMakeupWork ? (
        <span className="text-[10px] font-medium text-slate-500">班</span>
      ) : (
        <span className="text-[10px] font-medium text-red-500">休</span>
      )}
      {mark.holidayName && !mark.isMakeupWork && (
        <span className="max-w-[3.5rem] truncate text-[10px] text-red-500">{mark.holidayName}</span>
      )}
    </div>
  );
}

export function weekendHeaderClass(weekdayIndex: number) {
  return weekdayIndex === 0 || weekdayIndex === 6 ? "text-red-500" : "text-slate-500";
}

export function dayNumberClass({
  inMonth,
  today,
  isOff,
  size = "sm",
}: {
  inMonth: boolean;
  today: boolean;
  isOff: boolean;
  size?: "sm" | "md";
}) {
  return cn(
    "inline-flex items-center justify-center rounded-full tabular-nums",
    size === "sm" && "h-6 w-6 text-xs",
    size === "md" && "h-7 min-w-7 px-1.5 text-sm",
    today && inMonth && "bg-slate-900 font-semibold text-white",
    !today && isOff && inMonth && "font-medium text-red-500",
    !today && isOff && !inMonth && "text-red-300",
    !today && !isOff && inMonth && "text-slate-800",
    !today && !isOff && !inMonth && "text-slate-300"
  );
}

export function dayCellClass({
  inMonth,
  today,
  isOff,
  selected,
}: {
  inMonth: boolean;
  today: boolean;
  isOff: boolean;
  selected?: boolean;
}) {
  return cn(
    !inMonth && "bg-slate-50/80",
    today && inMonth && "bg-blue-50/80",
    !today && inMonth && isOff && "bg-rose-50/80",
    selected && "ring-2 ring-inset ring-slate-900"
  );
}
