import { gsap } from "@/lib/gsap"
import {
  AUTH_WIDGET_IDS,
  CONTENT_SCENE_IDS,
  WIDGET_SCENE_IDS,
  type AuthWidgetId,
  type ContentWidgetId,
  type WidgetFourState,
} from "@/lib/widget-machine"

export const JUST_AUTHED_KEY = "techo-just-authed"

export const CONTENT_SELECTORS = [
  "#widget-category",
  "#widget-subs",
  "#widget-charges",
  "#widget-compose",
] as const

export const AUTH_SELECTORS = AUTH_WIDGET_IDS.map(
  (id) => `#${WIDGET_SCENE_IDS[id]}`
)

export const STAGE = { w: 1280, h: 800 } as const
export const OFF = 480

/**
 * `preserveAspectRatio="xMidYMid slice"` crops the 16:10 stage on other
 * frames. 16:9 crops top/bottom; 4:3 and 5:4 crop the sides. The auth widget
 * must sit inside the intersection, inset so it is an object on the wood.
 */
export const SLICE_ASPECTS = [16 / 9, 4 / 3, 5 / 4] as const
export const SLICE_MARGIN = 20

export function sliceVisibleRect(aspect: number) {
  const stageAspect = STAGE.w / STAGE.h
  if (aspect > stageAspect) {
    const h = STAGE.w / aspect
    const crop = (STAGE.h - h) / 2
    return { x: 0, y: crop, w: STAGE.w, h }
  }
  const w = STAGE.h * aspect
  const crop = (STAGE.w - w) / 2
  return { x: crop, y: 0, w, h: STAGE.h }
}

export function sliceSafeRect(
  aspects: readonly number[] = SLICE_ASPECTS,
  margin = SLICE_MARGIN
) {
  let left = 0
  let top = 0
  let right: number = STAGE.w
  let bottom: number = STAGE.h
  for (const aspect of aspects) {
    const rect = sliceVisibleRect(aspect)
    left = Math.max(left, rect.x)
    top = Math.max(top, rect.y)
    right = Math.min(right, rect.x + rect.w)
    bottom = Math.min(bottom, rect.y + rect.h)
  }
  return {
    x: left + margin,
    y: top + margin,
    right: right - margin,
    bottom: bottom - margin,
  }
}

/** Content slots. Dialog scale origin is the slot center; the piece stays here. */
export const CONTENT_SLOTS = {
  category: { x: 216, y: 416 },
  subs: { x: 1040, y: 248 },
  charges: { x: 640, y: 608 },
  compose: { x: 320, y: 168 },
} as const satisfies Record<ContentWidgetId, { x: number; y: number }>

/** On the wood, inside the slice-safe inset. Not flush to the viewport corner. */
export const AUTH_SLOTS = {
  github: { x: 924, y: 656 },
} as const satisfies Record<AuthWidgetId, { x: number; y: number }>

export const AUTH_GITHUB_FACE = { w: 176, h: 48 } as const

/** Per-auth-widget off-canvas. Must clear the 800h camera. */
export const AUTH_OUT = {
  github: { x: 48, y: -840, rotate: -8 },
} as const satisfies Record<
  AuthWidgetId,
  { x: number; y: number; rotate: number }
>

/** Auth family animated by enter/exit. Not corner chrome. */
export const AUTH_WIDGETS = AUTH_WIDGET_IDS.map((id) => ({
  id,
  selector: `#${WIDGET_SCENE_IDS[id]}`,
  slot: AUTH_SLOTS[id],
  out: AUTH_OUT[id],
}))

export const EXPAND_DIALOG = {
  duration: 0.42,
  ease: "power2.out",
  fromScale: 0.92,
  fromY: 10,
  toScale: 1,
  toY: 0,
} as const

export const EXPAND_SOURCE = {
  duration: 0.28,
  ease: "power2.out",
  opacity: 0.4,
} as const

export const COLLAPSE_MOTION = {
  duration: 0.32,
  ease: "power2.in",
} as const

export const FROM = {
  "#widget-category": { x: -OFF, y: -80 },
  "#widget-subs": { x: OFF, y: -60 },
  "#widget-charges": { x: -OFF, y: 120 },
  "#widget-compose": { x: OFF, y: 140 },
} as const

export const WIDGET_FOUR = {
  idle: { y: 0, rotate: 0, scale: 1 },
  hover: { y: -2, rotate: -0.8, scale: 1.01 },
  act: { y: 1, rotate: 0, scale: 0.98 },
  held: { y: -15, rotate: -3, scale: 1.06 },
} as const

export const FOUR_DUR = {
  hover: 0.14,
  act: 0.09,
  held: 0.21,
  idle: 0.22,
} as const

export const SECONDARY_TAPE_IDS = [
  "prop-tape-floral",
  "prop-tape-blue",
  "prop-tape-gingham",
] as const

function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function skipIfReduce(tl: gsap.core.Timeline) {
  if (reduceMotion()) tl.progress(1)
  return tl
}

/** HARD BAN: never tween #stage (no scale/translate/zoom/tilt/viewBox). */
function lockStage(lock: boolean) {
  const stage = document.querySelector("#stage")
  if (!(stage instanceof SVGElement) && !(stage instanceof HTMLElement)) return
  stage.style.pointerEvents = lock ? "none" : "auto"
}

export function setWidgetState(id: string, state: WidgetFourState) {
  const sel = id.startsWith("#") ? id : `#${id}`
  const node = document.querySelector(sel)
  if (node instanceof Element) {
    node.setAttribute("data-state", state)
  }
  const dur = reduceMotion() ? 0.08 : FOUR_DUR[state]
  return gsap.to(sel, {
    ...WIDGET_FOUR[state],
    duration: dur,
    ease: state === "act" ? "power1.out" : "power2.inOut",
    overwrite: "auto",
  })
}

function parkDialog() {
  gsap.set("#desk-dialog", {
    autoAlpha: 0,
    scale: EXPAND_DIALOG.fromScale,
    y: EXPAND_DIALOG.fromY,
  })
}

export function poseLoginOnly() {
  for (const widget of AUTH_WIDGETS) {
    gsap.set(widget.selector, {
      autoAlpha: 1,
      x: 0,
      y: 0,
      rotate: 0,
      scale: 1,
    })
  }
  gsap.set(CONTENT_SELECTORS, {
    autoAlpha: 0,
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
  })
  parkDialog()
}

export function poseRefreshStart() {
  for (const widget of AUTH_WIDGETS) {
    gsap.set(widget.selector, {
      autoAlpha: 0,
      x: 0,
      y: widget.out.y,
    })
  }
  parkDialog()
}

export function playEnterAfterLogin(onDone: () => void) {
  lockStage(true)
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onComplete: () => {
      lockStage(false)
      onDone()
    },
  })

  tl.addLabel("loginOut")
  for (const widget of AUTH_WIDGETS) {
    tl.to(
      widget.selector,
      {
        ...widget.out,
        autoAlpha: 1,
        duration: 0.65,
        ease: "power1.out",
      },
      "loginOut"
    )
  }
  for (const widget of AUTH_WIDGETS) {
    tl.set(
      widget.selector,
      {
        autoAlpha: 0,
        x: 0,
        y: widget.out.y,
        rotate: 0,
      },
      "loginOut+=0.65"
    )
  }

  tl.addLabel("flyIn", "loginOut+=0.28")
  CONTENT_SELECTORS.forEach((sel, i) => {
    const from = FROM[sel]
    tl.fromTo(
      sel,
      {
        x: from.x,
        y: from.y,
        rotate: i % 2 ? 5 : -5,
        scale: 0.96,
        autoAlpha: 1,
      },
      {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        duration: 0.6,
        ease: "power1.out",
      },
      `flyIn+=${i * 0.08}`
    )
  })

  return skipIfReduce(tl)
}

export function playEnterLoggedInRefresh(onDone: () => void) {
  lockStage(true)
  poseRefreshStart()
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onComplete: () => {
      lockStage(false)
      onDone()
    },
  })

  tl.addLabel("flyIn")
  CONTENT_SELECTORS.forEach((sel, i) => {
    const from = FROM[sel]
    tl.fromTo(
      sel,
      {
        x: from.x,
        y: from.y,
        rotate: i % 2 ? 5 : -5,
        scale: 0.96,
        autoAlpha: 1,
      },
      {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        duration: 0.6,
        ease: "power1.out",
      },
      `flyIn+=${i * 0.08}`
    )
  })

  return skipIfReduce(tl)
}

export function playEnterRespectingMotion(
  kind: "login" | "refresh",
  onDone: () => void
) {
  return kind === "login"
    ? playEnterAfterLogin(onDone)
    : playEnterLoggedInRefresh(onDone)
}

export function playExit(
  expandedId: ContentWidgetId | null,
  onDone: () => void
) {
  lockStage(true)
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onComplete: () => {
      lockStage(false)
      onDone()
    },
  })

  if (expandedId) tl.add(collapseExpanded(expandedId))
  tl.addLabel("flyOut")
  CONTENT_SELECTORS.forEach((sel, i) => {
    const to = FROM[sel]
    tl.to(
      sel,
      {
        x: to.x,
        y: to.y,
        rotate: i % 2 ? 6 : -6,
        autoAlpha: 1,
        duration: 0.5,
        ease: "power1.in",
      },
      `flyOut+=${i * 0.05}`
    )
  })
  tl.set(CONTENT_SELECTORS, { autoAlpha: 0 })

  tl.addLabel("loginIn", "flyOut+=0.4")
  for (const widget of AUTH_WIDGETS) {
    tl.set(
      widget.selector,
      {
        autoAlpha: 1,
        x: widget.out.x,
        y: widget.out.y,
        rotate: -6,
        scale: 1,
      },
      "loginIn"
    )
    tl.to(
      widget.selector,
      {
        x: 0,
        y: 0,
        rotate: 0,
        duration: 0.6,
        ease: "power1.out",
      },
      "loginIn"
    )
  }

  return skipIfReduce(tl)
}

function dialogOrigin(id: ContentWidgetId) {
  const slot = CONTENT_SLOTS[id]
  return `${slot.x} ${slot.y}`
}

/** Dialog enters from the source slot center. The compact SVG stays in its slot. */
export function expandWidget(
  id: ContentWidgetId,
  previous: ContentWidgetId | null
) {
  const source = `#${WIDGET_SCENE_IDS[id]}`
  const origin = dialogOrigin(id)
  const tl = gsap.timeline()
  if (previous && previous !== id) {
    tl.to(
      `#${WIDGET_SCENE_IDS[previous]}`,
      {
        opacity: 1,
        duration: COLLAPSE_MOTION.duration,
        ease: COLLAPSE_MOTION.ease,
        overwrite: "auto",
      },
      0
    )
  }
  tl.to(
    source,
    {
      opacity: EXPAND_SOURCE.opacity,
      duration: EXPAND_SOURCE.duration,
      ease: EXPAND_SOURCE.ease,
      overwrite: "auto",
    },
    0
  )
  tl.fromTo(
    "#desk-dialog",
    {
      svgOrigin: origin,
      scale: EXPAND_DIALOG.fromScale,
      y: EXPAND_DIALOG.fromY,
      autoAlpha: previous ? 1 : 0,
    },
    {
      svgOrigin: origin,
      scale: EXPAND_DIALOG.toScale,
      y: EXPAND_DIALOG.toY,
      autoAlpha: 1,
      duration: EXPAND_DIALOG.duration,
      ease: EXPAND_DIALOG.ease,
      overwrite: "auto",
    },
    0
  )
  return skipIfReduce(tl)
}

export function collapseExpanded(id: ContentWidgetId) {
  const origin = dialogOrigin(id)
  const tl = gsap.timeline()
  tl.to(
    "#desk-dialog",
    {
      svgOrigin: origin,
      scale: EXPAND_DIALOG.fromScale,
      y: EXPAND_DIALOG.fromY,
      autoAlpha: 0,
      duration: COLLAPSE_MOTION.duration,
      ease: COLLAPSE_MOTION.ease,
      overwrite: "auto",
    },
    0
  )
  tl.to(
    `#${WIDGET_SCENE_IDS[id]}`,
    {
      opacity: 1,
      duration: COLLAPSE_MOTION.duration,
      ease: COLLAPSE_MOTION.ease,
      overwrite: "auto",
    },
    0
  )
  return skipIfReduce(tl)
}

export function playAmbient() {
  if (reduceMotion()) return
  // Motion nodes only — slot translates stay on #prop-*-slot parents.
  gsap.to("#prop-cup", {
    y: "-=2",
    opacity: 0.92,
    duration: 3.5,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  })
  gsap.to("#prop-plant", {
    scaleY: 1.02,
    transformOrigin: "50% 100%",
    duration: 4,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  })
  gsap.to("#light", {
    opacity: 0.85,
    duration: 4.5,
    yoyo: true,
    repeat: -1,
    ease: "sine.inOut",
  })
}

export function bindWidgetStickers(
  root: Element,
  locked: () => boolean,
  held: () => ContentWidgetId | null
) {
  const nodes = root.querySelectorAll<Element>("[data-interactive='true']")
  const cleanups: Array<() => void> = []

  for (const node of nodes) {
    const id = node.id
    const isTape = (SECONDARY_TAPE_IDS as readonly string[]).includes(id)
    const enter = () => {
      if (locked()) return
      if (!isTape && held()) return
      setWidgetState(id, "hover")
    }
    const leave = () => {
      if (locked()) return
      if (!isTape && held() && `widget-${held()}` === id) return
      setWidgetState(id, "idle")
    }
    const down = () => {
      if (locked()) return
      if (!isTape && held() && `widget-${held()}` === id) return
      setWidgetState(id, "act")
    }
    const up = () => {
      if (locked()) return
      if (!isTape && held() && `widget-${held()}` === id) return
      setWidgetState(id, "hover")
    }
    node.addEventListener("pointerenter", enter)
    node.addEventListener("pointerleave", leave)
    node.addEventListener("pointerdown", down)
    node.addEventListener("pointerup", up)
    cleanups.push(() => {
      node.removeEventListener("pointerenter", enter)
      node.removeEventListener("pointerleave", leave)
      node.removeEventListener("pointerdown", down)
      node.removeEventListener("pointerup", up)
    })
  }

  return () => {
    for (const cleanup of cleanups) cleanup()
  }
}

export { CONTENT_SCENE_IDS }
