import { afterEach, describe, expect, test } from "vitest"

import { gsap } from "./gsap"
import {
  AUTH_WIDGET_IDS,
  WIDGET_FOUR_STATES,
  WIDGET_SCENE_IDS,
} from "./widget-machine"
// oxlint-disable-next-line import/default -- Vite ?raw is a default string export
import motionSource from "./widget-motion.ts?raw"
// oxlint-disable-next-line import/default -- Vite ?raw is a default string export
import sceneSource from "../components/desk-scene.tsx?raw"
import {
  AUTH_GITHUB_FACE,
  AUTH_OUT,
  AUTH_SELECTORS,
  AUTH_SLOTS,
  AUTH_WIDGETS,
  COLLAPSE_MOTION,
  CONTENT_SCENE_IDS,
  CONTENT_SELECTORS,
  EXPAND_DIALOG,
  EXPAND_SOURCE,
  FROM,
  OFF,
  SESSION_FACE,
  SESSION_FROM,
  SESSION_SLOT,
  SLICE_MARGIN,
  STAGE,
  bindWidgetStickers,
  collapseExpanded,
  expandWidget,
  playAmbient,
  playEnterRespectingMotion,
  playExit,
  poseLoginOnly,
  poseRefreshStart,
  setWidgetState,
  SHADOW,
  DRAG_BOUNCE,
  DRAG_THRESHOLD,
  bindContentDrag,
  bounceSlot,
  clampSlot,
  contentWidgetFromTarget,
  isDrag,
  readTranslate,
  sliceSafeRect,
  sliceVisibleRect,
  viewBoxPoint,
  visibleStageRect,
} from "./widget-motion"

function absDelta(delta: { x: number; y: number }) {
  return Math.max(Math.abs(delta.x), Math.abs(delta.y))
}

function mountStage(kind: "svg" | "html" | "math" | "none") {
  document.body.replaceChildren()
  if (kind === "none") return
  if (kind === "html") {
    const div = document.createElement("div")
    div.id = "stage"
    document.body.appendChild(div)
    return
  }
  if (kind === "math") {
    const math = document.createElementNS(
      "http://www.w3.org/1998/Math/MathML",
      "math"
    )
    math.id = "stage"
    document.body.appendChild(math)
    return
  }
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.id = "stage"
  svg.setAttribute("viewBox", "0 0 1280 800")
  const dialog = document.createElementNS("http://www.w3.org/2000/svg", "g")
  dialog.id = "desk-dialog"
  svg.appendChild(dialog)
  for (const id of [
    "widget-category",
    "widget-subs",
    "widget-charges",
    "widget-compose",
    "widget-auth-github",
    "widget-session",
    "prop-cup",
    "prop-plant",
    "prop-pen",
    "prop-tape-floral",
  ]) {
    const node = document.createElementNS("http://www.w3.org/2000/svg", "g")
    node.id = id
    if (
      (id.startsWith("widget") && id !== "widget-session") ||
      id.startsWith("prop-tape")
    ) {
      node.setAttribute("data-interactive", "true")
    }
    svg.appendChild(node)
  }
  document.body.appendChild(svg)
}

function setReduce(on: boolean) {
  const original = window.matchMedia.bind(window)
  window.matchMedia = (query: string) =>
    ({
      matches: on && query.includes("prefers-reduced-motion"),
      media: query,
      onchange: null,
      addListener() {},
      removeListener() {},
      addEventListener() {},
      removeEventListener() {},
      dispatchEvent() {
        return false
      },
    }) as MediaQueryList
  return () => {
    window.matchMedia = original
  }
}

const dragCleanups: Array<() => void> = []

afterEach(() => {
  for (const cleanup of dragCleanups) cleanup()
  dragCleanups.length = 0
  gsap.globalTimeline.clear()
  document.body.replaceChildren()
})

describe("MOTION §§1–3 hard gates", () => {
  test("stage is 1280×800", () => {
    expect(STAGE).toEqual({ w: 1280, h: 800 })
  })

  test("never tweens #stage camera", () => {
    expect(sceneSource).toContain('viewBox="0 0 1280 800"')
    expect(sceneSource).toContain('preserveAspectRatio="xMidYMid slice"')
    expect(sceneSource).not.toContain('id="light"')
    expect(motionSource).not.toContain("#light")
    expect(motionSource).not.toMatch(
      /gsap\.(to|from|fromTo|set)\(\s*["']#stage/
    )
    expect(motionSource).toContain("stage.style.pointerEvents")
    expect(motionSource).not.toContain("LOGIN_OUT")
    expect(motionSource).not.toContain("#login-control")
    expect(motionSource).not.toContain("playPickUp")
    expect(CONTENT_SCENE_IDS).toEqual([
      "widget-category",
      "widget-subs",
      "widget-charges",
      "widget-compose",
    ])
  })

  test("OFF and FROM are true off-canvas, not micro-shift", () => {
    expect(OFF).toBeGreaterThanOrEqual(420)
    expect(OFF).toBe(480)
    for (const sel of CONTENT_SELECTORS) {
      expect(absDelta(FROM[sel])).toBeGreaterThanOrEqual(420)
      expect(Math.abs(FROM[sel].x)).toBe(OFF)
    }
  })

  test("auth widgets fly fully above the 800h stage", () => {
    expect(AUTH_SELECTORS).toEqual(
      AUTH_WIDGET_IDS.map((id) => `#${WIDGET_SCENE_IDS[id]}`)
    )
    expect(AUTH_SELECTORS).toEqual(["#widget-auth-github"])
    expect(AUTH_WIDGETS).toEqual([
      {
        id: "github",
        selector: "#widget-auth-github",
        slot: AUTH_SLOTS.github,
        out: AUTH_OUT.github,
      },
    ])
    expect(AUTH_OUT.github).toEqual({ x: 48, y: -840, rotate: -8 })
    expect(Math.abs(AUTH_OUT.github.y)).toBeGreaterThanOrEqual(420)
    expect(AUTH_OUT.github.y).not.toBe(-160)
    expect(AUTH_SLOTS.github).toEqual({ x: 530, y: 368 })
    expect(AUTH_GITHUB_FACE).toEqual({ w: 220, h: 64 })
    expect(AUTH_SLOTS.github.x + AUTH_GITHUB_FACE.w / 2).toBe(STAGE.w / 2)
    expect(AUTH_SLOTS.github.y + AUTH_GITHUB_FACE.h / 2).toBe(STAGE.h / 2)
    expect(
      AUTH_SLOTS.github.y + AUTH_GITHUB_FACE.h + AUTH_OUT.github.y
    ).toBeLessThan(0)
  })
})

describe("slice-safe auth placement", () => {
  test("16:9 crops 40px off the top and bottom of the 1280×800 stage", () => {
    const wide = sliceVisibleRect(16 / 9)
    expect(wide.x).toBe(0)
    expect(wide.w).toBe(1280)
    expect(wide.h).toBeCloseTo(720)
    expect(wide.y).toBeCloseTo(40)
    expect(wide.y + wide.h).toBeCloseTo(760)
  })

  test("4:3 and 5:4 crop the sides", () => {
    const fourThree = sliceVisibleRect(4 / 3)
    expect(fourThree.y).toBe(0)
    expect(fourThree.h).toBe(800)
    expect(fourThree.w).toBeCloseTo(800 * (4 / 3))
    expect(fourThree.x).toBeCloseTo((1280 - fourThree.w) / 2)
    const fiveFour = sliceVisibleRect(5 / 4)
    expect(fiveFour.x).toBeCloseTo(140)
    expect(fiveFour.w).toBeCloseTo(1000)
    const same = sliceVisibleRect(STAGE.w / STAGE.h)
    expect(same.x).toBeCloseTo(0)
    expect(same.w).toBeCloseTo(1280)
  })

  test("github face is desk-center, inside the slice inset and 80px from the viewBox", () => {
    const safe = sliceSafeRect()
    expect(SLICE_MARGIN).toBe(20)
    expect(safe).toEqual({ x: 160, y: 60, right: 1120, bottom: 740 })
    const box = {
      x: AUTH_SLOTS.github.x,
      y: AUTH_SLOTS.github.y,
      right: AUTH_SLOTS.github.x + AUTH_GITHUB_FACE.w,
      bottom: AUTH_SLOTS.github.y + AUTH_GITHUB_FACE.h,
    }
    expect(box).toEqual({ x: 530, y: 368, right: 750, bottom: 432 })
    expect(box.x).toBeGreaterThanOrEqual(safe.x)
    expect(box.y).toBeGreaterThanOrEqual(safe.y)
    expect(box.right).toBeLessThanOrEqual(safe.right)
    expect(box.bottom).toBeLessThanOrEqual(safe.bottom)
    const edge = 80
    expect(box.x).toBeGreaterThanOrEqual(edge)
    expect(box.y).toBeGreaterThanOrEqual(edge)
    expect(STAGE.w - box.right).toBeGreaterThanOrEqual(edge)
    expect(STAGE.h - box.bottom).toBeGreaterThanOrEqual(edge)
    expect(SESSION_FROM).toEqual({ x: -OFF, y: 0 })
    expect(OFF).toBeGreaterThanOrEqual(480)
    expect(Math.abs(SESSION_FROM.x)).toBeGreaterThanOrEqual(420)
    const plate = {
      x: SESSION_SLOT.x,
      y: SESSION_SLOT.y,
      right: SESSION_SLOT.x + SESSION_FACE.w,
      bottom: SESSION_SLOT.y + SESSION_FACE.h,
    }
    expect(SESSION_FACE.w).toBeGreaterThanOrEqual(200)
    expect(SESSION_FACE.w).toBeLessThanOrEqual(220)
    expect(SESSION_FACE.h).toBeGreaterThanOrEqual(56)
    expect(SESSION_FACE.h).toBeLessThanOrEqual(64)
    expect(plate.x).toBeGreaterThanOrEqual(Math.max(safe.x, edge))
    expect(plate.y).toBeGreaterThanOrEqual(Math.max(safe.y, edge))
    expect(plate.right).toBeLessThanOrEqual(
      Math.min(safe.right, STAGE.w - edge)
    )
    expect(plate.bottom).toBeLessThanOrEqual(
      Math.min(safe.bottom, STAGE.h - edge)
    )
    const corners = [
      { x: 1116, y: 752, w: 148, h: 36 },
      { x: 924, y: 656, w: 176, h: 48 },
      { x: 980, y: 620, w: 176, h: 48 },
    ]
    for (const corner of corners) {
      expect({ x: corner.x, y: corner.y }).not.toEqual(AUTH_SLOTS.github)
      const distance = Math.hypot(
        corner.x + corner.w / 2 - STAGE.w / 2,
        corner.y + corner.h / 2 - STAGE.h / 2
      )
      expect(distance).toBeGreaterThan(300)
    }
    expect(1116 + 148).toBeGreaterThan(safe.right)
    expect(752 + 36).toBeGreaterThan(safe.bottom)
    const tight = sliceSafeRect([16 / 9], 0)
    expect(tight.y).toBeCloseTo(40)
    expect(tight.bottom).toBeCloseTo(760)
    const full = sliceSafeRect([], 0)
    expect(full).toEqual({ x: 0, y: 0, right: 1280, bottom: 800 })
  })
})

describe("expand and collapse timelines", () => {
  test("dialog enters from the slot and the compact piece only dims", () => {
    mountStage("svg")
    const tl = expandWidget("compose", null)
    const dialog = tl.getTweensOf("#desk-dialog")[0]
    expect(dialog).toBeTruthy()
    expect(dialog?.duration()).toBeCloseTo(EXPAND_DIALOG.duration)
    expect(dialog?.vars.ease).toBe(EXPAND_DIALOG.ease)
    expect(dialog?.vars.scale).toBe(EXPAND_DIALOG.toScale)
    expect(dialog?.vars.y).toBe(EXPAND_DIALOG.toY)
    expect(dialog?.vars.svgOrigin).toBe("320 168")
    const source = tl
      .getTweensOf("#widget-compose")
      .find((tween) => tween.vars.opacity === EXPAND_SOURCE.opacity)
    expect(source?.duration()).toBeCloseTo(EXPAND_SOURCE.duration)
    expect(source?.vars.ease).toBe(EXPAND_SOURCE.ease)
    expect(source?.vars.x).toBeUndefined()
    expect(source?.vars.y).toBeUndefined()
    tl.progress(1)
    const stage = document.getElementById("stage")
    expect(stage?.getAttribute("viewBox")).toBe("0 0 1280 800")
    expect(stage?.style.transform ?? "").toBe("")
  })

  test("switching restores the previous source and collapse reverses the dialog", () => {
    mountStage("svg")
    const opened = expandWidget("subs", "category")
    const restored = opened
      .getTweensOf("#widget-category")
      .find((tween) => tween.vars.opacity === 1)
    expect(restored?.duration()).toBeCloseTo(COLLAPSE_MOTION.duration)
    expect(restored?.vars.ease).toBe(COLLAPSE_MOTION.ease)
    opened.progress(1)
    const closed = collapseExpanded("subs")
    const dialog = closed.getTweensOf("#desk-dialog")[0]
    expect(dialog?.duration()).toBeCloseTo(COLLAPSE_MOTION.duration)
    expect(dialog?.vars.ease).toBe(COLLAPSE_MOTION.ease)
    expect(dialog?.vars.scale).toBe(EXPAND_DIALOG.fromScale)
    expect(dialog?.vars.y).toBe(EXPAND_DIALOG.fromY)
    expect(dialog?.vars.autoAlpha).toBe(0)
    const source = closed.getTweensOf("#widget-subs")[0]
    expect(source?.vars.opacity).toBe(1)
    closed.progress(1)
  })

  test("enter and exit move widgets by at least 420 and only lock pointer events", () => {
    mountStage("svg")
    const stage = document.getElementById("stage") as unknown as SVGElement
    let done = false
    const enter = playEnterRespectingMotion("login", () => {
      done = true
    })
    expect(stage.style.pointerEvents).toBe("none")
    const auth = enter.getTweensOf("#widget-auth-github")[0]
    expect(Math.abs(Number(auth?.vars.y))).toBeGreaterThanOrEqual(420)
    const content = enter.getTweensOf("#widget-category")[0]
    enter.pause()
    enter.time(content?.startTime() ?? 0)
    expect(
      Math.abs(Number(gsap.getProperty("#widget-category", "x")))
    ).toBeGreaterThanOrEqual(420)
    expect(
      Number(gsap.getProperty("#widget-session", "x"))
    ).toBeLessThanOrEqual(-420)
    enter.progress(1)
    expect(done).toBe(true)
    expect(stage.style.pointerEvents).toBe("auto")
    expect(getComputedStyle(stage).transform).toBe("none")

    done = false
    const exit = playExit("compose", () => {
      done = true
    })
    expect(stage.style.pointerEvents).toBe("none")
    const fly = exit
      .getTweensOf("#widget-compose")
      .find((tween) => Math.abs(Number(tween.vars.x ?? 0)) >= 420)
    expect(fly).toBeTruthy()
    const sessionOut = exit
      .getTweensOf("#widget-session")
      .find((tween) => Number(tween.vars.x) <= -420)
    expect(sessionOut?.vars.x).toBe(SESSION_FROM.x)
    exit.progress(1)
    expect(done).toBe(true)
    expect(stage.style.pointerEvents).toBe("auto")
  })

  test("refresh enter skips the auth fly-out and exit can run with nothing open", () => {
    mountStage("svg")
    const refresh = playEnterRespectingMotion("refresh", () => {})
    expect(refresh.getTweensOf("#widget-auth-github")).toHaveLength(0)
    expect(
      Math.abs(Number(gsap.getProperty("#widget-charges", "x")))
    ).toBeGreaterThanOrEqual(420)
    expect(
      Number(gsap.getProperty("#widget-session", "x"))
    ).toBeLessThanOrEqual(-420)
    expect(
      refresh.getTweensOf("#widget-session").some((tween) => tween.vars.x === 0)
    ).toBe(true)
    refresh.progress(1)
    expect(Number(gsap.getProperty("#widget-session", "x"))).toBeCloseTo(0)
    poseLoginOnly()
    poseRefreshStart()
    expect(Number(gsap.getProperty("#widget-session", "x"))).toBe(
      SESSION_FROM.x
    )
    expect(Number(gsap.getProperty("#widget-session", "x"))).not.toBe(0)
    const exit = playExit(null, () => {})
    expect(exit.getTweensOf("#desk-dialog")).toHaveLength(0)
    exit.progress(1)
  })

  test("lockStage ignores a missing stage, an html stand-in, and non-svg math", () => {
    mountStage("none")
    playExit(null, () => {}).progress(1)
    mountStage("html")
    const html = document.getElementById("stage") as HTMLElement
    playExit(null, () => {})
    expect(html.style.pointerEvents).toBe("none")
    gsap.globalTimeline.clear()
    mountStage("math")
    const math = document.getElementById("stage") as Element
    playExit(null, () => {}).progress(1)
    expect((math as HTMLElement).style?.pointerEvents ?? "").not.toBe("none")
  })

  test("reduced motion snaps timelines and skips ambient", () => {
    const restore = setReduce(true)
    try {
      mountStage("svg")
      let done = false
      playEnterRespectingMotion("login", () => {
        done = true
      })
      expect(done).toBe(true)
      playAmbient()
      expect(gsap.getTweensOf("#prop-cup")).toHaveLength(0)
      const state = setWidgetState("#widget-category", "act")
      expect(state.duration()).toBeCloseTo(0.08)
      expect(state.vars.ease).toBe("power1.out")
    } finally {
      restore()
    }
  })

  test("sticker states and pointer binding", () => {
    mountStage("svg")
    for (const state of WIDGET_FOUR_STATES) {
      const tween = setWidgetState("widget-subs", state)
      expect(
        document.getElementById("widget-subs")?.getAttribute("data-state")
      ).toBe(state)
      tween.progress(1)
    }
    setWidgetState("#missing-widget", "idle")
    const cleanup = bindWidgetStickers(
      document.getElementById("stage")!,
      () => false,
      () => null
    )
    const subs = document.getElementById("widget-subs")!
    const tape = document.getElementById("prop-tape-floral")!
    subs.dispatchEvent(new Event("pointerenter"))
    subs.dispatchEvent(new Event("pointerdown"))
    subs.dispatchEvent(new Event("pointerup"))
    subs.dispatchEvent(new Event("pointerleave"))
    tape.dispatchEvent(new Event("pointerenter"))
    tape.dispatchEvent(new Event("pointerdown"))
    tape.dispatchEvent(new Event("pointerup"))
    tape.dispatchEvent(new Event("pointerleave"))
    cleanup()

    const locked = bindWidgetStickers(
      document.getElementById("stage")!,
      () => true,
      () => "subs"
    )
    subs.dispatchEvent(new Event("pointerenter"))
    subs.dispatchEvent(new Event("pointerdown"))
    subs.dispatchEvent(new Event("pointerup"))
    subs.dispatchEvent(new Event("pointerleave"))
    tape.dispatchEvent(new Event("pointerdown"))
    tape.dispatchEvent(new Event("pointerup"))
    locked()

    let held: "subs" | null = "subs"
    const open = bindWidgetStickers(
      document.getElementById("stage")!,
      () => false,
      () => held
    )
    subs.dispatchEvent(new Event("pointerenter"))
    tape.dispatchEvent(new Event("pointerenter"))
    tape.dispatchEvent(new Event("pointerdown"))
    tape.dispatchEvent(new Event("pointerup"))
    tape.dispatchEvent(new Event("pointerleave"))
    const other = document.getElementById("widget-category")!
    other.dispatchEvent(new Event("pointerenter"))
    other.dispatchEvent(new Event("pointerleave"))
    subs.dispatchEvent(new Event("pointerleave"))
    subs.dispatchEvent(new Event("pointerdown"))
    subs.dispatchEvent(new Event("pointerup"))
    held = null
    other.dispatchEvent(new Event("pointerdown"))
    other.dispatchEvent(new Event("pointerup"))
    open()
    playAmbient()
    expect(gsap.getTweensOf("#prop-cup").length).toBeGreaterThan(0)
    expect(gsap.getTweensOf("#prop-plant").length).toBeGreaterThan(0)
    expect(gsap.getTweensOf("#light")).toHaveLength(0)
  })
})

function dragRoot() {
  const root = document.createElement("div")
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
  svg.id = "stage"
  svg.setAttribute("viewBox", "0 0 1280 800")
  svg.style.width = "1280px"
  svg.style.height = "800px"
  const slot = document.createElementNS("http://www.w3.org/2000/svg", "g")
  slot.id = "widget-compose-slot"
  slot.setAttribute("transform", "translate(320 168)")
  const widget = document.createElementNS("http://www.w3.org/2000/svg", "g")
  widget.id = "widget-compose"
  widget.setAttribute("data-interactive", "true")
  const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect")
  rect.setAttribute("x", "-20")
  rect.setAttribute("y", "-10")
  rect.setAttribute("width", "40")
  rect.setAttribute("height", "30")
  widget.appendChild(rect)
  slot.appendChild(widget)
  const auth = document.createElementNS("http://www.w3.org/2000/svg", "g")
  auth.id = "widget-auth-github"
  auth.setAttribute("data-interactive", "true")
  svg.appendChild(slot)
  svg.appendChild(auth)
  root.appendChild(svg)
  document.body.appendChild(root)
  return { root, widget, slot }
}

function pointer(
  type: string,
  target: EventTarget,
  x: number,
  y: number,
  pointerId = 1
) {
  target.dispatchEvent(
    new PointerEvent(type, { bubbles: true, clientX: x, clientY: y, pointerId })
  )
}

describe("drag threshold, clamp, and bounce", () => {
  test("8px splits a click from a drag", () => {
    expect(DRAG_THRESHOLD).toBe(8)
    expect(isDrag(0)).toBe(false)
    expect(isDrag(7.9)).toBe(false)
    expect(isDrag(8)).toBe(true)
    expect(readTranslate(null)).toBeNull()
    expect(readTranslate("matrix(1 0 0 1 0 0)")).toBeNull()
    expect(readTranslate("translate(1e999 2)")).toBeNull()
    expect(readTranslate("translate(12, 34)")).toEqual({ x: 12, y: 34 })
    expect(contentWidgetFromTarget(null)).toBeNull()
    expect(contentWidgetFromTarget(document.createTextNode("x"))).toBeNull()
    const plain = document.createElement("div")
    expect(contentWidgetFromTarget(plain)).toBeNull()
    plain.setAttribute("data-interactive", "true")
    plain.id = "prop-tape-floral"
    expect(contentWidgetFromTarget(plain)).toBeNull()
    plain.id = "widget-auth-github"
    expect(contentWidgetFromTarget(plain)).toBeNull()
    plain.id = "widget-compose"
    expect(contentWidgetFromTarget(plain)).toBe("compose")
  })

  test("clamp keeps the bbox inside and pins an oversized face", () => {
    const local = { x: -20, y: -10, w: 40, h: 30 }
    const visible = { x: 10, y: 20, w: 100, h: 80 }
    expect(clampSlot({ x: 40, y: 40 }, local, visible)).toEqual({
      x: 40,
      y: 40,
    })
    expect(clampSlot({ x: 0, y: 40 }, local, visible)).toEqual({ x: 30, y: 40 })
    expect(clampSlot({ x: 200, y: 40 }, local, visible)).toEqual({
      x: 90,
      y: 40,
    })
    expect(clampSlot({ x: 40, y: 0 }, local, visible)).toEqual({ x: 40, y: 30 })
    expect(clampSlot({ x: 40, y: 200 }, local, visible)).toEqual({
      x: 40,
      y: 80,
    })
    expect(
      clampSlot({ x: 0, y: 30 }, { x: 0, y: 0, w: 400, h: 10 }, visible)
    ).toEqual({ x: 10, y: 30 })
    expect(
      clampSlot({ x: 20, y: 0 }, { x: 0, y: 0, w: 10, h: 400 }, visible)
    ).toEqual({ x: 20, y: 20 })
    const detached = document.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    )
    detached.getScreenCTM = () => null
    expect(viewBoxPoint(detached, 4, 5)).toEqual({ x: 4, y: 5 })
    const { root } = dragRoot()
    const stage = root.querySelector("#stage") as SVGSVGElement
    expect(visibleStageRect(stage).w).toBeGreaterThan(0)
    stage.style.width = "0px"
    stage.style.height = "0px"
    expect(visibleStageRect(stage)).toEqual({ x: 0, y: 0, w: 1280, h: 800 })
  })

  test("bounce eases with power2 and skips a settled slot", () => {
    let done = false
    expect(
      bounceSlot(
        { x: 1, y: 2 },
        { x: 1, y: 2 },
        () => {},
        () => {
          done = true
        }
      )
    ).toBeNull()
    expect(done).toBe(true)
    const updates: Array<{ x: number; y: number }> = []
    let finished = false
    const tween = bounceSlot(
      { x: 0, y: 0 },
      { x: 10, y: 4 },
      (slot) => updates.push(slot),
      () => {
        finished = true
      }
    )
    expect(tween?.duration()).toBeCloseTo(DRAG_BOUNCE.duration)
    expect(tween?.vars.ease).toBe(DRAG_BOUNCE.ease)
    tween?.progress(1)
    expect(finished).toBe(true)
    expect(updates.at(-1)).toEqual({ x: 10, y: 4 })
    const restore = setReduce(true)
    const reduced = bounceSlot(
      { x: 0, y: 0 },
      { x: 3, y: 0 },
      () => {},
      () => {}
    )
    expect(reduced?.duration()).toBeCloseTo(0.08)
    reduced?.progress(1)
    restore()
    expect(SHADOW.ink).toBe("#2a2118")
    expect(SHADOW.desk).toEqual({ dy: 4, std: 5, opacity: 0.22 })
    expect(SHADOW.lift).toEqual({ dy: 10, std: 12, opacity: 0.26 })
    expect(SHADOW.float).toEqual({ dy: 14, std: 18, opacity: 0.28 })
  })

  test("binder ignores auth, small moves, and a missing stage", () => {
    const clicks: string[] = []
    const { root, widget, slot } = dragRoot()
    let enabled = true
    dragCleanups.push(
      bindContentDrag(root, {
        enabled: () => enabled,
        onDragStart: () => {},
        onDrag: () => {},
        onDragEnd: () => {},
        onCommit: () => {},
        onClick: (id) => clicks.push(id),
      })
    )
    const auth = root.querySelector("#widget-auth-github")!
    pointer("pointerdown", auth, 10, 10)
    pointer("pointermove", window, 80, 10)
    pointer("pointerup", auth, 80, 10)
    expect(clicks).toEqual([])
    pointer("pointerdown", widget, 10, 10)
    pointer("pointermove", window, 16, 10)
    pointer("pointerup", window, 16, 10)
    expect(clicks).toEqual(["compose"])
    pointer("pointerup", widget, 10, 10)
    expect(clicks).toEqual(["compose", "compose"])
    pointer("pointercancel", widget, 10, 10)
    pointer("pointerup", root, 10, 10)
    expect(clicks).toEqual(["compose", "compose"])
    pointer("pointerdown", widget, 22, 22)
    pointer("pointercancel", window, 22, 22)
    expect(clicks).toEqual(["compose", "compose"])
    enabled = false
    pointer("pointerdown", widget, 10, 10)
    pointer("pointerup", widget, 40, 10)
    expect(clicks).toHaveLength(2)
    enabled = true
    const stage = root.querySelector("#stage")!
    stage.id = "gone"
    pointer("pointerdown", widget, 10, 10)
    pointer("pointerup", widget, 10, 10)
    expect(clicks).toHaveLength(3)
    stage.id = "stage"
    slot.id = "missing-slot"
    pointer("pointerdown", widget, 12, 12)
    pointer("pointerup", widget, 12, 12)
    expect(clicks).toHaveLength(4)
    slot.id = "widget-compose-slot"
    slot.setAttribute("transform", "rotate(4)")
    pointer("pointerdown", widget, 14, 14)
    pointer("pointerup", widget, 14, 14)
    expect(clicks).toHaveLength(5)
  })

  test("binder drags, ignores a second pointer, and commits when the node is gone", () => {
    const commits: Array<{ x: number; y: number }> = []
    let ended = 0
    const { root, widget } = dragRoot()
    dragCleanups.push(
      bindContentDrag(root, {
        enabled: () => true,
        onDragStart: () => {},
        onDrag: () => {},
        onDragEnd: () => {
          ended += 1
        },
        onCommit: (_id, next) => commits.push(next),
        onClick: () => {},
      })
    )
    pointer("pointerdown", widget, 200, 200, 7)
    pointer("pointermove", window, 240, 200, 7)
    pointer("pointerup", window, 240, 200, 7)
    expect(ended).toBe(1)
    expect(commits).toHaveLength(1)
    pointer("pointerdown", widget, 100, 100, 1)
    pointer("pointerdown", widget, 100, 100, 2)
    pointer("pointermove", window, 140, 100, 2)
    pointer("pointermove", window, 104, 100, 1)
    expect(commits).toHaveLength(1)
    pointer("pointermove", window, 140, 100, 1)
    pointer("pointermove", window, 160, 100, 1)
    const stage = root.querySelector("#stage")!
    stage.id = "gone"
    pointer("pointermove", window, 180, 100, 1)
    pointer("pointerup", window, 180, 100, 1)
    expect(ended).toBe(2)
    expect(commits).toHaveLength(2)
    stage.id = "stage"
    pointer("pointerdown", widget, 30, 30, 3)
    pointer("pointerup", window, 90, 30, 4)
    expect(commits).toHaveLength(2)
    pointer("pointerup", window, 30, 30, 3)
    expect(ended).toBe(2)
    pointer("pointerdown", widget, 40, 40, 5)
    pointer("pointermove", window, 80, 40, 5)
    widget.remove()
    pointer("pointerup", window, 80, 40, 5)
    expect(ended).toBe(3)
    expect(commits).toHaveLength(3)
  })
})
