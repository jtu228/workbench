import { eachDayOfInterval, format, parseISO } from "date-fns";

type HolidaySpec = {
  name: string;
  from: string;
  to: string;
  work?: string[];
};

/** Official mainland China public-holiday rest and makeup-work days. */
const HOLIDAY_SPECS: HolidaySpec[] = [
  // 2025 国办发明电〔2024〕12号
  { name: "元旦", from: "2025-01-01", to: "2025-01-01" },
  { name: "春节", from: "2025-01-28", to: "2025-02-04", work: ["2025-01-26", "2025-02-08"] },
  { name: "清明", from: "2025-04-04", to: "2025-04-06" },
  { name: "劳动", from: "2025-05-01", to: "2025-05-05", work: ["2025-04-27"] },
  { name: "端午", from: "2025-05-31", to: "2025-06-02" },
  {
    name: "国庆",
    from: "2025-10-01",
    to: "2025-10-08",
    work: ["2025-09-28", "2025-10-11"],
  },
  { name: "中秋", from: "2025-10-06", to: "2025-10-06" },

  // 2026 国办发明电〔2025〕7号
  { name: "元旦", from: "2026-01-01", to: "2026-01-03", work: ["2026-01-04"] },
  { name: "春节", from: "2026-02-15", to: "2026-02-23", work: ["2026-02-14", "2026-02-28"] },
  { name: "清明", from: "2026-04-04", to: "2026-04-06" },
  { name: "劳动", from: "2026-05-01", to: "2026-05-05", work: ["2026-05-09"] },
  { name: "端午", from: "2026-06-19", to: "2026-06-21" },
  { name: "中秋", from: "2026-09-25", to: "2026-09-27" },
  { name: "国庆", from: "2026-10-01", to: "2026-10-07", work: ["2026-09-20", "2026-10-10"] },
];

const restByDate = new Map<string, string>();
const makeupWorkDates = new Set<string>();

for (const spec of HOLIDAY_SPECS) {
  for (const day of eachDayOfInterval({
    start: parseISO(spec.from),
    end: parseISO(spec.to),
  })) {
    restByDate.set(format(day, "yyyy-MM-dd"), spec.name);
  }
  for (const work of spec.work ?? []) {
    makeupWorkDates.add(work);
  }
}

export function toDateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

export type ChinaDayMark = {
  holidayName: string | null;
  isRest: boolean;
  isMakeupWork: boolean;
  isWeekend: boolean;
  isOff: boolean;
};

export function getChinaDayMark(date: Date): ChinaDayMark {
  const key = toDateKey(date);
  const holidayName = restByDate.get(key) ?? null;
  const isRest = holidayName !== null;
  const isMakeupWork = makeupWorkDates.has(key);
  const isWeekend = date.getDay() === 0 || date.getDay() === 6;
  return {
    holidayName,
    isRest,
    isMakeupWork,
    isWeekend,
    isOff: !isMakeupWork && (isRest || isWeekend),
  };
}
