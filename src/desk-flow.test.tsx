import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { afterEach, describe, expect, test, vi } from "vitest"
import { page, userEvent } from "vitest/browser"
import { render } from "vitest-browser-react"

import {
  DeskApp,
  readJustAuthed,
  recordToForm,
  requireItem,
} from "@/components/desk-app"
import { Toaster } from "@/components/ui/sonner"
import { DeskDialogMount, type DialogForm } from "@/components/desk-dialog"
import { renderAuthWidget } from "@/components/desk-widgets"
import type { AuthWidgetId, ContentWidgetId } from "@/lib/widget-machine"
import {
  JUST_AUTHED_KEY,
  SESSION_FACE,
  SESSION_SLOT,
  SHADOW,
  readTranslate,
  viewBoxPoint,
  visibleStageRect,
} from "@/lib/widget-motion"
import { gsap } from "@/lib/gsap"
import { e2ePreviewUser, previewFlags } from "@/lib/e2e-preview"
import { CONTENT_SLOTS, PREVIEW_LAYOUT_KEY } from "@/lib/widget-slots"
import "@/styles.css"

const gate = vi.hoisted(() => ({
  fail: false,
  delay: null as Promise<void> | null,
  subs: [] as Array<Record<string, unknown>>,
  layouts: [] as Array<{ widgetId: string; x: number; y: number }>,
  layoutSaves: [] as Array<{ widgetId: string; x: number; y: number }>,
}))

const auth = vi.hoisted(() => ({
  signIn: vi.fn(async () => ({})),
  signOut: vi.fn(() => new Promise<void>(() => {})),
}))

vi.mock("@/lib/auth-client", () => ({
  authClient: {
    signIn: { social: auth.signIn },
    signOut: auth.signOut,
  },
}))

vi.mock("@/orpc/client", () => ({
  orpc: {
    subscriptions: {
      key: () => ["subscriptions"],
      list: {
        queryOptions: () => ({
          queryKey: ["subscriptions", "list"],
          queryFn: async () => gate.subs,
        }),
      },
      create: {
        mutationOptions: (
          opts: {
            onSuccess?: () => Promise<void> | void
            onError?: (error: Error) => void
          } = {}
        ) => ({
          ...opts,
          mutationFn: async (input: unknown) => {
            if (gate.delay) await gate.delay
            if (gate.fail) throw new Error("boom")
            return { id: "server-id", ...(input as object) }
          },
        }),
      },
      update: {
        mutationOptions: (
          opts: {
            onSuccess?: () => Promise<void> | void
            onError?: (error: Error) => void
          } = {}
        ) => ({
          ...opts,
          mutationFn: async (input: unknown) => {
            if (gate.delay) await gate.delay
            if (gate.fail) throw new Error("boom")
            return { id: "server-id", ...(input as object) }
          },
        }),
      },
      remove: {
        mutationOptions: (
          opts: {
            onSuccess?: () => Promise<void> | void
            onError?: (error: Error) => void
          } = {}
        ) => ({
          ...opts,
          mutationFn: async () => {
            if (gate.delay) await gate.delay
            if (gate.fail) throw new Error("boom")
            return { ok: true }
          },
        }),
      },
    },
    widgetLayouts: {
      list: {
        queryOptions: () => ({
          queryKey: ["layouts"],
          queryFn: async () => gate.layouts,
        }),
      },
      save: {
        mutationOptions: () => ({
          mutationFn: async (input: {
            widgetId: string
            x: number
            y: number
          }) => {
            gate.layoutSaves.push(input)
            return { stored: true, ...input }
          },
        }),
      },
    },
  },
}))

function providers(user: { name: string; email: string } | null) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  return (
    <QueryClientProvider client={client}>
      <DeskApp user={user} />
      <Toaster />
    </QueryClientProvider>
  )
}

function control(node: unknown) {
  return node as HTMLElement
}

function css(selector: string) {
  const node = document.querySelector(selector)
  if (!node) throw new Error(`missing ${selector}`)
  return page.elementLocator(node)
}

function root() {
  const node = document.querySelector("[data-testid='desk-root']")
  if (!(node instanceof HTMLElement)) throw new Error("desk missing")
  return node
}

async function waitPhase(phase: string) {
  await expect
    .poll(() => root().dataset.phase, { timeout: 6000, interval: 16 })
    .toBe(phase)
}

function slotOf(id: string) {
  const node = document.getElementById(`widget-${id}-slot`)
  return readTranslate(node?.getAttribute("transform") ?? null)
}

function modelBox(id: string) {
  const slot = slotOf(id)
  const widget = document.getElementById(`widget-${id}`)
  if (!slot || !(widget instanceof SVGGraphicsElement)) return null
  const box = widget.getBBox()
  return {
    x: slot.x + box.x,
    y: slot.y + box.y,
    w: box.width,
    h: box.height,
  }
}

function insideVisible(id: string) {
  const stage = document.getElementById("stage")
  const box = modelBox(id)
  if (!(stage instanceof SVGSVGElement) || !box) return false
  const visible = visibleStageRect(stage)
  return (
    box.x >= visible.x - 1 &&
    box.y >= visible.y - 1 &&
    box.x + box.w <= visible.x + visible.w + 1 &&
    box.y + box.h <= visible.y + visible.h + 1
  )
}

function textLines(id: string) {
  return [...document.querySelectorAll(`#${id} text`)].map((node) =>
    (node.textContent ?? "").trim()
  )
}

function tweenStartX(selector: string) {
  const tween = gsap.getTweensOf(selector).at(-1)
  if (!tween?.parent) return 0
  const parent = tween.parent
  const time = parent.time()
  parent.pause()
  parent.time(tween.startTime())
  const x = Number(gsap.getProperty(selector, "x"))
  parent.time(time)
  parent.resume()
  return x
}

function pointer(
  type: string,
  target: EventTarget,
  x: number,
  y: number,
  pointerId = 1
) {
  target.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      clientX: x,
      clientY: y,
      pointerId,
    })
  )
}

async function dragWidget(id: string, dx: number, dy: number) {
  const node = document.getElementById(`widget-${id}`)
  if (!node) throw new Error(`missing widget-${id}`)
  const rect = node.getBoundingClientRect()
  const x = rect.left + Math.min(12, rect.width / 2)
  const y = rect.top + Math.min(12, rect.height / 2)
  pointer("pointerdown", node, x, y)
  pointer("pointermove", window, x + dx, y + dy)
  return { x, y }
}

function travel(selector: string) {
  const tween = gsap.getTweensOf(selector).at(-1)
  if (!tween?.parent) return 0
  const parent = tween.parent
  const time = parent.time()
  parent.pause()
  parent.time(tween.startTime())
  const distance = Math.max(
    Math.abs(Number(gsap.getProperty(selector, "x"))),
    Math.abs(Number(gsap.getProperty(selector, "y")))
  )
  parent.time(time)
  parent.resume()
  return distance
}

async function expectAuthFullyVisible() {
  await expect
    .poll(() => {
      const node = document.getElementById("widget-auth-github")
      const box = node?.getBoundingClientRect()
      const text = node?.querySelector("text")?.getBoundingClientRect()
      if (!box || !text || box.width < 20 || text.width < 8) return false
      const onScreen = [box, text].every(
        (rect) =>
          rect.left >= -0.5 &&
          rect.top >= -0.5 &&
          rect.right <= window.innerWidth + 0.5 &&
          rect.bottom <= window.innerHeight + 0.5
      )
      const labelInsideFace =
        text.left >= box.left - 0.5 &&
        text.top >= box.top - 0.5 &&
        text.right <= box.right + 0.5 &&
        text.bottom <= box.bottom + 0.5
      return onScreen && labelInsideFace
    })
    .toBe(true)
}

afterEach(async () => {
  await page.viewport(1280, 800)
  gsap.globalTimeline.clear()
  sessionStorage.removeItem(JUST_AUTHED_KEY)
  localStorage.removeItem(PREVIEW_LAYOUT_KEY)
  previewFlags.dev = Boolean(import.meta.env.DEV)
  previewFlags.e2e = import.meta.env.VITE_TECHO_E2E === "1"
  gate.fail = false
  gate.delay = null
  gate.subs = []
  gate.layouts = []
  gate.layoutSaves = []
  auth.signIn.mockClear()
  auth.signOut.mockClear()
})

describe("helpers", () => {
  test("session flag, record mapping, and missing items", () => {
    sessionStorage.removeItem(JUST_AUTHED_KEY)
    expect(readJustAuthed()).toBe(false)
    sessionStorage.setItem(JUST_AUTHED_KEY, "1")
    expect(readJustAuthed()).toBe(true)
    const spy = vi
      .spyOn(Storage.prototype, "getItem")
      .mockImplementation(() => {
        throw new Error("blocked")
      })
    expect(readJustAuthed()).toBe(false)
    spy.mockRestore()
    expect(requireItem([{ id: "a" }], "a").id).toBe("a")
    expect(() => requireItem([{ id: "a" }], "b")).toThrow(/missing/)
    expect(renderAuthWidget("nope" as AuthWidgetId, () => {})).toBe("nope")
    expect(
      recordToForm({
        id: "1",
        name: "域名",
        amountCents: 250,
        currency: "CNY",
        category: "not-real",
        notes: null,
        type: "one_time",
        interval: null,
        intervalDays: null,
        chargeDate: "2026-11-01",
        status: "paused",
      })
    ).toMatchObject({
      category: "other",
      notes: "",
      interval: "monthly",
      intervalDays: 30,
      amount: 2.5,
    })
    expect(
      recordToForm({
        id: "2",
        name: "Netflix",
        amountCents: 100,
        currency: "USD",
        category: "streaming",
        notes: "家庭",
        type: "recurring",
        interval: "yearly",
        intervalDays: 9,
        chargeDate: "2026-11-01",
        status: "active",
      }).interval
    ).toBe("yearly")
  })
})

describe("PM desk path", () => {
  test("login-only auth sits fully on the desk, then the machine runs", async () => {
    const loggedOut = await render(providers(null))
    await waitPhase("login-only")
    const stage = document.getElementById("stage")
    expect(stage?.getAttribute("viewBox")).toBe("0 0 1280 800")
    expect(stage?.getAttribute("preserveAspectRatio")).toBe("xMidYMid slice")
    expect(getComputedStyle(stage!).transform).toBe("none")
    expect(document.getElementById("login-control")).toBeNull()
    expect(document.getElementById("chrome-layer")).toBeNull()
    expect(document.getElementById("widget-login")).toBeNull()
    expect(document.body.textContent).not.toContain("更多登录")
    expect(
      document.getElementById("widget-auth-github")?.textContent
    ).toContain("GitHub 登录")
    expect(
      document
        .getElementById("widget-auth-github-slot")
        ?.getAttribute("transform")
    ).toBe("translate(530 368)")
    const authFace = document.querySelector("#widget-auth-github rect")
    expect(authFace?.getAttribute("width")).toBe("220")
    expect(authFace?.getAttribute("height")).toBe("64")
    expect(authFace?.classList.contains("ink-shadow")).toBe(true)
    expect(getComputedStyle(authFace!).filter).toContain("widgetShadowDesk")
    const deskDrop = document.querySelector("#widgetShadowDesk feDropShadow")
    expect(deskDrop?.getAttribute("flood-color")).toBe(SHADOW.ink)
    expect(Number(deskDrop?.getAttribute("dy"))).toBe(SHADOW.desk.dy)
    expect(Number(deskDrop?.getAttribute("stdDeviation"))).toBe(SHADOW.desk.std)
    expect(Number(deskDrop?.getAttribute("flood-opacity"))).toBe(
      SHADOW.desk.opacity
    )
    expect(deskDrop?.getAttribute("dx")).toBe("0")
    expect(document.getElementById("widget-session")).toBeNull()
    expect(document.getElementById("desk-ink-total")).toBeNull()
    expect(document.getElementById("btn-logout")).toBeNull()
    expect(textLines("widget-category")).not.toContain("分类")
    expect(textLines("widget-subs")).not.toContain("订阅")
    expect(textLines("widget-charges")).not.toContain("扣费")
    expect(
      textLines("widget-compose").filter((line) => line === "记一笔")
    ).toHaveLength(1)
    for (const id of [
      "widget-category",
      "widget-subs",
      "widget-charges",
      "widget-compose",
      "prop-cup",
      "prop-pen",
      "prop-plant",
    ]) {
      expect(getComputedStyle(document.getElementById(id)!).visibility).toBe(
        "hidden"
      )
    }

    await page.viewport(1600, 900)
    await expectAuthFullyVisible()
    await page.viewport(1024, 768)
    await expectAuthFullyVisible()
    await page.viewport(1000, 800)
    await expectAuthFullyVisible()

    const authHome = document
      .getElementById("widget-auth-github-slot")
      ?.getAttribute("transform")
    const authNode = document.getElementById("widget-auth-github")!
    const authRect = authNode.getBoundingClientRect()
    pointer("pointerdown", authNode, authRect.left + 8, authRect.top + 8)
    pointer("pointermove", window, authRect.left + 80, authRect.top + 20)
    pointer("pointerup", authNode, authRect.left + 80, authRect.top + 20)
    expect(
      document
        .getElementById("widget-auth-github-slot")
        ?.getAttribute("transform")
    ).toBe(authHome)
    expect(localStorage.getItem(PREVIEW_LAYOUT_KEY)).toBeNull()
    expect(gate.layoutSaves).toEqual([])
    const category = document.getElementById("widget-category")!
    pointer("pointerdown", category, 30, 30)
    pointer("pointermove", window, 90, 30)
    pointer("pointerup", category, 90, 30)
    expect(slotOf("category")).toEqual(CONTENT_SLOTS.category)
    expect(root().dataset.phase).toBe("login-only")

    await css("#widget-auth-github").click()
    expect(auth.signIn).toHaveBeenCalledWith({
      provider: "github",
      callbackURL: "/",
    })
    expect(root().dataset.phase).toBe("login-only")
    expect(sessionStorage.getItem(JUST_AUTHED_KEY)).toBe("1")
    await loggedOut.unmount()

    const entered = await render(providers(e2ePreviewUser("browse")))
    expect(root().dataset.from).toBe("login")
    await expect
      .poll(() => gsap.getTweensOf("#widget-category").length, {
        timeout: 2000,
        interval: 10,
      })
      .toBeGreaterThan(0)
    expect(travel("#widget-category")).toBeGreaterThanOrEqual(420)
    expect(travel("#widget-auth-github")).toBeGreaterThanOrEqual(420)
    expect(travel("#widget-session")).toBeGreaterThanOrEqual(420)
    expect(tweenStartX("#widget-session")).toBeLessThanOrEqual(-420)
    expect(getComputedStyle(document.getElementById("stage")!).transform).toBe(
      "none"
    )
    await waitPhase("desk")
    expect(document.getElementById("stage")?.getAttribute("viewBox")).toBe(
      "0 0 1280 800"
    )
    expect(document.getElementById("desk-ink-total")).toBeNull()
    expect(document.getElementById("btn-logout")).toBeNull()
    expect(document.getElementById("subs-monthly")?.textContent).toMatch(
      /[$¥]\d+\.\d{2} \/ 月/
    )
    expect(document.getElementById("subs-monthly")?.textContent).not.toMatch(
      /iCloud|年/
    )
    expect(
      textLines("widget-subs").filter((line) => line.includes("/ 月"))
    ).toHaveLength(1)
    expect(
      textLines("widget-charges").some((line) => line.includes("/ 月"))
    ).toBe(false)
    expect(textLines("widget-category")).not.toContain("分类")
    expect(textLines("widget-subs")).not.toContain("订阅")
    expect(textLines("widget-charges")).not.toContain("扣费")
    expect(
      textLines("widget-compose").filter((line) => line === "记一笔")
    ).toHaveLength(1)
    expect(document.getElementById("widget-category")?.textContent).toMatch(
      /流媒体|软件|云服务/
    )
    expect(document.getElementById("widget-subs")?.textContent).toMatch(
      /Netflix|GitHub/
    )
    expect(document.getElementById("widget-charges")?.textContent).toMatch(
      /\d{2}\/\d{2}/
    )
    expect(document.getElementById("widget-compose")?.textContent).toContain(
      "记一笔"
    )
    for (const id of [
      "widget-category",
      "widget-subs",
      "widget-charges",
      "widget-compose",
    ]) {
      expect(document.querySelector(`#${id} foreignObject`)).toBeNull()
    }
    const cup = document.getElementById("prop-cup")
    const layer = document.getElementById("widget-layer")
    expect(
      cup &&
        layer &&
        Boolean(
          cup.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING
        )
    ).toBe(true)
    expect(
      document.getElementById("prop-pen-slot")?.getAttribute("transform")
    ).toMatch(/translate\(\s*134\s+94\s*\)/)

    await css("#widget-compose").click()
    await waitPhase("expanded")
    expect(root().dataset.expanded).toBe("compose")
    await expect
      .poll(() => gsap.getTweensOf("#desk-dialog").length)
      .toBeGreaterThan(0)
    const dialogTween = gsap.getTweensOf("#desk-dialog")[0]
    expect(dialogTween?.duration()).toBeCloseTo(0.42)
    expect(dialogTween?.vars.ease).toBe("power2.out")
    expect(dialogTween?.vars.scale).toBe(1)
    expect(dialogTween?.vars.y).toBe(0)
    const dim = gsap
      .getTweensOf("#widget-compose")
      .find((tween) => tween.vars.opacity === 0.4)
    expect(dim?.duration()).toBeCloseTo(0.28)
    expect(dim?.vars.ease).toBe("power2.out")
    expect(dim?.vars.x).toBeUndefined()
    expect(dim?.vars.y).toBeUndefined()
    expect(document.querySelector("#widget-compose foreignObject")).toBeNull()
    expect(document.querySelector("#widget-compose form")).toBeNull()
    expect(document.getElementById("widget-compose")?.textContent).toContain(
      "记一笔"
    )
    const dialog = document.getElementById("desk-dialog")
    expect(dialog?.querySelector("form")).toBeTruthy()
    expect(document.getElementById("widget-compose")?.contains(dialog!)).toBe(
      false
    )
    expect(getComputedStyle(document.getElementById("stage")!).transform).toBe(
      "none"
    )

    await css("#dialog-close").click()
    await waitPhase("desk")
    await expect.poll(() => document.getElementById("compose-form")).toBeNull()
    expect(root().dataset.expanded).toBe("")

    await css("#widget-category").click()
    await waitPhase("expanded")
    document
      .getElementById("desk-hit")
      ?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
    await waitPhase("desk")

    await css("#widget-subs").click()
    await waitPhase("expanded")
    expect(document.querySelector("#widget-subs foreignObject")).toBeNull()
    expect(document.getElementById("desk-dialog")?.textContent).toContain(
      "Netflix"
    )
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false)
    await page.getByRole("button", { name: "删除" }).first().click()
    expect(document.getElementById("desk-dialog")?.textContent).toContain(
      "Netflix"
    )
    confirm.mockReturnValue(true)
    await page.getByRole("button", { name: "编辑" }).first().click()
    await expect.poll(() => root().dataset.expanded).toBe("compose")
    const name = document.querySelector(
      "#compose-form input"
    ) as HTMLInputElement
    expect(name.value.length).toBeGreaterThan(0)
    await css("#dialog-close").click()
    await waitPhase("desk")

    await css("#widget-charges").click()
    await waitPhase("expanded")
    expect(document.querySelector("#widget-charges foreignObject")).toBeNull()
    expect(document.getElementById("desk-dialog")?.textContent).toMatch(
      /\d{2}\/\d{2}/
    )
    await css("#dialog-close").click()
    await waitPhase("desk")

    await css("#widget-compose").click()
    document
      .getElementById("widget-compose")
      ?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
    await waitPhase("desk")

    document
      .getElementById("widget-category")
      ?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
    await css("#widget-subs").click()
    await expect.poll(() => root().dataset.expanded).toBe("subs")
    await css("#widget-session").click()
    await waitPhase("exit")
    await expect
      .poll(() => gsap.getTweensOf("#widget-category").length, {
        timeout: 2000,
      })
      .toBeGreaterThan(0)
    expect(travel("#widget-category")).toBeGreaterThanOrEqual(420)
    expect(travel("#widget-auth-github")).toBeGreaterThanOrEqual(420)
    expect(
      gsap
        .getTweensOf("#widget-session")
        .some((tween) => Number(tween.vars.x) <= -420)
    ).toBe(true)
    expect(getComputedStyle(document.getElementById("stage")!).transform).toBe(
      "none"
    )
    await expect
      .poll(() => auth.signOut.mock.calls.length, { timeout: 6000 })
      .toBeGreaterThan(0)
    expect(getComputedStyle(document.getElementById("stage")!).transform).toBe(
      "none"
    )
    await entered.unmount()
  })

  test("preview compose, category edit, and server mutations", async () => {
    const view = await render(providers(e2ePreviewUser("desk")))
    await waitPhase("desk")
    await css("#widget-category").click()
    const select = css("[aria-label='Netflix 分类']")
    await userEvent.selectOptions(select, "software")
    await userEvent.selectOptions(select, "software")
    await css("#dialog-close").click()
    await waitPhase("desk")

    await css("#widget-compose").click()
    const form = document.getElementById("compose-form") as HTMLFormElement
    const fields = form.querySelectorAll("input, select, textarea")
    const name = fields[0] as HTMLInputElement
    await userEvent.fill(name, "   ")
    const amount = form.querySelector(
      "input[type='number']"
    ) as HTMLInputElement
    await userEvent.fill(amount, "12.5")
    const selects = [...form.querySelectorAll("select")].map((node) =>
      control(node)
    )
    await userEvent.selectOptions(selects[0]!, "CNY")
    await userEvent.selectOptions(selects[1]!, "food")
    await userEvent.selectOptions(selects[2]!, "one_time")
    await userEvent.fill(
      form.querySelector("input[type='date']") as HTMLInputElement,
      "2026-12-01"
    )
    const status = [...form.querySelectorAll("select")].find((node) =>
      [...node.options].some((option) => option.value === "paused")
    )
    await userEvent.selectOptions(control(status!), "paused")
    const notes = form.querySelector("textarea") as HTMLTextAreaElement
    await userEvent.fill(notes, "  午饭  ")
    await userEvent.click(css("#compose-form button[type='submit']"))
    await waitPhase("desk")
    expect(document.getElementById("widget-category")?.textContent).toContain(
      "软件 2"
    )
    await css("#widget-subs").click()
    await expect
      .poll(() => document.getElementById("desk-dialog")?.textContent ?? "")
      .toContain("新订阅")
    const created = [...document.querySelectorAll("#desk-dialog li")].find(
      (node) => node.textContent?.includes("新订阅")
    )
    await userEvent.click(
      page.elementLocator(created?.querySelector("button") as HTMLButtonElement)
    )
    await expect.poll(() => root().dataset.expanded).toBe("compose")
    const editForm = document.getElementById("compose-form") as HTMLFormElement
    await userEvent.fill(
      editForm.querySelector("input") as HTMLInputElement,
      "改名"
    )
    await userEvent.click(css("#compose-form button[type='submit']"))
    await waitPhase("desk")
    const confirmDelete = vi.spyOn(window, "confirm").mockReturnValue(true)
    await css("#widget-subs").click()
    const renamed = [...document.querySelectorAll("#desk-dialog li")].find(
      (node) => node.textContent?.includes("改名")
    )
    await userEvent.click(
      page.elementLocator(
        renamed?.querySelectorAll("button")[1] as HTMLButtonElement
      )
    )
    await expect
      .poll(() => document.getElementById("desk-dialog")?.textContent ?? "")
      .not.toContain("改名")
    confirmDelete.mockRestore()
    await css("#dialog-close").click()
    await waitPhase("desk")

    await css("#widget-compose").click()
    const again = document.getElementById("compose-form") as HTMLFormElement
    await userEvent.fill(
      again.querySelector("input") as HTMLInputElement,
      "周报"
    )
    const typeSelect = [...again.querySelectorAll("select")].at(-3)
    await userEvent.selectOptions(control(typeSelect!), "recurring")
    const interval = [...again.querySelectorAll("select")].find((node) =>
      [...node.options].some((option) => option.value === "custom")
    )
    await userEvent.selectOptions(control(interval!), "custom")
    const days = [...again.querySelectorAll("input[type='number']")].at(
      -1
    ) as HTMLInputElement
    await userEvent.fill(days, "14")
    await userEvent.fill(
      again.querySelector("textarea") as HTMLTextAreaElement,
      ""
    )
    await userEvent.click(css("#compose-form button[type='submit']"))
    await waitPhase("desk")
    await view.unmount()

    gate.subs = [
      {
        id: "srv-1",
        name: "Figma",
        amountCents: 1500,
        currency: "USD",
        category: "software",
        notes: null,
        type: "recurring",
        interval: "monthly",
        intervalDays: null,
        chargeDate: "2026-11-20",
        status: "active",
      },
    ]
    let release: () => void = () => {}
    gate.delay = new Promise((resolve) => {
      release = resolve
    })
    const remote = await render(
      providers({ name: "Ada", email: "ada@real.test" })
    )
    await waitPhase("desk")
    expect(document.getElementById("widget-subs")?.textContent).toContain(
      "Figma"
    )
    await css("#widget-compose").click()
    await userEvent.click(css("#compose-form button[type='submit']"))
    await expect.poll(() => document.body.textContent).toContain("保存中")
    release()
    gate.delay = null
    await waitPhase("desk")
    await expect.poll(() => document.body.textContent).toContain("已记下")

    gate.fail = true
    await css("#widget-compose").click()
    await userEvent.click(css("#compose-form button[type='submit']"))
    await expect.poll(() => document.body.textContent).toContain("boom")
    gate.fail = false
    await css("#dialog-close").click()
    await waitPhase("desk")

    await css("#widget-subs").click()
    await page.getByRole("button", { name: "编辑" }).click()
    gate.fail = true
    await userEvent.click(css("#compose-form button[type='submit']"))
    await expect.poll(() => document.body.textContent).toContain("boom")
    gate.fail = false
    await userEvent.click(css("#compose-form button[type='submit']"))
    await waitPhase("desk")

    gate.fail = true
    await css("#widget-category").click()
    await userEvent.selectOptions(css("[aria-label='Figma 分类']"), "cloud")
    await expect.poll(() => document.body.textContent).toContain("boom")
    gate.fail = false
    await userEvent.selectOptions(css("[aria-label='Figma 分类']"), "cloud")
    await waitPhase("desk")
    await expect.poll(() => document.body.textContent).toContain("已更新")

    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true)
    gate.fail = true
    await css("#widget-subs").click()
    await page.getByRole("button", { name: "删除" }).click()
    await expect.poll(() => document.body.textContent).toContain("boom")
    gate.fail = false
    await page.getByRole("button", { name: "删除" }).click()
    await expect.poll(() => document.body.textContent).toContain("已删除")
    confirm.mockRestore()
    await remote.unmount()

    gate.subs = []
    const empty = await render(
      providers({ name: "Ada", email: "ada@real.test" })
    )
    await waitPhase("desk")
    expect(document.getElementById("widget-category")?.textContent).toContain(
      "暂无分类"
    )
    expect(document.getElementById("widget-subs")?.textContent).toContain(
      "暂无订阅"
    )
    expect(document.getElementById("widget-charges")?.textContent).toContain(
      "暂无扣费"
    )
    expect(document.getElementById("subs-monthly")?.textContent).toContain(
      "$0.00"
    )
    expect(document.getElementById("desk-ink-total")).toBeNull()
    await css("#widget-category").click()
    expect(document.getElementById("desk-dialog")?.textContent).toContain(
      "暂无分类"
    )
    await css("#widget-subs").click()
    expect(document.getElementById("desk-dialog")?.textContent).toContain(
      "暂无订阅"
    )
    document
      .getElementById("widget-charges")
      ?.dispatchEvent(new PointerEvent("pointerup", { bubbles: true }))
    await expect.poll(() => root().dataset.expanded).toBe("charges")
    expect(document.getElementById("desk-dialog")?.textContent).toContain(
      "暂无扣费"
    )
    await empty.unmount()
  })
})

const emptyForm: DialogForm = {
  name: "",
  amount: 0,
  currency: "USD",
  category: "other",
  notes: "",
  type: "recurring",
  interval: "monthly",
  intervalDays: 30,
  chargeDate: "2026-11-05",
  status: "active",
}

describe("session plate", () => {
  test("refresh flies it in from the left, and only a short press exits", async () => {
    sessionStorage.removeItem(JUST_AUTHED_KEY)
    const view = await render(providers(e2ePreviewUser("browse")))
    expect(root().dataset.from).toBe("session")
    await expect
      .poll(() => gsap.getTweensOf("#widget-session").length, { timeout: 2000 })
      .toBeGreaterThan(0)
    expect(tweenStartX("#widget-session")).toBeLessThanOrEqual(-420)
    expect(travel("#widget-session")).toBeGreaterThanOrEqual(420)
    expect(getComputedStyle(document.getElementById("stage")!).transform).toBe(
      "none"
    )
    await waitPhase("desk")
    const slot = document.getElementById("widget-session-slot")
    expect(slot?.getAttribute("transform")).toBe(
      `translate(${SESSION_SLOT.x} ${SESSION_SLOT.y})`
    )
    const face = document.querySelector("#widget-session rect")
    expect(face?.getAttribute("width")).toBe(String(SESSION_FACE.w))
    expect(face?.getAttribute("height")).toBe(String(SESSION_FACE.h))
    expect(face?.classList.contains("ink-shadow")).toBe(true)
    expect(getComputedStyle(face!).filter).toContain("widgetShadowDesk")
    expect(
      Math.abs(Number(gsap.getProperty("#widget-session", "x")))
    ).toBeLessThan(1)
    for (const viewport of [
      [1600, 900],
      [1024, 768],
      [1000, 800],
    ] as const) {
      await page.viewport(viewport[0], viewport[1])
      await expect
        .poll(() => {
          const node = document.getElementById("widget-session")
          const box = node?.getBoundingClientRect()
          const text = node?.querySelector("text")?.getBoundingClientRect()
          if (!box || !text || box.width < 20 || text.width < 8) return false
          return [box, text].every(
            (rect) =>
              rect.left >= -0.5 &&
              rect.top >= -0.5 &&
              rect.right <= window.innerWidth + 0.5 &&
              rect.bottom <= window.innerHeight + 0.5
          )
        })
        .toBe(true)
      expect(
        getComputedStyle(document.getElementById("stage")!).transform
      ).toBe("none")
    }
    const node = document.getElementById("widget-session")!
    const home = slot?.getAttribute("transform")
    pointer("pointerup", node, 12, 12)
    expect(root().dataset.phase).toBe("desk")
    const rect = node.getBoundingClientRect()
    pointer("pointerdown", node, rect.left + 10, rect.top + 10)
    pointer("pointermove", window, rect.left + 40, rect.top + 10)
    pointer("pointerup", node, rect.left + 36, rect.top + 10)
    expect(slot?.getAttribute("transform")).toBe(home)
    expect(root().dataset.phase).toBe("desk")
    expect(gate.layoutSaves).toEqual([])
    expect(localStorage.getItem(PREVIEW_LAYOUT_KEY)).toBeNull()
    pointer("pointerdown", node, rect.left + 10, rect.top + 10)
    pointer("pointerup", node, rect.left + 14, rect.top + 12)
    await waitPhase("exit")
    expect(
      gsap
        .getTweensOf("#widget-session")
        .some((tween) => Number(tween.vars.x) <= -420)
    ).toBe(true)
    expect(getComputedStyle(document.getElementById("stage")!).transform).toBe(
      "none"
    )
    await view.unmount()
  })
})

describe("dialog paper", () => {
  test("renders every face, including an unknown id", async () => {
    const onClose = vi.fn()
    const onEdit = vi.fn()
    const onDelete = vi.fn()
    const onCategory = vi.fn()
    const onChange = vi.fn()
    const onSubmit = vi.fn()
    const view = await render(
      <svg>
        <DeskDialogMount
          widget={null}
          items={[]}
          charges={[]}
          form={emptyForm}
          editing={false}
          submitting={false}
          onClose={onClose}
          onEdit={onEdit}
          onDelete={onDelete}
          onCategory={onCategory}
          onChange={onChange}
          onSubmit={onSubmit}
        />
      </svg>
    )
    expect(document.querySelector("#desk-dialog foreignObject")).toBeNull()
    await view.unmount()

    const faces: Array<ContentWidgetId | "nope"> = [
      "category",
      "subs",
      "charges",
      "compose",
      "nope",
    ]
    for (const face of faces) {
      const shown = await render(
        <svg>
          <DeskDialogMount
            widget={face === "nope" ? ("nope" as ContentWidgetId) : face}
            items={
              face === "category"
                ? [
                    {
                      id: "odd",
                      name: "怪",
                      amountCents: 100,
                      currency: "USD",
                      category: "nope",
                      type: "one_time",
                      interval: null,
                      intervalDays: null,
                      chargeDate: "2026-11-05",
                      status: "active",
                    },
                  ]
                : []
            }
            charges={[]}
            form={{
              ...emptyForm,
              type: face === "compose" ? "one_time" : "recurring",
            }}
            editing={face === "compose"}
            submitting={face === "compose"}
            onClose={onClose}
            onEdit={onEdit}
            onDelete={onDelete}
            onCategory={onCategory}
            onChange={onChange}
            onSubmit={onSubmit}
          />
        </svg>
      )
      const dialog = shown.container.querySelector("#desk-dialog")
      expect(dialog, face).toBeTruthy()
      expect(dialog?.querySelector("foreignObject")).toBeTruthy()
      await shown.unmount()
    }
  })
})

describe("content drag", () => {
  test("a short press opens the dialog and a real drag does not", async () => {
    const view = await render(providers(e2ePreviewUser("browse")))
    await waitPhase("desk")
    expect(document.getElementById("widgetShadow")).toBeNull()
    for (const [id, level] of [
      ["widgetShadowDesk", SHADOW.desk],
      ["widgetShadowLift", SHADOW.lift],
      ["widgetShadowFloat", SHADOW.float],
    ] as const) {
      const shadow = document.querySelector(`#${id} feDropShadow`)
      expect(shadow?.getAttribute("flood-color")).toBe(SHADOW.ink)
      expect(Number(shadow?.getAttribute("dy"))).toBe(level.dy)
      expect(Number(shadow?.getAttribute("stdDeviation"))).toBe(level.std)
      expect(Number(shadow?.getAttribute("flood-opacity"))).toBe(level.opacity)
      expect(shadow?.getAttribute("dx")).toBe("0")
    }
    const ink = document.querySelector("#widget-compose .ink-shadow")
    expect(ink).toBeTruthy()
    expect(getComputedStyle(ink!).filter).toContain("widgetShadowDesk")

    const compose = document.getElementById("widget-compose")!
    const rect = compose.getBoundingClientRect()
    pointer("pointerdown", compose, rect.left + 16, rect.top + 16)
    pointer("pointermove", window, rect.left + 23, rect.top + 16)
    pointer("pointerup", window, rect.left + 23, rect.top + 16)
    await waitPhase("expanded")
    expect(slotOf("compose")).toEqual(CONTENT_SLOTS.compose)
    expect(localStorage.getItem(PREVIEW_LAYOUT_KEY)).toBeNull()
    expect(document.querySelector("#desk-dialog foreignObject")).toBeTruthy()
    expect(
      getComputedStyle(document.getElementById("desk-dialog")!).filter
    ).toContain("widgetShadowFloat")
    expect(
      document.querySelector("#desk-dialog foreignObject")?.getAttribute("x")
    ).toBe("270")
    pointer("pointerdown", document.querySelector(".dialog-paper")!, 400, 300)
    pointer("pointermove", window, 520, 360)
    pointer("pointerup", window, 520, 360)
    expect(
      document.querySelector("#desk-dialog foreignObject")?.getAttribute("y")
    ).toBe("120")
    expect(root().dataset.expanded).toBe("compose")
    await view.unmount()
  })

  test("dragging moves the compact slot, bounces into the slice, and restores", async () => {
    localStorage.setItem(
      PREVIEW_LAYOUT_KEY,
      JSON.stringify({ compose: { x: 480, y: 240 } })
    )
    const first = await render(providers(e2ePreviewUser("browse")))
    await waitPhase("desk")
    expect(slotOf("compose")).toEqual({ x: 480, y: 240 })
    expect(slotOf("category")).toEqual(CONTENT_SLOTS.category)
    expect(getComputedStyle(document.getElementById("stage")!).transform).toBe(
      "none"
    )
    const before = {
      cup: document.getElementById("prop-cup-slot")?.getAttribute("transform"),
      pen: document.getElementById("prop-pen-slot")?.getAttribute("transform"),
      plant: document.getElementById("prop-plant")?.getAttribute("transform"),
      tape: document
        .getElementById("prop-tape-floral")
        ?.getAttribute("transform"),
    }
    const tape = document.getElementById("prop-tape-floral")!
    pointer("pointerdown", tape, 100, 100)
    pointer("pointermove", window, 200, 160)
    pointer("pointerup", tape, 200, 160)
    expect(
      document.getElementById("prop-cup-slot")?.getAttribute("transform")
    ).toBe(before.cup)
    expect(
      document.getElementById("prop-pen-slot")?.getAttribute("transform")
    ).toBe(before.pen)
    expect(
      document.getElementById("prop-plant")?.getAttribute("transform")
    ).toBe(before.plant)
    expect(
      document.getElementById("prop-tape-floral")?.getAttribute("transform")
    ).toBe(before.tape)
    expect(gate.layoutSaves).toEqual([])

    const { x, y } = await dragWidget("compose", 40, 0)
    await expect
      .poll(() => root().dataset.dragging ?? "", { timeout: 1000 })
      .toBe("compose")
    expect(
      getComputedStyle(document.querySelector("#widget-compose .ink-shadow")!)
        .filter
    ).toContain("widgetShadowLift")
    expect(
      getComputedStyle(document.querySelector("#widget-category .ink-shadow")!)
        .filter
    ).toContain("widgetShadowDesk")
    pointer("pointerup", window, x + 40, y)
    await expect
      .poll(() => root().dataset.dragging ?? "", { timeout: 1000 })
      .toBe("")
    expect(root().dataset.phase).toBe("desk")
    expect(root().dataset.expanded ?? "").toBe("")
    expect(document.querySelector("#desk-dialog foreignObject")).toBeNull()
    const moved = slotOf("compose")
    expect(moved?.x).toBeGreaterThan(480)
    expect(localStorage.getItem(PREVIEW_LAYOUT_KEY)).toContain("compose")
    expect(localStorage.getItem(PREVIEW_LAYOUT_KEY)).not.toContain("github")
    expect(getComputedStyle(document.getElementById("stage")!).transform).toBe(
      "none"
    )
    expect(document.getElementById("stage")?.getAttribute("viewBox")).toBe(
      "0 0 1280 800"
    )
    await first.unmount()

    const again = await render(providers(e2ePreviewUser("browse")))
    await waitPhase("desk")
    expect(slotOf("compose")?.x).toBeCloseTo(moved?.x ?? 0, 0)
    expect(slotOf("compose")?.y).toBeCloseTo(moved?.y ?? 0, 0)
    await again.unmount()

    const edges = [
      { viewport: [1600, 900] as const, id: "compose", dx: 0, dy: -4000 },
      { viewport: [1024, 768] as const, id: "subs", dx: 4000, dy: 0 },
      { viewport: [1000, 800] as const, id: "category", dx: -4000, dy: 0 },
      { viewport: [1000, 800] as const, id: "charges", dx: 4000, dy: 0 },
    ]
    for (const edge of edges) {
      await page.viewport(edge.viewport[0], edge.viewport[1])
      const pass = await render(providers(e2ePreviewUser("browse")))
      await waitPhase("desk")
      const start = await dragWidget(edge.id, edge.dx, edge.dy)
      pointer("pointerup", window, start.x + edge.dx, start.y + edge.dy)
      await expect
        .poll(() => insideVisible(edge.id), { timeout: 2000 })
        .toBe(true)
      expect(
        getComputedStyle(document.getElementById("stage")!).transform
      ).toBe("none")
      await pass.unmount()
    }
  })

  test("a drag that lands on the sticker slot drops the saved row", async () => {
    localStorage.setItem(
      PREVIEW_LAYOUT_KEY,
      JSON.stringify({ compose: { x: 480, y: 240 } })
    )
    const view = await render(providers(e2ePreviewUser("browse")))
    await waitPhase("desk")
    const stage = document.getElementById("stage")
    if (!(stage instanceof SVGSVGElement)) throw new Error("stage missing")
    const origin = viewBoxPoint(stage, 0, 0)
    const unit = viewBoxPoint(stage, 100, 100)
    const dx = (CONTENT_SLOTS.compose.x - 480) / ((unit.x - origin.x) / 100)
    const dy = (CONTENT_SLOTS.compose.y - 240) / ((unit.y - origin.y) / 100)
    const start = await dragWidget("compose", dx, dy)
    pointer("pointerup", window, start.x + dx, start.y + dy)
    await expect
      .poll(() => localStorage.getItem(PREVIEW_LAYOUT_KEY) ?? "", {
        timeout: 1000,
      })
      .not.toContain("compose")
    expect(slotOf("compose")?.x).toBeCloseTo(CONTENT_SLOTS.compose.x, 0)
    expect(slotOf("compose")?.y).toBeCloseTo(CONTENT_SLOTS.compose.y, 0)
    expect(gate.layoutSaves).toEqual([])
    await view.unmount()
  })

  test("a signed-in desk persists through D1 and not preview storage", async () => {
    previewFlags.dev = false
    previewFlags.e2e = false
    gate.layouts = [{ widgetId: "compose", x: 400, y: 210 }]
    const view = await render(
      providers({ name: "Mun", email: "mun@techo.test" })
    )
    await waitPhase("desk")
    expect(slotOf("compose")).toEqual({ x: 400, y: 210 })
    expect(localStorage.getItem(PREVIEW_LAYOUT_KEY)).toBeNull()
    const start = await dragWidget("subs", 36, 0)
    pointer("pointerup", window, start.x + 36, start.y)
    await expect
      .poll(() => gate.layoutSaves.length, { timeout: 1000 })
      .toBeGreaterThan(0)
    expect(gate.layoutSaves[0]?.widgetId).toBe("subs")
    expect(localStorage.getItem(PREVIEW_LAYOUT_KEY)).toBeNull()
    expect(gate.layoutSaves.some((row) => row.widgetId === "github")).toBe(
      false
    )
    await view.unmount()
  })
})
