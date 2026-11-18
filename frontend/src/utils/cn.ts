import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatPercent(val: number | null | undefined): string {
  if (val === null || val === undefined) return "N/A";
  return `${(val * 100).toFixed(1)}%`;
}

export function formatNumber(val: number | null | undefined): string {
  if (val === null || val === undefined) return "N/A";
  return val.toLocaleString();
}

export function formatDelta(val: number | null | undefined): string {
  if (val === null || val === undefined) return "N/A";
  const sign = val > 0 ? "+" : "";
  return `${sign}${val.toFixed(4)}`;
}
