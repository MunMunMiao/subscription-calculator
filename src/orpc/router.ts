import { ORPCError, os } from "@orpc/server"
import { and, desc, eq } from "drizzle-orm"
import { z } from "zod"

import { subscription, widgetLayout } from "@/db/schema"
import {
  CATEGORIES,
  CURRENCIES,
  INTERVALS,
  STATUSES,
  SUBSCRIPTION_TYPES,
} from "@/lib/catalog"
import { demoSubscriptions } from "@/lib/demo-data"
import { isStickerDefault } from "@/lib/widget-slots"
import { parseAmountToCents } from "@/lib/money"
import { toISODate } from "@/lib/spend"
import type { AuthSession } from "@/lib/auth"
import type { ORPCContext } from "./context"

const dateString = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "日期格式必须是 YYYY-MM-DD")

const subscriptionInput = z
  .object({
    name: z.string().trim().min(1).max(80),
    amount: z.number().finite().min(0),
    currency: z.enum(CURRENCIES).default("USD"),
    category: z.enum(CATEGORIES).default("other"),
    notes: z.string().trim().max(500).optional().nullable(),
    type: z.enum(SUBSCRIPTION_TYPES),
    interval: z.enum(INTERVALS).optional().nullable(),
    intervalDays: z.number().int().min(1).max(3650).optional().nullable(),
    chargeDate: dateString,
    status: z.enum(STATUSES).default("active"),
  })
  .superRefine((value, ctx) => {
    if (value.type === "recurring" && !value.interval) {
      ctx.addIssue({
        code: "custom",
        message: "周期性订阅需要选择计费周期",
        path: ["interval"],
      })
    }
    if (value.interval === "custom" && !value.intervalDays) {
      ctx.addIssue({
        code: "custom",
        message: "自定义周期需要填写天数",
        path: ["intervalDays"],
      })
    }
  })

const base = os.$context<ORPCContext>()

const requireSession = base.middleware(async ({ context, next }) => {
  const { headers, response: session } = await context.auth.api.getSession({
    headers: context.reqHeaders ?? new Headers(),
    returnHeaders: true,
  })

  for (const cookie of headers.getSetCookie()) {
    context.resHeaders?.append("set-cookie", cookie)
  }

  if (!session) {
    throw new ORPCError("UNAUTHORIZED")
  }

  return next({
    context: {
      session,
    },
  })
})

const authed = base.use(requireSession)

function mapSubscription(row: typeof subscription.$inferSelect) {
  return {
    id: row.id,
    name: row.name,
    amountCents: row.amountCents,
    currency: row.currency,
    category: row.category,
    notes: row.notes,
    type: row.type,
    interval: row.interval,
    intervalDays: row.intervalDays,
    chargeDate: row.chargeDate,
    status: row.status,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  }
}

export function intervalFields(input: {
  type: "recurring" | "one_time"
  interval?: "monthly" | "yearly" | "weekly" | "custom" | null
  intervalDays?: number | null
}) {
  return {
    interval: input.type === "recurring" ? (input.interval ?? null) : null,
    intervalDays:
      input.interval === "custom" ? (input.intervalDays ?? null) : null,
  }
}

function shiftDate(offsetDays: number): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() + offsetDays)
  return toISODate(date)
}

async function ensureOwned(
  db: ORPCContext["db"],
  session: AuthSession,
  id: string
) {
  const rows = await db
    .select()
    .from(subscription)
    .where(
      and(eq(subscription.id, id), eq(subscription.userId, session.user.id))
    )
    .limit(1)

  if (rows.length === 0) {
    throw new ORPCError("NOT_FOUND")
  }

  return rows[0]
}

export const router = {
  health: base.handler(() => ({ ok: true as const })),
  me: authed.handler(({ context }) => context.session.user),
  subscriptions: {
    list: authed.handler(async ({ context }) => {
      const rows = await context.db
        .select()
        .from(subscription)
        .where(eq(subscription.userId, context.session.user.id))
        .orderBy(desc(subscription.updatedAt))

      return rows.map(mapSubscription)
    }),
    create: authed
      .input(subscriptionInput)
      .handler(async ({ context, input }) => {
        const now = new Date()
        const created = await context.db
          .insert(subscription)
          .values({
            id: crypto.randomUUID(),
            userId: context.session.user.id,
            name: input.name,
            amountCents: parseAmountToCents(input.amount),
            currency: input.currency,
            category: input.category,
            notes: input.notes ?? null,
            type: input.type,
            ...intervalFields(input),
            chargeDate: input.chargeDate,
            status: input.status,
            createdAt: now,
            updatedAt: now,
          })
          .returning()

        if (created.length === 0) {
          throw new ORPCError("INTERNAL_SERVER_ERROR")
        }

        return mapSubscription(created[0])
      }),
    update: authed
      .input(subscriptionInput.extend({ id: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        await ensureOwned(context.db, context.session, input.id)
        const now = new Date()
        const updated = await context.db
          .update(subscription)
          .set({
            name: input.name,
            amountCents: parseAmountToCents(input.amount),
            currency: input.currency,
            category: input.category,
            notes: input.notes ?? null,
            type: input.type,
            ...intervalFields(input),
            chargeDate: input.chargeDate,
            status: input.status,
            updatedAt: now,
          })
          .where(
            and(
              eq(subscription.id, input.id),
              eq(subscription.userId, context.session.user.id)
            )
          )
          .returning()

        if (updated.length === 0) {
          throw new ORPCError("NOT_FOUND")
        }

        return mapSubscription(updated[0])
      }),
    remove: authed
      .input(z.object({ id: z.string().min(1) }))
      .handler(async ({ context, input }) => {
        await ensureOwned(context.db, context.session, input.id)
        await context.db
          .delete(subscription)
          .where(
            and(
              eq(subscription.id, input.id),
              eq(subscription.userId, context.session.user.id)
            )
          )
        return { ok: true as const }
      }),
    seedDemo: authed.handler(async ({ context }) => {
      const existing = await context.db
        .select({ id: subscription.id })
        .from(subscription)
        .where(eq(subscription.userId, context.session.user.id))
        .limit(1)

      if (existing.length > 0) {
        return { seeded: false as const, reason: "already-has-data" as const }
      }

      const now = new Date()
      const rows = await context.db
        .insert(subscription)
        .values(
          demoSubscriptions.map((item) => ({
            id: crypto.randomUUID(),
            userId: context.session.user.id,
            name: item.name,
            amountCents: item.amountCents,
            currency: item.currency,
            category: item.category,
            notes: item.notes,
            type: item.type,
            interval: item.interval,
            intervalDays: item.intervalDays,
            chargeDate: shiftDate(item.chargeDateOffsetDays),
            status: item.status,
            createdAt: now,
            updatedAt: now,
          }))
        )
        .returning()

      return {
        seeded: true as const,
        items: rows.map(mapSubscription),
      }
    }),
  },
  widgetLayouts: {
    list: authed.handler(async ({ context }) => {
      const rows = await context.db
        .select()
        .from(widgetLayout)
        .where(eq(widgetLayout.userId, context.session.user.id))

      return rows
        .filter((row) => !isStickerDefault(row.widgetId, row))
        .map((row) => ({
          widgetId: row.widgetId,
          x: row.x,
          y: row.y,
        }))
    }),
    save: authed
      .input(
        z.object({
          widgetId: z.enum(["category", "subs", "charges", "compose"]),
          x: z.number().finite(),
          y: z.number().finite(),
        })
      )
      .handler(async ({ context, input }) => {
        if (isStickerDefault(input.widgetId, input)) {
          await context.db
            .delete(widgetLayout)
            .where(
              and(
                eq(widgetLayout.userId, context.session.user.id),
                eq(widgetLayout.widgetId, input.widgetId)
              )
            )
          return {
            stored: false as const,
            widgetId: input.widgetId,
            x: input.x,
            y: input.y,
          }
        }

        const now = new Date()
        const saved = await context.db
          .insert(widgetLayout)
          .values({
            userId: context.session.user.id,
            widgetId: input.widgetId,
            x: input.x,
            y: input.y,
            updatedAt: now,
          })
          .onConflictDoUpdate({
            target: [widgetLayout.userId, widgetLayout.widgetId],
            set: { x: input.x, y: input.y, updatedAt: now },
          })
          .returning()

        if (saved.length === 0) {
          throw new ORPCError("INTERNAL_SERVER_ERROR")
        }

        return {
          stored: true as const,
          widgetId: input.widgetId,
          x: input.x,
          y: input.y,
        }
      }),
  },
}

export type AppRouter = typeof router
