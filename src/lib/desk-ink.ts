import { isCategory, type Category, type Currency } from "@/lib/catalog"

function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`)
}

export const EMPTY_INK = {
  category: "暂无分类",
  subs: "暂无订阅",
  charges: "暂无扣费",
  compose: "记一笔",
} as const

export function formatMonthlyBanner(cents: number, currency: Currency): string {
  const amount = (Math.max(0, cents) / 100).toFixed(2)
  switch (currency) {
    case "USD":
      return `$${amount} / 月`
    case "CNY":
      return `¥${amount} / 月`
    default:
      return assertNever(currency)
  }
}

export function compactAmount(cents: number, currency: Currency): string {
  const amount = (Math.max(0, cents) / 100).toFixed(2)
  switch (currency) {
    case "USD":
      return `$${amount}`
    case "CNY":
      return `¥${amount}`
    default:
      return assertNever(currency)
  }
}

export function abbreviateName(name: string, max = 8): string {
  const trimmed = name.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max)}…`
}

export function compactDate(iso: string): string {
  const parts = iso.split("-")
  if (parts.length < 3) return iso
  return `${parts[1]}/${parts[2]}`
}

export function categorySummaries(
  items: Array<{ category: string }>
): Array<{ category: Category; count: number }> {
  const map = new Map<Category, number>()
  for (const item of items) {
    const key = isCategory(item.category) ? item.category : "other"
    map.set(key, (map.get(key) ?? 0) + 1)
  }
  return [...map.entries()].map(([category, count]) => ({ category, count }))
}
