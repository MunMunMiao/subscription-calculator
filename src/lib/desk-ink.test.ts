/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"

import {
  EMPTY_INK,
  abbreviateName,
  categorySummaries,
  compactAmount,
  compactDate,
  formatMonthlyBanner,
} from "./desk-ink"

describe("desk idle ink", () => {
  test("top bar is monthly total only", () => {
    expect(formatMonthlyBanner(2699, "USD")).toBe("$26.99 / 月")
    expect(formatMonthlyBanner(0, "USD")).toBe("$0.00 / 月")
    expect(formatMonthlyBanner(2100, "CNY")).toBe("¥21.00 / 月")
    expect(formatMonthlyBanner(2699, "USD")).not.toContain("iCloud")
    expect(formatMonthlyBanner(1200, "USD")).not.toContain("年")
  })

  test("empty copy is explicit", () => {
    expect(EMPTY_INK.category).toBe("暂无分类")
    expect(EMPTY_INK.subs).toBe("暂无订阅")
    expect(EMPTY_INK.charges).toBe("暂无扣费")
    expect(EMPTY_INK.compose).toBe("记一笔")
  })

  test("names abbreviate without going blank", () => {
    expect(abbreviateName("Netflix")).toBe("Netflix")
    expect(abbreviateName("GitHub Copilot")).toBe("GitHub C…")
  })

  test("category summaries count chips from items", () => {
    expect(categorySummaries([])).toEqual([])
    expect(
      categorySummaries([
        { category: "streaming" },
        { category: "streaming" },
        { category: "cloud" },
      ])
    ).toEqual([
      { category: "streaming", count: 2 },
      { category: "cloud", count: 1 },
    ])
  })

  test("charge idle ink is date or amount", () => {
    expect(compactDate("2026-11-07")).toBe("11/07")
    expect(compactAmount(1599, "USD")).toBe("$15.99")
  })
})
