import { describe, expect, test } from "vitest"

import {
  AUTH_SCENE_IDS,
  AUTH_WIDGET_IDS,
  CONTENT_SCENE_IDS,
  CONTENT_WIDGET_IDS,
  WIDGET_FOUR_STATES,
  WIDGET_SCENE_IDS,
  bootDesk,
  isAuthWidgetId,
  isContentWidgetId,
  isDeskLocked,
  isOverview,
  reduceDesk,
  sceneIdFor,
  type DeskEvent,
  type DeskSnapshot,
} from "./widget-machine"

const loginOnly: DeskSnapshot = {
  phase: "login-only",
  expanded: null,
  locked: false,
  fromLogin: false,
}

const deskIdle: DeskSnapshot = {
  phase: "desk",
  expanded: null,
  locked: false,
  fromLogin: false,
}

describe("content widgets", () => {
  test("there is no overview widget; idle desk is overview", () => {
    expect(CONTENT_WIDGET_IDS).toEqual([
      "category",
      "subs",
      "charges",
      "compose",
    ])
    expect(CONTENT_WIDGET_IDS).not.toContain("overview")
    expect(WIDGET_SCENE_IDS).not.toHaveProperty("overview")
    expect(isOverview(deskIdle)).toBe(true)
    expect(isOverview({ ...deskIdle, expanded: "category" })).toBe(false)
    expect(
      isOverview({ ...deskIdle, phase: "expanded", expanded: "subs" })
    ).toBe(false)
    expect(CONTENT_SCENE_IDS).toEqual([
      "widget-category",
      "widget-subs",
      "widget-charges",
      "widget-compose",
    ])
    expect(AUTH_SCENE_IDS).toEqual(["widget-auth-github"])
  })

  test("scene ids are four content shells plus the auth family", () => {
    expect(CONTENT_WIDGET_IDS).not.toContain("github")
    expect(AUTH_WIDGET_IDS).toEqual(["github"])
    expect(AUTH_WIDGET_IDS).not.toContain("more")
    expect(WIDGET_SCENE_IDS).toEqual({
      category: "widget-category",
      subs: "widget-subs",
      charges: "widget-charges",
      compose: "widget-compose",
      github: "widget-auth-github",
    })
    expect(WIDGET_SCENE_IDS).not.toHaveProperty("more")
    expect(sceneIdFor("github")).toBe("widget-auth-github")
    expect(sceneIdFor("compose")).toBe("widget-compose")
    expect(isContentWidgetId("subs")).toBe(true)
    expect(isContentWidgetId("github")).toBe(false)
    expect(isAuthWidgetId("github")).toBe(true)
    expect(isAuthWidgetId("subs")).toBe(false)
    expect(isDeskLocked("enter")).toBe(true)
    expect(isDeskLocked("exit")).toBe(true)
    expect(isDeskLocked("desk")).toBe(false)
    expect(isDeskLocked("expanded")).toBe(false)
    expect(isDeskLocked("login-only")).toBe(false)
  })

  test("four-state recipe is idle | hover | act | held", () => {
    expect(WIDGET_FOUR_STATES).toEqual(["idle", "hover", "act", "held"])
  })
})

describe("bootDesk", () => {
  test("unauthed boot is login-only with nothing expanded", () => {
    expect(bootDesk({ user: false, fromLogin: false })).toEqual(loginOnly)
    expect(bootDesk({ user: false, fromLogin: true })).toEqual(loginOnly)
  })

  test("logged-in refresh boots enter (fly-in), not a static desk teleport", () => {
    expect(bootDesk({ user: true, fromLogin: false })).toEqual({
      phase: "enter",
      expanded: null,
      locked: true,
      fromLogin: false,
    })
  })

  test("fresh login boots enter with fromLogin so auth can fly out", () => {
    expect(bootDesk({ user: true, fromLogin: true })).toEqual({
      phase: "enter",
      expanded: null,
      locked: true,
      fromLogin: true,
    })
  })
})

describe("reduceDesk", () => {
  test("boot event rebuilds the snapshot", () => {
    expect(
      reduceDesk(deskIdle, { type: "boot", user: false, fromLogin: true })
    ).toEqual(loginOnly)
  })

  test("login-success from login-only → enter (locked, fromLogin)", () => {
    const next = reduceDesk(loginOnly, { type: "login-success" })
    expect(next).toEqual({
      phase: "enter",
      expanded: null,
      locked: true,
      fromLogin: true,
    })
  })

  test("enter-done lands on desk idle, which is overview", () => {
    const entering = reduceDesk(loginOnly, { type: "login-success" })
    const desk = reduceDesk(entering, { type: "enter-done" })
    expect(desk).toEqual(deskIdle)
    expect(isOverview(desk)).toBe(true)
  })

  test("expand from desk opens that id; at most one expanded", () => {
    const expanded = reduceDesk(deskIdle, { type: "expand", id: "category" })
    expect(expanded).toEqual({
      phase: "expanded",
      expanded: "category",
      locked: false,
      fromLogin: false,
    })
    expect(isOverview(expanded)).toBe(false)
  })

  test("collapse from expanded returns desk idle overview", () => {
    const expanded = reduceDesk(deskIdle, { type: "expand", id: "subs" })
    expect(reduceDesk(expanded, { type: "collapse" })).toEqual(deskIdle)
  })

  test("expand another while expanded switches to that id", () => {
    const expanded = reduceDesk(deskIdle, { type: "expand", id: "category" })
    const swapped = reduceDesk(expanded, { type: "expand", id: "charges" })
    expect(swapped.phase).toBe("expanded")
    expect(swapped.expanded).toBe("charges")
  })

  test("expand the already-open widget collapses to desk idle", () => {
    const expanded = reduceDesk(deskIdle, { type: "expand", id: "compose" })
    expect(reduceDesk(expanded, { type: "expand", id: "compose" })).toEqual(
      deskIdle
    )
  })

  test("logout from desk → exit → login-only", () => {
    const exiting = reduceDesk(deskIdle, { type: "logout" })
    expect(exiting).toEqual({
      phase: "exit",
      expanded: null,
      locked: true,
      fromLogin: false,
    })
    expect(reduceDesk(exiting, { type: "exit-done" })).toEqual(loginOnly)
  })

  test("logout from expanded clears the dialog then exits", () => {
    const expanded = reduceDesk(deskIdle, { type: "expand", id: "compose" })
    const exiting = reduceDesk(expanded, { type: "logout" })
    expect(exiting.phase).toBe("exit")
    expect(exiting.expanded).toBe(null)
    expect(exiting.locked).toBe(true)
  })

  test("enter is non-interruptible", () => {
    const entering = reduceDesk(loginOnly, { type: "login-success" })
    expect(reduceDesk(entering, { type: "expand", id: "subs" })).toEqual(
      entering
    )
    expect(reduceDesk(entering, { type: "collapse" })).toEqual(entering)
    expect(reduceDesk(entering, { type: "logout" })).toEqual(entering)
    expect(reduceDesk(entering, { type: "login-success" })).toEqual(entering)
    expect(reduceDesk(entering, { type: "exit-done" })).toEqual(entering)
  })

  test("exit is non-interruptible", () => {
    const exiting = reduceDesk(deskIdle, { type: "logout" })
    expect(reduceDesk(exiting, { type: "expand", id: "category" })).toEqual(
      exiting
    )
    expect(reduceDesk(exiting, { type: "collapse" })).toEqual(exiting)
    expect(reduceDesk(exiting, { type: "logout" })).toEqual(exiting)
    expect(reduceDesk(exiting, { type: "login-success" })).toEqual(exiting)
    expect(reduceDesk(exiting, { type: "enter-done" })).toEqual(exiting)
  })

  test("login-success does nothing once the desk is already open", () => {
    expect(reduceDesk(deskIdle, { type: "login-success" })).toEqual(deskIdle)
  })

  test("expand/collapse/logout are ignored on login-only", () => {
    expect(reduceDesk(loginOnly, { type: "expand", id: "category" })).toEqual(
      loginOnly
    )
    expect(reduceDesk(loginOnly, { type: "collapse" })).toEqual(loginOnly)
    expect(reduceDesk(loginOnly, { type: "logout" })).toEqual(loginOnly)
    expect(reduceDesk(loginOnly, { type: "enter-done" })).toEqual(loginOnly)
  })

  test("unknown events fall through the never branch", () => {
    const event = { type: "nope" } as unknown as DeskEvent
    expect(reduceDesk(loginOnly, event)).toBe(event)
  })
})
