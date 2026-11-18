import { afterEach, describe, expect, test, vi } from "vitest"

import {
  CONTENT_SLOTS,
  PREVIEW_LAYOUT_KEY,
  isStickerDefault,
  placedSlots,
  readPreviewLayouts,
  writePreviewLayout,
} from "@/lib/widget-slots"

afterEach(() => {
  localStorage.removeItem(PREVIEW_LAYOUT_KEY)
  vi.restoreAllMocks()
})

describe("widget slots", () => {
  test("defaults are not saved rows, and overrides win", () => {
    expect(isStickerDefault("compose", { ...CONTENT_SLOTS.compose })).toBe(true)
    expect(
      isStickerDefault("compose", {
        x: CONTENT_SLOTS.compose.x + 0.4,
        y: CONTENT_SLOTS.compose.y,
      })
    ).toBe(true)
    expect(
      isStickerDefault("compose", {
        x: CONTENT_SLOTS.compose.x + 0.5,
        y: CONTENT_SLOTS.compose.y,
      })
    ).toBe(false)
    expect(
      isStickerDefault("subs", {
        x: CONTENT_SLOTS.subs.x,
        y: CONTENT_SLOTS.subs.y + 4,
      })
    ).toBe(false)
    expect(
      placedSlots([
        { widgetId: "github", x: 1, y: 2 },
        { widgetId: "compose", x: Number.NaN, y: 3 },
        {
          widgetId: "category",
          x: CONTENT_SLOTS.category.x,
          y: CONTENT_SLOTS.category.y,
        },
        { widgetId: "subs", x: 100, y: 120 },
      ])
    ).toEqual({
      ...CONTENT_SLOTS,
      subs: { x: 100, y: 120 },
    })
    expect(placedSlots([], { charges: { x: 400, y: 500 } }).charges).toEqual({
      x: 400,
      y: 500,
    })
  })

  test("preview storage round-trips only real content drags", () => {
    expect(readPreviewLayouts()).toEqual({})
    localStorage.setItem(PREVIEW_LAYOUT_KEY, "{")
    expect(readPreviewLayouts()).toEqual({})
    localStorage.setItem(PREVIEW_LAYOUT_KEY, "null")
    expect(readPreviewLayouts()).toEqual({})
    localStorage.setItem(PREVIEW_LAYOUT_KEY, "[]")
    expect(readPreviewLayouts()).toEqual({})
    localStorage.setItem(PREVIEW_LAYOUT_KEY, "1")
    expect(readPreviewLayouts()).toEqual({})
    localStorage.setItem(
      PREVIEW_LAYOUT_KEY,
      JSON.stringify({
        github: { x: 1, y: 2 },
        compose: null,
        subs: { x: "no", y: 1 },
        category: { ...CONTENT_SLOTS.category },
        charges: { x: 420, y: 240 },
      })
    )
    expect(readPreviewLayouts()).toEqual({ charges: { x: 420, y: 240 } })
    writePreviewLayout("subs", { x: 80, y: 90 })
    expect(readPreviewLayouts()).toEqual({
      charges: { x: 420, y: 240 },
      subs: { x: 80, y: 90 },
    })
    expect(localStorage.getItem(PREVIEW_LAYOUT_KEY)).not.toContain("github")
    writePreviewLayout("subs", null)
    writePreviewLayout("charges", { ...CONTENT_SLOTS.charges })
    expect(readPreviewLayouts()).toEqual({})
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(readPreviewLayouts()).toEqual({})
    vi.restoreAllMocks()
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked")
    })
    expect(writePreviewLayout("compose", { x: 10, y: 12 })).toEqual({
      compose: { x: 10, y: 12 },
    })
  })
})
