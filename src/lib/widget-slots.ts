import {
  CONTENT_WIDGET_IDS,
  isContentWidgetId,
  type ContentWidgetId,
} from "@/lib/widget-machine"

/** Slot translate, the same space persisted after a drag. Not a seeded row. */
export const CONTENT_SLOTS = {
  category: { x: 216, y: 416 },
  subs: { x: 1040, y: 248 },
  charges: { x: 640, y: 608 },
  compose: { x: 320, y: 168 },
} as const satisfies Record<ContentWidgetId, { x: number; y: number }>

export type WidgetSlot = { x: number; y: number }

export const PREVIEW_LAYOUT_KEY = "techo-widget-layout"

const DEFAULT_EPSILON = 0.5

export function isStickerDefault(id: ContentWidgetId, slot: WidgetSlot) {
  const home = CONTENT_SLOTS[id]
  return (
    Math.abs(slot.x - home.x) < DEFAULT_EPSILON &&
    Math.abs(slot.y - home.y) < DEFAULT_EPSILON
  )
}

export function placedSlots(
  rows: ReadonlyArray<{ widgetId: string; x: number; y: number }>,
  overrides: Partial<Record<ContentWidgetId, WidgetSlot>> = {}
): Record<ContentWidgetId, WidgetSlot> {
  const next: Record<ContentWidgetId, WidgetSlot> = {
    category: { ...CONTENT_SLOTS.category },
    subs: { ...CONTENT_SLOTS.subs },
    charges: { ...CONTENT_SLOTS.charges },
    compose: { ...CONTENT_SLOTS.compose },
  }
  for (const row of rows) {
    if (!isContentWidgetId(row.widgetId)) continue
    if (!Number.isFinite(row.x) || !Number.isFinite(row.y)) continue
    if (isStickerDefault(row.widgetId, row)) continue
    next[row.widgetId] = { x: row.x, y: row.y }
  }
  for (const id of CONTENT_WIDGET_IDS) {
    const slot = overrides[id]
    if (!slot) continue
    next[id] = slot
  }
  return next
}

function slotFromUnknown(value: unknown): WidgetSlot | null {
  if (!value || typeof value !== "object") return null
  const record = value as { x?: unknown; y?: unknown }
  if (typeof record.x !== "number" || typeof record.y !== "number") return null
  return { x: record.x, y: record.y }
}

export function readPreviewLayouts(): Partial<
  Record<ContentWidgetId, WidgetSlot>
> {
  try {
    const raw = localStorage.getItem(PREVIEW_LAYOUT_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed))
      return {}
    const record = parsed as Record<string, unknown>
    const next: Partial<Record<ContentWidgetId, WidgetSlot>> = {}
    for (const id of CONTENT_WIDGET_IDS) {
      const slot = slotFromUnknown(record[id])
      if (!slot || isStickerDefault(id, slot)) continue
      next[id] = slot
    }
    return next
  } catch {
    return {}
  }
}

export function writePreviewLayout(
  id: ContentWidgetId,
  slot: WidgetSlot | null
): Partial<Record<ContentWidgetId, WidgetSlot>> {
  const next = readPreviewLayouts()
  if (!slot || isStickerDefault(id, slot)) delete next[id]
  else next[id] = slot
  try {
    localStorage.setItem(PREVIEW_LAYOUT_KEY, JSON.stringify(next))
  } catch {
    return next
  }
  return next
}
