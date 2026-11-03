import type { Category, Currency, Interval, Status, SubscriptionType } from "./catalog"
import { isCategory } from "./catalog"

export type SpendItem = {
  id: string
  name: string
  amountCents: number
  currency: Currency
  category: string
  type: SubscriptionType
  interval: Interval | null
  intervalDays: number | null
  chargeDate: string
  status: Status
}

export type UpcomingCharge = {
  id: string
  subscriptionId: string
  name: string
  amountCents: number
  currency: Currency
  category: string
  date: string
  type: SubscriptionType
}

export type CurrencyTotals = {
  currency: Currency
  monthlyRecurring: number
  yearlyRecurring: number
  oneTimeThisMonth: number
  oneTimeThisYear: number
}

export type CategorySlice = {
  category: string
  amountCents: number
}

function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`)
}

export function parseISODate(value: string): Date {
  const parts = value.split("-")
  const year = Number(parts[0])
  const month = Number(parts[1] || "1")
  const day = Number(parts[2] || "1")
  return new Date(Date.UTC(year, month - 1, day))
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10)
}

export function startOfUtcMonth(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1))
}

export function startOfUtcYear(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), 0, 1))
}

export function addUtcMonths(date: Date, months: number): Date {
  return new Date(
    Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + months, date.getUTCDate())
  )
}

export function addInterval(
  date: Date,
  interval: Interval,
  intervalDays: number | null
): Date {
  switch (interval) {
    case "weekly":
      return new Date(date.getTime() + 7 * 24 * 60 * 60 * 1000)
    case "monthly":
      return addUtcMonths(date, 1)
    case "yearly":
      return new Date(
        Date.UTC(
          date.getUTCFullYear() + 1,
          date.getUTCMonth(),
          date.getUTCDate()
        )
      )
    case "custom": {
      const days = intervalDays && intervalDays > 0 ? intervalDays : 0
      return new Date(date.getTime() + days * 24 * 60 * 60 * 1000)
    }
    default:
      return assertNever(interval)
  }
}

export function monthlyRecurringCents(item: SpendItem): number {
  if (item.status !== "active" || item.type !== "recurring" || !item.interval) {
    return 0
  }

  switch (item.interval) {
    case "monthly":
      return item.amountCents
    case "yearly":
      return Math.round(item.amountCents / 12)
    case "weekly":
      return Math.round((item.amountCents * 52) / 12)
    case "custom": {
      if (!item.intervalDays || item.intervalDays <= 0) return 0
      return Math.round((item.amountCents * 365.25) / item.intervalDays / 12)
    }
    default:
      return assertNever(item.interval)
  }
}

export function yearlyRecurringCents(item: SpendItem): number {
  return monthlyRecurringCents(item) * 12
}

function inSameUtcMonth(date: Date, now: Date): boolean {
  return (
    date.getUTCFullYear() === now.getUTCFullYear() &&
    date.getUTCMonth() === now.getUTCMonth()
  )
}

function inSameUtcYear(date: Date, now: Date): boolean {
  return date.getUTCFullYear() === now.getUTCFullYear()
}

export function nextChargeOnOrAfter(item: SpendItem, from: Date): Date | null {
  if (item.type === "one_time") {
    const charge = parseISODate(item.chargeDate)
    return charge >= from ? charge : null
  }

  if (!item.interval) return null

  let cursor = parseISODate(item.chargeDate)
  let guard = 0
  while (cursor < from && guard < 400) {
    const next = addInterval(cursor, item.interval, item.intervalDays)
    if (next.getTime() <= cursor.getTime()) return null
    cursor = next
    guard += 1
  }
  return cursor
}

export function upcomingCharges(
  items: SpendItem[],
  from: Date,
  days = 90
): UpcomingCharge[] {
  const until = new Date(from.getTime() + days * 24 * 60 * 60 * 1000)
  const charges: UpcomingCharge[] = []

  for (const item of items) {
    if (item.status !== "active") continue

    if (item.type === "one_time") {
      const date = parseISODate(item.chargeDate)
      if (date >= from && date <= until) {
        charges.push({
          id: `${item.id}:${toISODate(date)}`,
          subscriptionId: item.id,
          name: item.name,
          amountCents: item.amountCents,
          currency: item.currency,
          category: item.category,
          date: toISODate(date),
          type: item.type,
        })
      }
      continue
    }

    if (!item.interval) continue
    let cursor = nextChargeOnOrAfter(item, from)
    let guard = 0
    while (cursor && cursor <= until && guard < 200) {
      charges.push({
        id: `${item.id}:${toISODate(cursor)}`,
        subscriptionId: item.id,
        name: item.name,
        amountCents: item.amountCents,
        currency: item.currency,
        category: item.category,
        date: toISODate(cursor),
        type: item.type,
      })
      const next = addInterval(cursor, item.interval, item.intervalDays)
      if (next.getTime() <= cursor.getTime()) break
      cursor = next
      guard += 1
    }
  }

  return charges.sort((a, b) => a.date.localeCompare(b.date))
}

export function totalsByCurrency(
  items: SpendItem[],
  now = new Date()
): CurrencyTotals[] {
  const map = new Map<Currency, CurrencyTotals>()

  const ensure = (currency: Currency) => {
    const existing = map.get(currency)
    if (existing) return existing
    const created: CurrencyTotals = {
      currency,
      monthlyRecurring: 0,
      yearlyRecurring: 0,
      oneTimeThisMonth: 0,
      oneTimeThisYear: 0,
    }
    map.set(currency, created)
    return created
  }

  for (const item of items) {
    const bucket = ensure(item.currency)
    if (item.type === "recurring") {
      bucket.monthlyRecurring += monthlyRecurringCents(item)
      bucket.yearlyRecurring += yearlyRecurringCents(item)
      continue
    }

    if (item.status !== "active") continue
    const charge = parseISODate(item.chargeDate)
    if (inSameUtcMonth(charge, now)) {
      bucket.oneTimeThisMonth += item.amountCents
    }
    if (inSameUtcYear(charge, now)) {
      bucket.oneTimeThisYear += item.amountCents
    }
  }

  return [...map.values()]
}

export function categoryBreakdown(
  items: SpendItem[],
  currency: Currency
): CategorySlice[] {
  const map = new Map<string, number>()

  for (const item of items) {
    if (item.currency !== currency) continue
    const amount =
      item.type === "recurring"
        ? monthlyRecurringCents(item)
        : item.status === "active" &&
            inSameUtcMonth(parseISODate(item.chargeDate), new Date())
          ? item.amountCents
          : 0
    if (amount === 0) continue
    const key = isCategory(item.category) ? item.category : "other"
    map.set(key, (map.get(key) ?? 0) + amount)
  }

  return [...map.entries()]
    .map(([category, amountCents]) => ({ category, amountCents }))
    .sort((a, b) => b.amountCents - a.amountCents)
}

export function sixMonthForecast(
  items: SpendItem[],
  currency: Currency,
  from = new Date()
): Array<{ month: string; amountCents: number }> {
  const start = startOfUtcMonth(from)
  const end = addUtcMonths(start, 6)
  const buckets = Array.from({ length: 6 }, (_, index) => {
    const monthDate = addUtcMonths(start, index)
    return {
      month: `${monthDate.getUTCFullYear()}-${String(monthDate.getUTCMonth() + 1).padStart(2, "0")}`,
      amountCents: 0,
      start: monthDate,
      end: addUtcMonths(monthDate, 1),
    }
  })

  const charges = upcomingCharges(items, start, Math.ceil((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)))

  for (const charge of charges) {
    if (charge.currency !== currency) continue
    const date = parseISODate(charge.date)
    const bucket = buckets.find((item) => date >= item.start && date < item.end)
    if (bucket) bucket.amountCents += charge.amountCents
  }

  return buckets.map(({ month, amountCents }) => ({ month, amountCents }))
}

export function usedCurrencies(items: SpendItem[]): Currency[] {
  return [...new Set(items.map((item) => item.currency))]
}

export type { Category, Currency }
