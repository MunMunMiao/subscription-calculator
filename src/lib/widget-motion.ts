import { gsap } from "@/lib/gsap"
import {
  AUTH_WIDGET_IDS,
  CONTENT_SCENE_IDS,
  WIDGET_SCENE_IDS,
  isContentWidgetId,
  type AuthWidgetId,
  type ContentWidgetId,
  type WidgetFourState,
} from "@/lib/widget-machine"
import { CONTENT_SLOTS, type WidgetSlot } from "@/lib/widget-slots"

export { CONTENT_SLOTS }

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

/** Desk-center idle home. Face bbox stays ≥80px inside the 1280×800 viewBox. */
export const AUTH_SLOTS = {
  github: { x: 530, y: 368 },
} as const satisfies Record<AuthWidgetId, { x: number; y: number }>

export const AUTH_GITHUB_FACE = { w: 220, h: 64 } as const

/** Lower-left paper nameplate. Inside the slice inset and ≥80 from the viewBox. */
export const SESSION_SLOT = { x: 176, y: 656 } as const
export const SESSION_FACE = { w: 210, h: 60 } as const
export const SESSION_SELECTOR = "#widget-session"
/** Left off-canvas. Same magnitude as content (`OFF`), never a slot pop-in. */
export const SESSION_FROM = { x: -OFF, y: 0 } as const

/** Per-auth-widget off-canvas. From y=368, h=64, y=-840 still clears the camera. */
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

/** Pointer travel in CSS pixels. Under this, the gesture is a click. */
export const DRAG_THRESHOLD = 8

export const DRAG_BOUNCE = {
  duration: 0.32,
  ease: "power2.out",
} as const

/** Soft ink shadows. dx stays 0 so the edge is not a hard black offset. */
export const SHADOW = {
  ink: "#2a2118",
  desk: { dy: 4, std: 5, opacity: 0.22 },
  lift: { dy: 10, std: 12, opacity: 0.26 },
  float: { dy: 14, std: 18, opacity: 0.28 },
} as const

export function isDrag(distance: number) {
  return distance >= DRAG_THRESHOLD
}

export const FROM = {
  "#widget-category": { x: -OFF, y: -80 },
  "#widget-subs": { x: OFF, y: -60 },
  "#widget-charges": { x: -OFF, y: 120 },
  "#widget-compose": { x: OFF, y: 140 },
} as const

const DESK_FLY = [
  ...CONTENT_SELECTORS.map((selector) => ({
    selector,
    from: FROM[selector],
  })),
  { selector: SESSION_SELECTOR, from: SESSION_FROM },
]

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

function placeSession(values: gsap.TweenVars) {
  if (!document.getElementById("widget-session")) return
  gsap.set(SESSION_SELECTOR, values)
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
  placeSession({
    autoAlpha: 0,
    x: SESSION_FROM.x,
    y: SESSION_FROM.y,
    rotate: 0,
    scale: 1,
  })
  parkDialog()
}

function arrive(tl: gsap.core.Timeline, label: string) {
  DESK_FLY.forEach((item, i) => {
    tl.fromTo(
      item.selector,
      {
        x: item.from.x,
        y: item.from.y,
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
      `${label}+=${i * 0.08}`
    )
  })
}

function depart(tl: gsap.core.Timeline, label: string) {
  DESK_FLY.forEach((item, i) => {
    tl.to(
      item.selector,
      {
        x: item.from.x,
        y: item.from.y,
        rotate: i % 2 ? 6 : -6,
        autoAlpha: 1,
        duration: 0.5,
        ease: "power1.in",
      },
      `${label}+=${i * 0.05}`
    )
  })
  tl.set(
    DESK_FLY.map((item) => item.selector),
    { autoAlpha: 0 }
  )
}

export function poseRefreshStart() {
  for (const widget of AUTH_WIDGETS) {
    gsap.set(widget.selector, {
      autoAlpha: 0,
      x: 0,
      y: widget.out.y,
    })
  }
  placeSession({
    autoAlpha: 1,
    x: SESSION_FROM.x,
    y: SESSION_FROM.y,
    rotate: -5,
    scale: 0.96,
  })
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
  arrive(tl, "flyIn")

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
  arrive(tl, "flyIn")

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
  depart(tl, "flyOut")

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

export function readTranslate(raw: string | null): WidgetSlot | null {
  if (!raw) return null
  const match = /translate\(\s*([-\d.eE+]+)[\s,]+([-\d.eE+]+)\s*\)/.exec(raw)
  if (!match) return null
  const x = Number(match[1])
  const y = Number(match[2])
  if (!Number.isFinite(x) || !Number.isFinite(y)) return null
  return { x, y }
}

export function contentWidgetFromTarget(
  target: EventTarget | null
): ContentWidgetId | null {
  if (!(target instanceof Element)) return null
  const widget = target.closest("[data-interactive='true']")
  if (!widget?.id.startsWith("widget-")) return null
  const id = widget.id.slice("widget-".length)
  return isContentWidgetId(id) ? id : null
}

export function viewBoxPoint(
  stage: SVGSVGElement,
  clientX: number,
  clientY: number
) {
  const matrix = stage.getScreenCTM()
  if (!matrix) return { x: clientX, y: clientY }
  const point = stage.createSVGPoint()
  point.x = clientX
  point.y = clientY
  const local = point.matrixTransform(matrix.inverse())
  return { x: local.x, y: local.y }
}

export function visibleStageRect(stage: SVGSVGElement) {
  const rect = stage.getBoundingClientRect()
  const aspect = rect.width / rect.height
  if (!(aspect > 0)) return { x: 0, y: 0, w: STAGE.w, h: STAGE.h }
  return sliceVisibleRect(aspect)
}

export function clampSlot(
  slot: WidgetSlot,
  local: { x: number; y: number; w: number; h: number },
  visible: { x: number; y: number; w: number; h: number }
): WidgetSlot {
  let x = slot.x
  let y = slot.y
  if (local.w >= visible.w) {
    x = visible.x - local.x
  } else {
    const left = x + local.x
    const right = left + local.w
    const visRight = visible.x + visible.w
    if (left < visible.x) x += visible.x - left
    else if (right > visRight) x -= right - visRight
  }
  if (local.h >= visible.h) {
    y = visible.y - local.y
  } else {
    const top = y + local.y
    const bottom = top + local.h
    const visBottom = visible.y + visible.h
    if (top < visible.y) y += visible.y - top
    else if (bottom > visBottom) y -= bottom - visBottom
  }
  return { x, y }
}

export function bounceSlot(
  from: WidgetSlot,
  to: WidgetSlot,
  onUpdate: (slot: WidgetSlot) => void,
  onComplete: () => void
) {
  if (from.x === to.x && from.y === to.y) {
    onComplete()
    return null
  }
  const proxy = { x: from.x, y: from.y }
  return gsap.to(proxy, {
    x: to.x,
    y: to.y,
    duration: reduceMotion() ? 0.08 : DRAG_BOUNCE.duration,
    ease: DRAG_BOUNCE.ease,
    onUpdate: () => onUpdate({ x: proxy.x, y: proxy.y }),
    onComplete,
  })
}

export function bindContentDrag(
  root: HTMLElement,
  api: {
    enabled: () => boolean
    onDragStart: (id: ContentWidgetId) => void
    onDrag: (id: ContentWidgetId, slot: WidgetSlot) => void
    onDragEnd: () => void
    onCommit: (id: ContentWidgetId, slot: WidgetSlot) => void
    onClick: (id: ContentWidgetId) => void
  }
) {
  let gesture: {
    id: ContentWidgetId
    pointer: number
    startClient: WidgetSlot
    startSlot: WidgetSlot
    last: WidgetSlot
    dragged: boolean
  } | null = null

  function onDown(event: PointerEvent) {
    if (!api.enabled() || gesture) return
    const id = contentWidgetFromTarget(event.target)
    if (!id) return
    const stage = root.querySelector("#stage")
    if (!(stage instanceof SVGSVGElement)) return
    const slotNode = root.querySelector(`#widget-${id}-slot`)
    if (!(slotNode instanceof SVGGElement)) return
    const start = readTranslate(slotNode.getAttribute("transform"))
    if (!start) return
    gesture = {
      id,
      pointer: event.pointerId,
      startClient: { x: event.clientX, y: event.clientY },
      startSlot: start,
      last: start,
      dragged: false,
    }
  }

  function onMove(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.pointer) return
    const stage = root.querySelector("#stage")
    if (!(stage instanceof SVGSVGElement)) return
    const start = viewBoxPoint(
      stage,
      gesture.startClient.x,
      gesture.startClient.y
    )
    const now = viewBoxPoint(stage, event.clientX, event.clientY)
    const distance = Math.hypot(
      event.clientX - gesture.startClient.x,
      event.clientY - gesture.startClient.y
    )
    if (!gesture.dragged && !isDrag(distance)) return
    if (!gesture.dragged) {
      gesture.dragged = true
      gsap.set(`#widget-${gesture.id}`, {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        overwrite: "auto",
      })
      api.onDragStart(gesture.id)
    }
    const next = {
      x: gesture.startSlot.x + (now.x - start.x),
      y: gesture.startSlot.y + (now.y - start.y),
    }
    gesture.last = next
    api.onDrag(gesture.id, next)
  }

  function onUp(event: PointerEvent) {
    if (!gesture || event.pointerId !== gesture.pointer) {
      if (!gesture && event.type === "pointerup" && api.enabled()) {
        const id = contentWidgetFromTarget(event.target)
        if (id) api.onClick(id)
      }
      return
    }
    const current = gesture
    gesture = null
    if (!current.dragged) {
      if (event.type === "pointerup") api.onClick(current.id)
      return
    }
    api.onDragEnd()
    const stage = root.querySelector("#stage")
    const widget = root.querySelector(`#widget-${current.id}`)
    if (
      !(stage instanceof SVGSVGElement) ||
      !(widget instanceof SVGGraphicsElement)
    ) {
      api.onCommit(current.id, current.last)
      return
    }
    const box = widget.getBBox()
    const clamped = clampSlot(
      current.last,
      { x: box.x, y: box.y, w: box.width, h: box.height },
      visibleStageRect(stage)
    )
    bounceSlot(
      current.last,
      clamped,
      (slot) => api.onDrag(current.id, slot),
      () => api.onCommit(current.id, clamped)
    )
  }

  root.addEventListener("pointerdown", onDown)
  window.addEventListener("pointermove", onMove)
  window.addEventListener("pointerup", onUp)
  window.addEventListener("pointercancel", onUp)
  return () => {
    gesture = null
    root.removeEventListener("pointerdown", onDown)
    window.removeEventListener("pointermove", onMove)
    window.removeEventListener("pointerup", onUp)
    window.removeEventListener("pointercancel", onUp)
  }
}
