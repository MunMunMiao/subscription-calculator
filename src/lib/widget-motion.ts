import { gsap } from "@/lib/gsap"
import {
  CONTENT_SCENE_IDS,
  WIDGET_SCENE_IDS,
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

export const FROM = {
  "#widget-category": { x: -120, y: -40 },
  "#widget-subs": { x: 120, y: -30 },
  "#widget-charges": { x: -80, y: 90 },
  "#widget-compose": { x: 100, y: 80 },
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

function lockStage(lock: boolean) {
  const stage = document.querySelector("#stage")
  if (!(stage instanceof SVGElement) && !(stage instanceof HTMLElement)) return
  stage.style.pointerEvents = lock ? "none" : "auto"
}

function bringToFront(id: string) {
  const node = document.getElementById(id)
  const slot = node?.parentElement
  slot?.parentElement?.appendChild(slot)
}

export function setWidgetState(id: string, state: WidgetFourState) {
  const sel = id.startsWith("#") ? id : `#${id}`
  const node = document.querySelector(sel)
  if (node instanceof Element) {
    node.setAttribute("data-state", state)
  }
  const dur = reduceMotion() ? 0.08 : (FOUR_DUR[state] ?? 0.2)
  return gsap.to(sel, {
    ...WIDGET_FOUR[state],
    duration: dur,
    ease: state === "act" ? "power1.out" : "power2.inOut",
    overwrite: "auto",
  })
}

export function poseLoginOnly() {
  gsap.set("#widget-login", {
    autoAlpha: 1,
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
  })
  gsap.set(CONTENT_SELECTORS, {
    autoAlpha: 0,
    x: 0,
    y: 0,
    rotate: 0,
    scale: 1,
  })
}

export function poseRefreshStart() {
  gsap.set("#widget-login", { autoAlpha: 0, x: 0, y: -200 })
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
    .to(
      "#widget-login",
      {
        y: -160,
        x: 40,
        rotate: -6,
        autoAlpha: 1,
        duration: 0.55,
        ease: "power1.out",
      },
      "loginOut"
    )
    .set("#widget-login", { autoAlpha: 0, x: 0, y: -200 })

  tl.addLabel("flyIn", "loginOut+=0.25")
  CONTENT_SELECTORS.forEach((sel, i) => {
    const from = FROM[sel]
    tl.fromTo(
      sel,
      {
        x: from.x,
        y: from.y,
        rotate: i % 2 ? 4 : -4,
        scale: 0.96,
        autoAlpha: 1,
      },
      {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        duration: 0.55,
        ease: "power1.out",
      },
      `flyIn+=${i * 0.07}`
    )
  })

  return skipIfReduce(tl)
}

export function playEnterLoggedInRefresh(onDone: () => void) {
  lockStage(true)
  gsap.set("#widget-login", { autoAlpha: 0, x: 0, y: -200 })
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
        rotate: i % 2 ? 4 : -4,
        scale: 0.96,
        autoAlpha: 1,
      },
      {
        x: 0,
        y: 0,
        rotate: 0,
        scale: 1,
        duration: 0.55,
        ease: "power1.out",
      },
      `flyIn+=${i * 0.07}`
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

export function playExit(heldId: string | null, onDone: () => void) {
  lockStage(true)
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onComplete: () => {
      lockStage(false)
      onDone()
    },
  })

  if (heldId) {
    tl.add(setWidgetState(heldId, "idle"), 0)
  }

  tl.addLabel("flyOut", heldId ? "+=0.05" : 0)
  CONTENT_SELECTORS.forEach((sel, i) => {
    const to = FROM[sel]
    tl.to(
      sel,
      {
        x: to.x,
        y: to.y,
        rotate: i % 2 ? 5 : -5,
        duration: 0.45,
        ease: "power1.in",
      },
      `flyOut+=${i * 0.05}`
    )
  })
  tl.set(CONTENT_SELECTORS, { autoAlpha: 0, x: 0, y: 0 })

  tl.addLabel("loginIn", "flyOut+=0.35")
    .set("#widget-login", { autoAlpha: 1, x: 0, y: -160, rotate: -4 })
    .to(
      "#widget-login",
      {
        y: 0,
        rotate: 0,
        scale: 1,
        duration: 0.55,
        ease: "power1.out",
      },
      "loginIn"
    )

  return skipIfReduce(tl)
}

export function playPickUp(
  id: ContentWidgetId,
  previous: ContentWidgetId | null
) {
  const sel = `#${WIDGET_SCENE_IDS[id]}`
  const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } })
  if (previous && previous !== id) {
    tl.add(setWidgetState(WIDGET_SCENE_IDS[previous], "idle"))
  }
  tl.add(() => {
    bringToFront(WIDGET_SCENE_IDS[id])
  })
  tl.add(setWidgetState(WIDGET_SCENE_IDS[id], "held"))
  CONTENT_SELECTORS.forEach((other) => {
    if (other === sel) {
      tl.to(other, { opacity: 1, duration: 0.2 }, "<")
    } else {
      tl.to(other, { opacity: 0.72, duration: 0.2 }, "<")
    }
  })
  // #prop-pen is the motion node; slot translate lives on #prop-pen-slot.
  if (id === "compose") {
    tl.to("#prop-pen", { y: 4, rotate: -4, duration: 0.21 }, 0)
  } else {
    tl.to("#prop-pen", { y: 0, rotate: 0, duration: 0.21 }, 0)
  }
  return skipIfReduce(tl)
}

export function playPutDown(id: ContentWidgetId) {
  const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } })
  tl.add(setWidgetState(WIDGET_SCENE_IDS[id], "idle"))
  tl.to(CONTENT_SELECTORS, { opacity: 1, duration: 0.2 }, 0)
  tl.to("#prop-pen", { y: 0, rotate: 0, duration: 0.21 }, 0)
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
