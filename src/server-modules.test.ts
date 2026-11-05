import { ORPCError, call } from "@orpc/server"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { beforeEach, describe, expect, test } from "vitest"

import {
  account,
  schema,
  session,
  subscription,
  widgetLayout,
} from "@/db/schema"
import { createDb } from "@/db"
import { createAuth } from "@/lib/auth"
import { readSession } from "@/lib/session"
import { createORPCContext } from "@/orpc/context"
import { client, orpc } from "@/orpc/client"
import { isomorphicServerCall } from "../test/tanstack-start"
import { intervalFields, router } from "@/orpc/router"
import { CONTENT_SLOTS } from "@/lib/widget-slots"
import { setWorkerEnv, setWorkerEnvThrows } from "../test/cloudflare-workers"

const user = { id: "user-1", name: "Mun", email: "mun@techo.test" }

function row(overrides: Record<string, unknown> = {}) {
  const now = new Date("2026-11-01T00:00:00Z")
  return {
    id: "sub-1",
    userId: user.id,
    name: "Netflix",
    amountCents: 1599,
    currency: "USD",
    category: "streaming",
    notes: "家庭",
    type: "recurring",
    interval: "monthly",
    intervalDays: null,
    chargeDate: "2026-11-08",
    status: "active",
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function chain(result: unknown) {
  const promise = Promise.resolve(result)
  const self = {
    // oxlint-disable-next-line unicorn/no-thenable -- drizzle query chains are thenable
    then: (
      onFulfilled?: (value: unknown) => unknown,
      onRejected?: (reason: unknown) => unknown
    ) => promise.then(onFulfilled, onRejected),
    catch: (onRejected?: (reason: unknown) => unknown) =>
      promise.catch(onRejected),
    finally: (onFinally?: () => void) => promise.finally(onFinally),
  }
  const proxy: object = new Proxy(self, {
    get(target, prop) {
      if (prop in target) return target[prop as keyof typeof target]
      return () => proxy
    },
  })
  return proxy
}

function dbOf(results: unknown[]) {
  const queue = [...results]
  const next = () => chain(queue.shift() ?? [])
  return {
    select: () => next(),
    insert: () => next(),
    update: () => next(),
    delete: () => next(),
  }
}

function headersOf(cookies: string[]) {
  return { getSetCookie: () => cookies }
}

function authOf(session: unknown, cookies: string[] = []) {
  return {
    api: {
      getSession: async () => ({
        headers: headersOf(cookies),
        response: session,
      }),
    },
    handler: async (request: Request) =>
      new Response(request.method, { status: 200 }),
  }
}

function contextFor(
  db: ReturnType<typeof dbOf>,
  auth: ReturnType<typeof authOf>,
  extras: { reqHeaders?: Headers; resHeaders?: Headers } = {}
) {
  return {
    db,
    auth,
    reqHeaders: extras.reqHeaders,
    resHeaders: extras.resHeaders,
  } as never
}

const baseInput = {
  name: "  Netflix  ",
  amount: 15.99,
  currency: "USD" as const,
  category: "streaming" as const,
  notes: "  家庭  ",
  type: "recurring" as const,
  interval: "monthly" as const,
  intervalDays: null,
  chargeDate: "2026-11-08",
  status: "active" as const,
}

beforeEach(() => {
  setWorkerEnvThrows(false)
  setWorkerEnv({
    DB: {},
    BETTER_AUTH_URL: "https://techo.test",
    BETTER_AUTH_SECRET: "secret-secret-secret-secret",
    GITHUB_CLIENT_ID: "id",
    GITHUB_CLIENT_SECRET: "sec",
    TECHO_PREVIEW: "0",
  })
})

describe("worker modules", () => {
  test("schema, db, and auth construct", () => {
    expect(schema.subscription).toBeTruthy()
    expect(schema.user).toBeTruthy()
    expect(schema.session).toBeTruthy()
    expect(schema.account).toBeTruthy()
    expect(schema.verification).toBeTruthy()
    expect(schema.widgetLayout).toBe(widgetLayout)
    for (const table of [session, account, subscription, widgetLayout]) {
      for (const key of getTableConfig(table).foreignKeys) {
        expect(key.reference().foreignColumns.length).toBeGreaterThan(0)
      }
    }
    const db = createDb()
    expect(db).toBeTruthy()
    const auth = createAuth()
    expect(auth).toBeTruthy()
    expect(createORPCContext().db).toBeTruthy()
  })

  test("readSession honors preview, failure, and a live auth lookup", async () => {
    setWorkerEnv({ TECHO_PREVIEW: "1" })
    await expect(readSession()).resolves.toBeNull()
    setWorkerEnvThrows(true)
    await expect(readSession()).rejects.toThrow(/unavailable/)
    setWorkerEnvThrows(false)
    setWorkerEnv({
      DB: {},
      BETTER_AUTH_URL: "https://techo.test",
      BETTER_AUTH_SECRET: "secret-secret-secret-secret",
      GITHUB_CLIENT_ID: "id",
      GITHUB_CLIENT_SECRET: "sec",
      TECHO_PREVIEW: "0",
    })
    await expect(readSession()).resolves.toBeDefined()
  })

  test("orpc client is constructed", () => {
    expect(client).toBeTruthy()
    expect(orpc.subscriptions).toBeTruthy()
    expect(isomorphicServerCall.url?.pathname).toBe("/api/rpc")
    expect(isomorphicServerCall.headers?.get("cookie")).toContain("session=1")
  })
})

describe("interval fields", () => {
  test("keeps a recurring interval and custom days, otherwise null", () => {
    expect(
      intervalFields({
        type: "recurring",
        interval: "monthly",
        intervalDays: 4,
      })
    ).toEqual({ interval: "monthly", intervalDays: null })
    expect(
      intervalFields({ type: "recurring", interval: null, intervalDays: null })
    ).toEqual({ interval: null, intervalDays: null })
    expect(intervalFields({ type: "recurring" })).toEqual({
      interval: null,
      intervalDays: null,
    })
    expect(
      intervalFields({ type: "one_time", interval: "yearly", intervalDays: 9 })
    ).toEqual({ interval: null, intervalDays: null })
    expect(
      intervalFields({
        type: "recurring",
        interval: "custom",
        intervalDays: 12,
      })
    ).toEqual({ interval: "custom", intervalDays: 12 })
    expect(
      intervalFields({
        type: "recurring",
        interval: "custom",
        intervalDays: null,
      })
    ).toEqual({ interval: "custom", intervalDays: null })
  })
})

describe("subscription router", () => {
  test("health and unauthorized me", async () => {
    const context = contextFor(dbOf([]), authOf(null))
    await expect(call(router.health, undefined, { context })).resolves.toEqual({
      ok: true,
    })
    await expect(
      call(router.me, undefined, { context })
    ).rejects.toBeInstanceOf(ORPCError)
  })

  test("me copies session cookies onto the response", async () => {
    const resHeaders = new Headers()
    const context = contextFor(dbOf([]), authOf({ user }, ["a=b", "c=d"]), {
      resHeaders,
    })
    await expect(call(router.me, undefined, { context })).resolves.toEqual(user)
    expect(resHeaders.getSetCookie()).toEqual(["a=b", "c=d"])
    const bare = contextFor(dbOf([]), authOf({ user }, []), {
      reqHeaders: new Headers({ cookie: "x=y" }),
    })
    await expect(
      call(router.me, undefined, { context: bare })
    ).resolves.toEqual(user)
  })

  test("list maps rows", async () => {
    const context = contextFor(dbOf([[row()]]), authOf({ user }, []))
    const listed = await call(router.subscriptions.list, undefined, { context })
    expect(listed[0]?.name).toBe("Netflix")
    expect(listed[0]?.createdAt).toBe("2026-11-01T00:00:00.000Z")
  })

  test("create validates, stores, and rejects an empty insert", async () => {
    const context = contextFor(dbOf([[row()]]), authOf({ user }))
    const created = await call(router.subscriptions.create, baseInput, {
      context,
    })
    expect(created.name).toBe("Netflix")

    await expect(
      call(
        router.subscriptions.create,
        { ...baseInput, notes: null, type: "one_time", interval: null },
        {
          context: contextFor(
            dbOf([[row({ type: "one_time", interval: null })]]),
            authOf({ user })
          ),
        }
      )
    ).resolves.toMatchObject({ type: "one_time" })

    await expect(
      call(
        router.subscriptions.create,
        {
          ...baseInput,
          notes: undefined,
          interval: "custom",
          intervalDays: 10,
        },
        {
          context: contextFor(
            dbOf([[row({ interval: "custom", intervalDays: 10 })]]),
            authOf({ user })
          ),
        }
      )
    ).resolves.toMatchObject({ interval: "custom" })

    await expect(
      call(router.subscriptions.create, baseInput, {
        context: contextFor(dbOf([[]]), authOf({ user })),
      })
    ).rejects.toBeInstanceOf(ORPCError)

    await expect(
      call(
        router.subscriptions.create,
        { ...baseInput, type: "recurring", interval: null },
        { context: contextFor(dbOf([]), authOf({ user })) }
      )
    ).rejects.toThrow()

    await expect(
      call(
        router.subscriptions.create,
        { ...baseInput, interval: "custom", intervalDays: null },
        { context: contextFor(dbOf([]), authOf({ user })) }
      )
    ).rejects.toThrow()

    await expect(
      call(
        router.subscriptions.create,
        { ...baseInput, chargeDate: "11/08" },
        { context: contextFor(dbOf([]), authOf({ user })) }
      )
    ).rejects.toThrow()
  })

  test("update and remove", async () => {
    const owned = contextFor(
      dbOf([[row()], [row({ name: "编辑" })]]),
      authOf({ user })
    )
    const updated = await call(
      router.subscriptions.update,
      { ...baseInput, id: "sub-1", notes: null, name: "编辑" },
      { context: owned }
    )
    expect(updated.name).toBe("编辑")

    await expect(
      call(
        router.subscriptions.update,
        { ...baseInput, id: "missing", type: "one_time", interval: "yearly" },
        { context: contextFor(dbOf([[]]), authOf({ user })) }
      )
    ).rejects.toBeInstanceOf(ORPCError)

    await expect(
      call(
        router.subscriptions.update,
        { ...baseInput, id: "sub-1" },
        { context: contextFor(dbOf([[row()], []]), authOf({ user })) }
      )
    ).rejects.toBeInstanceOf(ORPCError)

    await expect(
      call(
        router.subscriptions.update,
        {
          ...baseInput,
          id: "sub-1",
          interval: "custom",
          intervalDays: 14,
        },
        {
          context: contextFor(
            dbOf([[row()], [row({ interval: "custom", intervalDays: 14 })]]),
            authOf({ user })
          ),
        }
      )
    ).resolves.toMatchObject({ interval: "custom" })

    await expect(
      call(
        router.subscriptions.update,
        {
          ...baseInput,
          id: "sub-1",
          type: "one_time",
          interval: "yearly",
          intervalDays: 3,
        },
        {
          context: contextFor(
            dbOf([[row()], [row({ type: "one_time", interval: null })]]),
            authOf({ user })
          ),
        }
      )
    ).resolves.toMatchObject({ type: "one_time" })

    await expect(
      call(
        router.subscriptions.remove,
        { id: "sub-1" },
        {
          context: contextFor(dbOf([[row()]]), authOf({ user })),
        }
      )
    ).resolves.toEqual({ ok: true })

    await expect(
      call(
        router.subscriptions.remove,
        { id: "missing" },
        {
          context: contextFor(dbOf([[]]), authOf({ user })),
        }
      )
    ).rejects.toBeInstanceOf(ORPCError)
  })

  test("seed demo inserts or refuses", async () => {
    const skipped = await call(router.subscriptions.seedDemo, undefined, {
      context: contextFor(dbOf([[{ id: "already" }]]), authOf({ user })),
    })
    expect(skipped).toEqual({ seeded: false, reason: "already-has-data" })

    const seeded = await call(router.subscriptions.seedDemo, undefined, {
      context: contextFor(
        dbOf([[], [row(), row({ id: "sub-2" })]]),
        authOf({ user })
      ),
    })
    expect(seeded.seeded).toBe(true)
    if (seeded.seeded) expect(seeded.items.length).toBe(2)
  })
})

describe("widget layouts", () => {
  test("lists saved slots and drops sticker defaults", async () => {
    await expect(
      call(router.widgetLayouts.list, undefined, {
        context: contextFor(dbOf([]), authOf(null)),
      })
    ).rejects.toBeInstanceOf(ORPCError)
    await expect(
      call(router.widgetLayouts.list, undefined, {
        context: contextFor(dbOf([[]]), authOf({ user })),
      })
    ).resolves.toEqual([])
    const listed = await call(router.widgetLayouts.list, undefined, {
      context: contextFor(
        dbOf([
          [
            {
              widgetId: "compose",
              x: CONTENT_SLOTS.compose.x,
              y: CONTENT_SLOTS.compose.y,
            },
            { widgetId: "subs", x: 100, y: 140 },
          ],
        ]),
        authOf({ user })
      ),
    })
    expect(listed).toEqual([{ widgetId: "subs", x: 100, y: 140 }])
  })

  test("upserts a drag and deletes a return to the sticker home", async () => {
    await expect(
      call(
        router.widgetLayouts.save,
        { widgetId: "github" as "compose", x: 1, y: 2 },
        { context: contextFor(dbOf([]), authOf({ user })) }
      )
    ).rejects.toThrow()
    await expect(
      call(
        router.widgetLayouts.save,
        { widgetId: "compose", x: 12, y: 20 },
        { context: contextFor(dbOf([]), authOf(null)) }
      )
    ).rejects.toBeInstanceOf(ORPCError)
    const cleared = await call(
      router.widgetLayouts.save,
      {
        widgetId: "compose",
        x: CONTENT_SLOTS.compose.x,
        y: CONTENT_SLOTS.compose.y,
      },
      { context: contextFor(dbOf([[]]), authOf({ user })) }
    )
    expect(cleared).toEqual({
      stored: false,
      widgetId: "compose",
      x: CONTENT_SLOTS.compose.x,
      y: CONTENT_SLOTS.compose.y,
    })
    const saved = await call(
      router.widgetLayouts.save,
      { widgetId: "charges", x: 500, y: 220 },
      {
        context: contextFor(
          dbOf([[{ widgetId: "charges" }]]),
          authOf({ user })
        ),
      }
    )
    expect(saved).toEqual({
      stored: true,
      widgetId: "charges",
      x: 500,
      y: 220,
    })
    await expect(
      call(
        router.widgetLayouts.save,
        { widgetId: "subs", x: 8, y: 9 },
        { context: contextFor(dbOf([[]]), authOf({ user })) }
      )
    ).rejects.toBeInstanceOf(ORPCError)
  })
})
