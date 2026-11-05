/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"

import {
  INK_GROW_STATES,
  SECONDARY_TAPE_IDS,
  SECONDARY_TAPE_SELECTORS,
  STICKER_FOUR_STATES,
  bootScene,
  reduceScene,
  type SceneSnapshot,
} from "./scene-machine"

const sealed: SceneSnapshot = {
  scene: "sealed",
  tab: "overview",
  locked: false,
}

const browse: SceneSnapshot = {
  scene: "browse",
  tab: "overview",
  locked: false,
}

const compose: SceneSnapshot = {
  scene: "compose",
  tab: "overview",
  locked: false,
}

describe("bootScene", () => {
  test("fresh visitor stays sealed", () => {
    expect(bootScene({ user: false, justAuthed: false })).toEqual(sealed)
    expect(bootScene({ user: false, justAuthed: true })).toEqual(sealed)
  })

  test("logged-in boot skips sealed/opening and lands on browse", () => {
    expect(bootScene({ user: true, justAuthed: false })).toEqual(browse)
  })

  test("fresh login boots into opening", () => {
    expect(bootScene({ user: true, justAuthed: true })).toEqual({
      scene: "opening",
      tab: "overview",
      locked: true,
    })
  })
})

describe("reduceScene", () => {
  test("five states are reachable: sealed | opening | closing | browse | compose", () => {
    const opening = reduceScene(sealed, { type: "login-success" })
    const afterOpen = reduceScene(opening, { type: "opening-done" })
    const writing = reduceScene(afterOpen, { type: "compose" })
    const closing = reduceScene(writing, { type: "logout" })
    const done = reduceScene(closing, { type: "closing-done" })

    expect(opening.scene).toBe("opening")
    expect(afterOpen.scene).toBe("browse")
    expect(writing.scene).toBe("compose")
    expect(closing.scene).toBe("closing")
    expect(done.scene).toBe("sealed")
  })

  test("fresh login → opening then browse", () => {
    const opening = reduceScene(sealed, { type: "login-success" })
    expect(opening).toEqual({
      scene: "opening",
      tab: "overview",
      locked: true,
    })
    expect(reduceScene(opening, { type: "opening-done" })).toEqual(browse)
  })

  test("session refresh login-success from browse still plays opening", () => {
    expect(reduceScene(browse, { type: "login-success" }).scene).toBe("opening")
  })

  test("logout from browse → closing → sealed", () => {
    const closing = reduceScene(browse, { type: "logout" })
    expect(closing).toEqual({
      scene: "closing",
      tab: "overview",
      locked: true,
    })
    expect(reduceScene(closing, { type: "closing-done" })).toEqual(sealed)
  })

  test("logout from compose → closing → sealed", () => {
    const closing = reduceScene(compose, { type: "logout" })
    expect(closing.scene).toBe("closing")
    expect(closing.locked).toBe(true)
    expect(reduceScene(closing, { type: "closing-done" }).scene).toBe("sealed")
  })

  test("opening is non-interruptible: tab/compose/logout/login are ignored", () => {
    const opening = reduceScene(sealed, { type: "login-success" })
    expect(reduceScene(opening, { type: "tab", tab: "category" })).toEqual(
      opening
    )
    expect(reduceScene(opening, { type: "compose" })).toEqual(opening)
    expect(reduceScene(opening, { type: "logout" })).toEqual(opening)
    expect(reduceScene(opening, { type: "login-success" })).toEqual(opening)
    expect(reduceScene(opening, { type: "compose-saved" })).toEqual(opening)
  })

  test("closing is non-interruptible: tab/compose/logout/login are ignored", () => {
    const closing = reduceScene(browse, { type: "logout" })
    expect(reduceScene(closing, { type: "tab", tab: "subs" })).toEqual(closing)
    expect(reduceScene(closing, { type: "compose" })).toEqual(closing)
    expect(reduceScene(closing, { type: "logout" })).toEqual(closing)
    expect(reduceScene(closing, { type: "login-success" })).toEqual(closing)
    expect(reduceScene(closing, { type: "opening-done" })).toEqual(closing)
  })

  test("tab flip stays in browse (no scene remount)", () => {
    const flipped = reduceScene(browse, { type: "tab", tab: "category" })
    expect(flipped).toEqual({
      scene: "browse",
      tab: "category",
      locked: false,
    })
    expect(reduceScene(flipped, { type: "tab", tab: "charges" }).scene).toBe(
      "browse"
    )
  })

  test("tab events from sealed/compose do not steal the scene", () => {
    expect(reduceScene(sealed, { type: "tab", tab: "subs" })).toEqual(sealed)
    expect(reduceScene(compose, { type: "tab", tab: "subs" })).toEqual(compose)
  })

  test("compose save/cancel return to browse, keeping or restoring the tab", () => {
    const writing = reduceScene(
      { scene: "browse", tab: "subs", locked: false },
      { type: "compose" }
    )
    expect(writing.scene).toBe("compose")
    expect(writing.tab).toBe("subs")
    expect(reduceScene(writing, { type: "compose-saved" }).scene).toBe("browse")
    expect(
      reduceScene(writing, { type: "compose-cancel", tab: "overview" })
    ).toEqual({
      scene: "browse",
      tab: "overview",
      locked: false,
    })
  })
})

describe("sticker four-state + secondary tapes", () => {
  test("shared four-state recipe is idle | hover | act | settle", () => {
    expect(STICKER_FOUR_STATES).toEqual(["idle", "hover", "act", "settle"])
  })

  test("secondary tape ids participate in the sticker recipe", () => {
    expect(SECONDARY_TAPE_IDS).toEqual([
      "prop-tape-floral",
      "prop-tape-blue",
      "prop-tape-gingham",
    ])
    expect(SECONDARY_TAPE_SELECTORS).toEqual([
      "#prop-tape-floral",
      "#prop-tape-blue",
      "#prop-tape-gingham",
    ])
  })

  test("ink grow settle states are idle | growing | grown (not a fade/cut)", () => {
    expect(INK_GROW_STATES).toEqual(["idle", "growing", "grown"])
  })
})
