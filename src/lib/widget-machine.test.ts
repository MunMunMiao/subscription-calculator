/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"

import {
  CONTENT_WIDGET_IDS,
  WIDGET_FOUR_STATES,
  WIDGET_SCENE_IDS,
  bootDesk,
  isOverview,
  reduceDesk,
  type DeskSnapshot,
} from "./widget-machine"

const loginOnly: DeskSnapshot = {
  phase: "login-only",
  held: null,
  locked: false,
  fromLogin: false,
}

const deskIdle: DeskSnapshot = {
  phase: "desk",
  held: null,
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
    expect(isOverview({ ...deskIdle, held: "category" })).toBe(false)
    expect(isOverview({ ...deskIdle, phase: "held", held: "subs" })).toBe(false)
  })

  test("scene ids are login + four content shells", () => {
    expect(WIDGET_SCENE_IDS).toEqual({
      login: "widget-login",
      category: "widget-category",
      subs: "widget-subs",
      charges: "widget-charges",
      compose: "widget-compose",
    })
  })

  test("four-state recipe is idle | hover | act | held", () => {
    expect(WIDGET_FOUR_STATES).toEqual(["idle", "hover", "act", "held"])
  })
})

describe("bootDesk", () => {
  test("unauthed boot is login-only with no held widget", () => {
    expect(bootDesk({ user: false, fromLogin: false })).toEqual(loginOnly)
    expect(bootDesk({ user: false, fromLogin: true })).toEqual(loginOnly)
  })

  test("logged-in refresh boots enter (fly-in), not a static desk teleport", () => {
    expect(bootDesk({ user: true, fromLogin: false })).toEqual({
      phase: "enter",
      held: null,
      locked: true,
      fromLogin: false,
    })
  })

  test("fresh login boots enter with fromLogin so login can fly out", () => {
    expect(bootDesk({ user: true, fromLogin: true })).toEqual({
      phase: "enter",
      held: null,
      locked: true,
      fromLogin: true,
    })
  })
})

describe("reduceDesk", () => {
  test("login-success from login-only → enter (locked, fromLogin)", () => {
    const next = reduceDesk(loginOnly, { type: "login-success" })
    expect(next).toEqual({
      phase: "enter",
      held: null,
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

  test("pick from desk holds that id; at most one held", () => {
    const held = reduceDesk(deskIdle, { type: "pick", id: "category" })
    expect(held).toEqual({
      phase: "held",
      held: "category",
      locked: false,
      fromLogin: false,
    })
    expect(isOverview(held)).toBe(false)
  })

  test("put-down from held returns desk idle overview", () => {
    const held = reduceDesk(deskIdle, { type: "pick", id: "subs" })
    expect(reduceDesk(held, { type: "put-down" })).toEqual(deskIdle)
  })

  test("pick another while held switches to that id", () => {
    const held = reduceDesk(deskIdle, { type: "pick", id: "category" })
    const swapped = reduceDesk(held, { type: "pick", id: "charges" })
    expect(swapped.phase).toBe("held")
    expect(swapped.held).toBe("charges")
  })

  test("pick the already-held widget is a no-op", () => {
    const held = reduceDesk(deskIdle, { type: "pick", id: "compose" })
    expect(reduceDesk(held, { type: "pick", id: "compose" })).toEqual(held)
  })

  test("logout from desk → exit → login-only", () => {
    const exiting = reduceDesk(deskIdle, { type: "logout" })
    expect(exiting).toEqual({
      phase: "exit",
      held: null,
      locked: true,
      fromLogin: false,
    })
    expect(reduceDesk(exiting, { type: "exit-done" })).toEqual(loginOnly)
  })

  test("logout from held first clears held then exits", () => {
    const held = reduceDesk(deskIdle, { type: "pick", id: "compose" })
    const exiting = reduceDesk(held, { type: "logout" })
    expect(exiting.phase).toBe("exit")
    expect(exiting.held).toBe(null)
    expect(exiting.locked).toBe(true)
  })

  test("enter is non-interruptible", () => {
    const entering = reduceDesk(loginOnly, { type: "login-success" })
    expect(reduceDesk(entering, { type: "pick", id: "subs" })).toEqual(entering)
    expect(reduceDesk(entering, { type: "put-down" })).toEqual(entering)
    expect(reduceDesk(entering, { type: "logout" })).toEqual(entering)
    expect(reduceDesk(entering, { type: "login-success" })).toEqual(entering)
  })

  test("exit is non-interruptible", () => {
    const exiting = reduceDesk(deskIdle, { type: "logout" })
    expect(reduceDesk(exiting, { type: "pick", id: "category" })).toEqual(
      exiting
    )
    expect(reduceDesk(exiting, { type: "put-down" })).toEqual(exiting)
    expect(reduceDesk(exiting, { type: "logout" })).toEqual(exiting)
    expect(reduceDesk(exiting, { type: "login-success" })).toEqual(exiting)
    expect(reduceDesk(exiting, { type: "enter-done" })).toEqual(exiting)
  })

  test("pick/put-down/logout are ignored on login-only", () => {
    expect(reduceDesk(loginOnly, { type: "pick", id: "category" })).toEqual(
      loginOnly
    )
    expect(reduceDesk(loginOnly, { type: "put-down" })).toEqual(loginOnly)
    expect(reduceDesk(loginOnly, { type: "logout" })).toEqual(loginOnly)
    expect(reduceDesk(loginOnly, { type: "enter-done" })).toEqual(loginOnly)
  })
})
