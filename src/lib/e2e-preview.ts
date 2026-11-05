import { demoSubscriptions } from "@/lib/demo-data"
import { toISODate } from "@/lib/spend"
import type { SpendItem } from "@/lib/spend"

export const E2E_PREVIEW_USER = {
  name: "MunMunMiao",
  email: "e2e@local",
} as const

export function allowE2ePreview() {
  const env = import.meta.env as { DEV?: boolean; VITE_TECHO_E2E?: string }
  return env.DEV === true || env.VITE_TECHO_E2E === "1"
}

export function e2ePreviewUser(e2e: string | undefined) {
  if (!allowE2ePreview()) return null
  if (e2e !== "browse" && e2e !== "desk") return null
  return {
    name: E2E_PREVIEW_USER.name,
    email: E2E_PREVIEW_USER.email,
  }
}

export function isE2ePreviewUser(user: { email?: string } | null | undefined) {
  return allowE2ePreview() && user?.email === E2E_PREVIEW_USER.email
}

export function e2ePreviewItems(now: Date): SpendItem[] {
  return demoSubscriptions.map((item, index) => {
    const date = new Date(
      Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate() + item.chargeDateOffsetDays
      )
    )
    return {
      id: `e2e-${index}`,
      name: item.name,
      amountCents: item.amountCents,
      currency: item.currency,
      category: item.category,
      type: item.type,
      interval: item.interval,
      intervalDays: item.intervalDays,
      chargeDate: toISODate(date),
      status: item.status,
    }
  })
}
