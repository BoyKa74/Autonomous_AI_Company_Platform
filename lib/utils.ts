import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function formatDate(
  value: string | null | undefined,
  locale: "en" | "vi" = "vi"
): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(new Date(value));
}

export function formatDateTime(
  value: string | null | undefined,
  locale: "en" | "vi" = "vi"
): string {
  if (!value) return "—";
  return new Intl.DateTimeFormat(locale === "en" ? "en-US" : "vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/** Rút gọn số follower: 1.2K, 3.4M */
export function compactNumber(value: number): string {
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  return String(value);
}

/** Thanh tín hiệu 0..1 theo thang log để so sánh kênh nhỏ/lớn */
export function signalLevel(value: number, max: number): number {
  if (max <= 0) return 0;
  const lv = Math.log10(value + 1) / Math.log10(max + 1);
  return Math.min(1, Math.max(0.04, lv));
}

export function formatVnd(
  value: number,
  locale: "en" | "vi" = "vi"
): string {
  const amount = new Intl.NumberFormat(
    locale === "en" ? "en-US" : "vi-VN"
  ).format(Math.round(value));
  return locale === "en" ? `VND ${amount}` : `${amount} ₫`;
}

export function formatUsd(value: number): string {
  return `$${value.toFixed(2)}`;
}
