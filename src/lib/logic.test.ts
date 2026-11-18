import { describe, expect, test } from "vitest"

import { categoryLabel, isCategory } from "./catalog"
import {
  previewFlags,
  allowE2ePreview,
  e2ePreviewItems,
  e2ePreviewUser,
  isE2ePreviewUser,
} from "./e2e-preview"
import { centsToAmount, formatMoney, parseAmountToCents } from "./money"
import {
  addInterval,
  addUtcMonths,
  categoryBreakdown,
  monthlyRecurringCents,
  nextChargeOnOrAfter,
  parseISODate,
  sixMonthForecast,
  startOfUtcMonth,
  startOfUtcYear,
  toISODate,
  totalsByCurrency,
  upcomingCharges,
  usedCurrencies,
  yearlyRecurringCents,
  type SpendItem,
} from "./spend"
import type { Interval } from "./catalog"
import { demoSubscriptions } from "./demo-data"
import { cn } from "./utils"
import { getRouter } from "@/router"

function item(overrides: Partial<SpendItem> = {}): SpendItem {
  return {
    id: "1",
    name: "Netflix",
    amountCents: 1200,
    currency: "USD",
    category: "streaming",
    type: "recurring",
    interval: "monthly",
    intervalDays: null,
    chargeDate: "2026-11-05",
    status: "active",
    ...overrides,
  }
}

describe("catalog and money", () => {
  test("categories and money formatting", () => {
    expect(isCategory("streaming")).toBe(true)
    expect(isCategory("nope")).toBe(false)
    expect(categoryLabel("cloud")).toBe("云服务")
    expect(categoryLabel("自定义")).toBe("自定义")
    expect(parseAmountToCents("15.995")).toBe(1600)
    expect(parseAmountToCents(0)).toBe(0)
    expect(() => parseAmountToCents("nope")).toThrow(/金额/)
    expect(() => parseAmountToCents(-1)).toThrow(/金额/)
    expect(() => parseAmountToCents(Number.POSITIVE_INFINITY)).toThrow(/金额/)
    expect(centsToAmount(1599)).toBe(15.99)
    expect(formatMoney(1599, "USD")).toContain("15.99")
    expect(formatMoney(2100, "CNY")).toContain("21")
    const Original = Intl.NumberFormat
    Intl.NumberFormat = function NumberFormat() {
      throw new Error("no intl")
    } as unknown as typeof Intl.NumberFormat
    try {
      expect(formatMoney(100, "USD")).toBe("USD 1.00")
    } finally {
      Intl.NumberFormat = Original
    }
    expect(cn("a", false, "b")).toContain("a")
    expect(demoSubscriptions.length).toBeGreaterThan(0)
    expect(getRouter().options.defaultPreload).toBe("intent")
  })
})

describe("e2e preview flags", () => {
  test("allows browse and desk only when the flag is on", () => {
    const saved = { ...previewFlags }
    try {
      previewFlags.dev = true
      previewFlags.e2e = false
      expect(allowE2ePreview()).toBe(true)
      expect(e2ePreviewUser("browse")?.email).toBe("e2e@local")
      expect(e2ePreviewUser("desk")?.name).toBe("MunMunMiao")
      expect(e2ePreviewUser("nope")).toBeNull()
      expect(e2ePreviewUser(undefined)).toBeNull()
      expect(isE2ePreviewUser({ email: "e2e@local" })).toBe(true)
      expect(isE2ePreviewUser({ email: "other@local" })).toBe(false)
      expect(isE2ePreviewUser(null)).toBe(false)
      expect(isE2ePreviewUser(undefined)).toBe(false)
      const items = e2ePreviewItems(new Date("2026-11-05T00:00:00Z"))
      expect(items[0]?.id).toBe("e2e-0")
      expect(items[0]?.chargeDate).toMatch(/^\d{4}-\d{2}-\d{2}$/)

      previewFlags.dev = false
      previewFlags.e2e = true
      expect(allowE2ePreview()).toBe(true)
      previewFlags.e2e = false
      expect(allowE2ePreview()).toBe(false)
      expect(e2ePreviewUser("browse")).toBeNull()
      expect(isE2ePreviewUser({ email: "e2e@local" })).toBe(false)
    } finally {
      previewFlags.dev = saved.dev
      previewFlags.e2e = saved.e2e
    }
  })
})

describe("spend math", () => {
  const now = new Date("2026-11-05T12:00:00Z")

  test("dates and intervals", () => {
    expect(toISODate(parseISODate("2026-11-05"))).toBe("2026-11-05")
    expect(parseISODate("2026").getUTCMonth()).toBe(0)
    expect(startOfUtcMonth(now).toISOString()).toBe("2026-11-01T00:00:00.000Z")
    expect(startOfUtcYear(now).toISOString()).toBe("2026-01-01T00:00:00.000Z")
    expect(addUtcMonths(parseISODate("2026-11-05"), 1).toISOString()).toBe(
      "2026-12-05T00:00:00.000Z"
    )
    const start = parseISODate("2026-01-01")
    expect(toISODate(addInterval(start, "weekly", null))).toBe("2026-01-08")
    expect(toISODate(addInterval(start, "monthly", null))).toBe("2026-02-01")
    expect(toISODate(addInterval(start, "yearly", null))).toBe("2027-01-01")
    expect(toISODate(addInterval(start, "custom", 3))).toBe("2026-01-04")
    expect(toISODate(addInterval(start, "custom", 0))).toBe("2026-01-01")
    expect(toISODate(addInterval(start, "custom", null))).toBe("2026-01-01")
    expect(() => addInterval(start, "nope" as Interval, null)).toThrow(
      /Unhandled/
    )
  })

  test("monthly and yearly equivalents", () => {
    expect(monthlyRecurringCents(item({ status: "paused" }))).toBe(0)
    expect(
      monthlyRecurringCents(item({ type: "one_time", interval: null }))
    ).toBe(0)
    expect(monthlyRecurringCents(item({ interval: null }))).toBe(0)
    expect(monthlyRecurringCents(item())).toBe(1200)
    expect(
      monthlyRecurringCents(item({ interval: "yearly", amountCents: 1200 }))
    ).toBe(100)
    expect(
      monthlyRecurringCents(item({ interval: "weekly", amountCents: 300 }))
    ).toBe(Math.round((300 * 52) / 12))
    expect(
      monthlyRecurringCents(item({ interval: "custom", intervalDays: null }))
    ).toBe(0)
    expect(
      monthlyRecurringCents(item({ interval: "custom", intervalDays: 0 }))
    ).toBe(0)
    expect(
      monthlyRecurringCents(item({ interval: "custom", intervalDays: -2 }))
    ).toBe(0)
    expect(
      monthlyRecurringCents(item({ interval: "custom", intervalDays: 30 }))
    ).toBe(Math.round((1200 * 365.25) / 30 / 12))
    expect(() =>
      monthlyRecurringCents(item({ interval: "nope" as Interval }))
    ).toThrow(/Unhandled/)
    expect(yearlyRecurringCents(item())).toBe(1200 * 12)
  })

  test("next charge and upcoming windows", () => {
    expect(
      nextChargeOnOrAfter(
        item({ type: "one_time", interval: null, chargeDate: "2026-12-01" }),
        now
      )?.toISOString()
    ).toBe("2026-12-01T00:00:00.000Z")
    expect(
      nextChargeOnOrAfter(
        item({ type: "one_time", interval: null, chargeDate: "2026-01-01" }),
        now
      )
    ).toBeNull()
    expect(nextChargeOnOrAfter(item({ interval: null }), now)).toBeNull()
    expect(
      nextChargeOnOrAfter(
        item({ interval: "custom", intervalDays: 0, chargeDate: "2026-01-01" }),
        now
      )
    ).toBeNull()
    const future = nextChargeOnOrAfter(
      item({ interval: "weekly", chargeDate: "2020-01-01" }),
      now
    )
    expect(future && future >= now).toBe(true)

    const stalled = upcomingCharges(
      [
        item({
          id: "stall",
          interval: "custom",
          intervalDays: 0,
          chargeDate: "2026-11-06",
        }),
      ],
      now,
      30
    )
    expect(stalled).toHaveLength(1)

    const charges = upcomingCharges(
      [
        item({ id: "paused", status: "paused" }),
        item({ id: "blank", interval: null }),
        item({
          id: "once-in",
          type: "one_time",
          interval: null,
          chargeDate: "2026-12-01",
        }),
        item({
          id: "once-out",
          type: "one_time",
          interval: null,
          chargeDate: "2027-06-01",
        }),
        item({
          id: "once-past",
          type: "one_time",
          interval: null,
          chargeDate: "2026-01-01",
        }),
        item({ id: "week", interval: "weekly", chargeDate: "2026-11-01" }),
      ],
      now,
      40
    )
    expect(charges.map((charge) => charge.subscriptionId)).toContain("once-in")
    expect(charges.map((charge) => charge.subscriptionId)).not.toContain(
      "once-out"
    )
    expect(charges.map((charge) => charge.date).join(",")).toBe(
      charges
        .map((charge) => charge.date)
        .sort()
        .join(",")
    )

    const many = upcomingCharges(
      [item({ interval: "weekly", chargeDate: "2026-11-05" })],
      now,
      200 * 7
    )
    expect(many.length).toBeGreaterThan(50)
  })

  test("totals, categories, and forecast", () => {
    const rows = [
      item({ id: "usd", currency: "USD", amountCents: 1000 }),
      item({
        id: "usd-2",
        currency: "USD",
        interval: "yearly",
        amountCents: 1200,
      }),
      item({
        id: "cny-once",
        currency: "CNY",
        type: "one_time",
        interval: null,
        chargeDate: "2026-11-20",
        amountCents: 500,
        status: "active",
      }),
      item({
        id: "old-once",
        currency: "CNY",
        type: "one_time",
        interval: null,
        chargeDate: "2026-01-02",
        amountCents: 700,
        status: "active",
      }),
      item({
        id: "paused-once",
        currency: "USD",
        type: "one_time",
        interval: null,
        status: "cancelled",
        chargeDate: "2026-11-02",
      }),
      item({
        id: "other-year",
        currency: "USD",
        type: "one_time",
        interval: null,
        chargeDate: "2025-11-02",
        status: "active",
      }),
    ]
    const totals = totalsByCurrency(rows, now)
    const usd = totals.find((row) => row.currency === "USD")
    const cny = totals.find((row) => row.currency === "CNY")
    expect(usd?.monthlyRecurring).toBe(1000 + 100)
    expect(usd?.yearlyRecurring).toBe((1000 + 100) * 12)
    expect(cny?.oneTimeThisMonth).toBe(500)
    expect(cny?.oneTimeThisYear).toBe(500 + 700)
    expect(usd?.oneTimeThisMonth ?? 0).toBe(0)
    expect(usedCurrencies(rows)).toEqual(["USD", "CNY"])
    expect(usedCurrencies([])).toEqual([])

    const slices = categoryBreakdown(
      [
        item({ currency: "CNY" }),
        item({ category: "mystery" }),
        item({ id: "zero", status: "paused" }),
        item({
          id: "once-now",
          type: "one_time",
          interval: null,
          chargeDate: toISODate(new Date()),
          amountCents: 42,
        }),
        item({
          id: "once-old",
          type: "one_time",
          interval: null,
          chargeDate: "2020-01-01",
          amountCents: 42,
        }),
      ],
      "USD"
    )
    expect(slices.some((slice) => slice.category === "other")).toBe(true)
    expect(slices.some((slice) => slice.category === "streaming")).toBe(true)
    expect(slices.map((slice) => slice.amountCents)).toEqual(
      slices.map((slice) => slice.amountCents).sort((a, b) => b - a)
    )

    const forecast = sixMonthForecast(
      [
        item({
          type: "one_time",
          interval: null,
          chargeDate: "2026-11-10",
          amountCents: 300,
        }),
        item({
          id: "cny",
          currency: "CNY",
          type: "one_time",
          interval: null,
          chargeDate: "2026-11-10",
        }),
      ],
      "USD",
      now
    )
    expect(forecast).toHaveLength(6)
    expect(forecast[0]?.amountCents).toBeGreaterThan(0)
    expect(forecast.some((bucket) => bucket.amountCents === 0)).toBe(true)
  })
})
