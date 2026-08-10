"use client";

import { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

function parseDate(value?: string | null) {
  if (!value) return { year: "", month: "", day: "" };
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return { year: "", month: "", day: "" };
  return { year: match[1], month: match[2], day: match[3] };
}

function joinDate(year: string, month: string, day: string) {
  if (!year || !month || !day) return "";
  const max = daysInMonth(Number(year), Number(month));
  const safeDay = Math.min(Number(day), max);
  return `${year}-${month}-${String(safeDay).padStart(2, "0")}`;
}

const YEARS = Array.from({ length: 8 }, (_, i) => String(new Date().getFullYear() - 1 + i));
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, "0"));

const selectClass =
  "h-10 w-full rounded-md border border-slate-200 bg-white px-2 text-sm outline-none focus:ring-2 focus:ring-slate-200";

export function DateSelect({
  label,
  name,
  value,
  defaultValue,
  required,
  onChange,
  className,
}: {
  label?: string;
  name?: string;
  value?: string | null;
  defaultValue?: string | null;
  required?: boolean;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const source = value !== undefined ? value : defaultValue;
  const parsed = parseDate(source);
  const [year, setYear] = useState(parsed.year);
  const [month, setMonth] = useState(parsed.month);
  const [day, setDay] = useState(parsed.day);

  useEffect(() => {
    if (value === undefined) return;
    const next = parseDate(value);
    setYear(next.year);
    setMonth(next.month);
    setDay(next.day);
  }, [value]);

  const dayOptions = useMemo(() => {
    if (!year || !month) {
      return Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, "0"));
    }
    const count = daysInMonth(Number(year), Number(month));
    return Array.from({ length: count }, (_, i) => String(i + 1).padStart(2, "0"));
  }, [year, month]);

  function commit(nextYear: string, nextMonth: string, nextDay: string) {
    setYear(nextYear);
    setMonth(nextMonth);
    let safeDay = nextDay;
    if (nextYear && nextMonth && nextDay) {
      const max = daysInMonth(Number(nextYear), Number(nextMonth));
      if (Number(nextDay) > max) safeDay = String(max).padStart(2, "0");
    }
    setDay(safeDay);
    const joined = joinDate(nextYear, nextMonth, safeDay);
    onChange?.(joined);
  }

  return (
    <div className={cn("space-y-2", className)}>
      {label && <Label>{label}</Label>}
      {name && <input type="hidden" name={name} value={joinDate(year, month, day)} />}
      <div className="grid grid-cols-3 gap-2">
        <select
          aria-label="年"
          className={selectClass}
          value={year}
          required={required}
          onChange={(e) => commit(e.target.value, month, day)}
        >
          <option value="">年</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}年
            </option>
          ))}
        </select>
        <select
          aria-label="月"
          className={selectClass}
          value={month}
          required={required}
          onChange={(e) => commit(year, e.target.value, day)}
        >
          <option value="">月</option>
          {MONTHS.map((m) => (
            <option key={m} value={m}>
              {Number(m)}月
            </option>
          ))}
        </select>
        <select
          aria-label="日"
          className={selectClass}
          value={day}
          required={required}
          onChange={(e) => commit(year, month, e.target.value)}
        >
          <option value="">日</option>
          {dayOptions.map((d) => (
            <option key={d} value={d}>
              {Number(d)}日
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
