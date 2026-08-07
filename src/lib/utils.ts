import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined) {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString("zh-CN");
}

export function formatCurrency(amount: number | null | undefined) {
  if (amount == null) return "—";
  return new Intl.NumberFormat("zh-CN", {
    style: "currency",
    currency: "CNY",
  }).format(amount);
}

export function getProjectDisplayAmount(
  finance:
    | {
        contract_amount?: number | null;
        initial_cert_fee?: number | null;
        surveillance_1_fee?: number | null;
        surveillance_2_fee?: number | null;
        training_fee?: number | null;
        technical_service_fee?: number | null;
      }
    | null
    | undefined,
  projectType: string
) {
  if (!finance) return null;
  if (projectType === "certification") {
    const total =
      (finance.initial_cert_fee ?? 0) +
      (finance.surveillance_1_fee ?? 0) +
      (finance.surveillance_2_fee ?? 0);
    return finance.initial_cert_fee != null ||
      finance.surveillance_1_fee != null ||
      finance.surveillance_2_fee != null
      ? total
      : null;
  }
  if (projectType === "training") return finance.training_fee ?? null;
  if (projectType === "technical_service") return finance.technical_service_fee ?? null;
  return finance.contract_amount ?? null;
}

