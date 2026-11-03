import type { Currency } from "./catalog"

export function parseAmountToCents(value: string | number): number {
  const numeric = typeof value === "number" ? value : Number.parseFloat(value)
  if (!Number.isFinite(numeric) || numeric < 0) {
    throw new Error("金额必须是大于等于 0 的数字")
  }
  return Math.round(numeric * 100)
}

export function centsToAmount(cents: number): number {
  return cents / 100
}

export function formatMoney(cents: number, currency: Currency): string {
  const amount = centsToAmount(cents)
  try {
    return new Intl.NumberFormat(currency === "CNY" ? "zh-CN" : "en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}
