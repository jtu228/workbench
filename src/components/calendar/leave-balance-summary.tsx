import { LEAVE_KIND_COLORS } from "@/lib/constants";
import type { getLeaveBalances } from "@/lib/leave";
import { cn } from "@/lib/utils";

type LeaveBalances = ReturnType<typeof getLeaveBalances>;

export function LeaveBalanceSummary({
  balances,
  className,
  variant = "cards",
}: {
  balances: LeaveBalances;
  className?: string;
  variant?: "cards" | "inline";
}) {
  const items = [
    {
      key: "sick",
      short: "本月病假",
      tiny: "病假",
      value: balances.sick.remaining,
      color: LEAVE_KIND_COLORS.sick,
    },
    {
      key: "annual",
      short: "今年年假",
      tiny: "年假",
      value: balances.annual.remaining,
      color: LEAVE_KIND_COLORS.annual,
    },
    {
      key: "onlyChild",
      short: "独生子女假",
      tiny: "独生子女",
      value: balances.onlyChild.remaining,
      color: LEAVE_KIND_COLORS.only_child,
    },
  ] as const;

  if (variant === "inline") {
    return (
      <div
        className={cn(
          "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600",
          className
        )}
        title="假期余额"
      >
        <span className="text-xs font-medium text-slate-400">假期</span>
        {items.map((item) => (
          <span key={item.key} className="inline-flex items-center gap-1.5">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-slate-500">{item.tiny}</span>
            <span className="font-semibold tabular-nums text-slate-800">
              {item.value}
              <span className="ml-0.5 font-normal text-slate-400">天</span>
            </span>
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2", className)}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">假期余额</p>
      <div className="grid grid-cols-3 gap-2">
        {items.map((item) => (
          <div
            key={item.key}
            className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 shadow-sm"
            style={{ borderTopColor: item.color, borderTopWidth: 3 }}
          >
            <p className="truncate text-[11px] text-slate-500">{item.short}</p>
            <p className="mt-0.5 flex items-baseline gap-0.5">
              <span className="text-xl font-semibold tabular-nums text-slate-900">
                {item.value}
              </span>
              <span className="text-xs text-slate-400">天</span>
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
