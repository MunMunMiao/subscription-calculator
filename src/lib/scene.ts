import { gsap } from "@/lib/gsap"
import {
  SECONDARY_TAPE_SELECTORS,
  type BrowseTab,
  type SceneName,
  type StickerState,
} from "@/lib/scene-machine"

export type {
  BrowseTab,
  InkGrowState,
  SceneEvent,
  SceneName,
  SceneSnapshot,
  StickerState,
} from "@/lib/scene-machine"
export {
  INK_GROW_STATES,
  SECONDARY_TAPE_IDS,
  SECONDARY_TAPE_SELECTORS,
  STICKER_FOUR_STATES,
  bootScene,
  isSceneLocked,
  reduceScene,
} from "@/lib/scene-machine"

export const JUST_AUTHED_KEY = "techo-just-authed"

export const STICKER = {
  idle: { y: 0, rotation: 0, scale: 1 },
  hover: { y: -3, rotation: -1, scale: 1 },
  act: { y: 1, rotation: 0, scale: 0.98 },
  settle: { y: -4, rotation: -1.5, scale: 1 },
} as const

export const STICKER_S = {
  hover: 0.45,
  act: 0.2,
  settle: 0.52,
} as const

const TAB_IDS = [
  "#tab-overview",
  "#tab-category",
  "#tab-subs",
  "#tab-charges",
  "#tab-record",
] as const

export function tabSelector(tab: BrowseTab): string {
  switch (tab) {
    case "overview":
      return "#tab-overview"
    case "category":
      return "#tab-category"
    case "subs":
      return "#tab-subs"
    case "charges":
      return "#tab-charges"
    default: {
      const _never: never = tab
      return _never
    }
  }
}

export function motionOf(node: Element) {
  return node.querySelector(".entity-motion") ?? node
}

export function poseOf(node: Element) {
  return node.querySelector(".scene-pose") ?? motionOf(node)
}

export function reduceMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches
}

function el(id: string) {
  return document.querySelector(id)
}

function poseLandingChrome(visible: boolean) {
  const cover = el("#book-cover")
  if (cover) {
    cover.setAttribute("aria-hidden", visible ? "false" : "true")
    gsap.set(cover, { pointerEvents: visible ? "auto" : "none" })
  }
  const chrome = gsap.utils.toArray<Element>("#btn-login, #brand-mark")
  if (!chrome.length) return
  gsap.set(chrome, {
    autoAlpha: visible ? 1 : 0,
    pointerEvents: visible ? "auto" : "none",
  })
}

function motionTarget(id: string) {
  const node = el(id)
  return node ? motionOf(node) : id
}

function motionTargets(ids: readonly string[]) {
  return ids.map((id) => motionTarget(id))
}

function skipIfReduce(tl: gsap.core.Timeline) {
  if (reduceMotion()) tl.progress(1)
  return tl
}

function stickerDuration(state: StickerState) {
  switch (state) {
    case "hover":
      return STICKER_S.hover
    case "act":
      return STICKER_S.act
    case "idle":
    case "settle":
      return STICKER_S.settle
    default: {
      const _never: never = state
      return _never
    }
  }
}

export function setEntityState(id: string, state: StickerState) {
  const node = el(id)
  if (!node) return
  stickerTween(node, state)
}

export function stickerTween(
  node: Element,
  state: StickerState,
  duration?: number
) {
  const rest = node.getAttribute("data-rest") ?? "idle"
  node.setAttribute("data-state", state)
  return gsap.to(motionOf(node), {
    ...STICKER[state],
    duration: duration ?? stickerDuration(state),
    ease: "power2.inOut",
    overwrite: "auto",
    onComplete: () => {
      if (state === "idle" || state === "settle") {
        node.setAttribute("data-rest", state)
      } else {
        node.setAttribute("data-rest", rest)
      }
    },
  })
}

export function bindStickers(root: Element, locked: () => boolean) {
  const nodes = root.querySelectorAll<Element>("[data-interactive='true']")
  const cleanups: Array<() => void> = []

  for (const node of nodes) {
    const restOf = () =>
      node.getAttribute("data-state") === "settle" ||
      node.getAttribute("data-rest") === "settle"
        ? "settle"
        : "idle"

    const enter = () => {
      if (locked()) return
      node.setAttribute("data-rest", restOf())
      stickerTween(node, "hover")
    }
    const leave = () => {
      if (locked()) return
      const rest =
        node.getAttribute("data-rest") === "settle" ? "settle" : "idle"
      stickerTween(node, rest)
    }
    const down = () => {
      if (locked()) return
      stickerTween(node, "act")
    }
    const up = () => {
      if (locked()) return
      const rest =
        node.getAttribute("data-rest") === "settle" ? "settle" : "idle"
      stickerTween(node, rest)
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

export function applyScenePose(scene: SceneName) {
  const cover = el("#book-cover")
  const page = el("#page")
  const tabs = gsap.utils.toArray<Element>(TAB_IDS.join(","))
  if (scene === "opening" || scene === "closing") return
  if (scene === "sealed") {
    if (cover) gsap.set(cover, { autoAlpha: 1, rotationY: 0 })
    if (page) gsap.set(page, { autoAlpha: 0 })
    if (tabs.length) gsap.set(tabs, { autoAlpha: 0, y: 0, rotation: 0 })
    poseLandingChrome(true)
    return
  }
  if (cover) gsap.set(cover, { autoAlpha: 0, rotationY: -105 })
  if (page) gsap.set(page, { autoAlpha: 1 })
  if (tabs.length) gsap.set(tabs, { autoAlpha: 1 })
  poseLandingChrome(false)
}

export function playOpening(onDone: () => void) {
  gsap.set("#book-cover", { autoAlpha: 1, rotationY: 0 })
  gsap.set("#page", { autoAlpha: 0 })
  gsap.set(TAB_IDS, { autoAlpha: 0, y: -24 })
  poseLandingChrome(true)

  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onComplete: onDone,
  })

  tl.addLabel("peel")
    .to(
      motionTarget("#prop-tape"),
      { y: -14, rotation: -12, duration: 0.55 },
      "peel"
    )
    .to(
      motionTargets(SECONDARY_TAPE_SELECTORS),
      { y: -6, rotation: -4, duration: 0.45, stagger: 0.04 },
      "peel+=0.05"
    )
    .addLabel("flip", "peel+=0.35")
    .to(
      "#book-cover",
      {
        rotationY: -105,
        transformOrigin: "left center",
        duration: 0.7,
      },
      "flip"
    )
    .set("#book-cover", { autoAlpha: 0 })
    .add(() => poseLandingChrome(false))
    .set("#page", { autoAlpha: 1 }, "flip+=0.35")
    .addLabel("tabs", "flip+=0.45")
    .fromTo(
      TAB_IDS,
      { y: -24, autoAlpha: 0 },
      {
        y: 0,
        autoAlpha: 1,
        duration: 0.45,
        stagger: 0.06,
        ease: "power1.out",
      },
      "tabs"
    )
    .to(
      motionTarget("#tab-overview"),
      { y: -4, rotation: -1.5, duration: 0.35 },
      "tabs+=0.35"
    )
    .to(motionTarget("#prop-tape"), { ...STICKER.idle, duration: 0.4 }, "tabs")
    .to(
      motionTargets(SECONDARY_TAPE_SELECTORS),
      { ...STICKER.idle, duration: 0.4, stagger: 0.03 },
      "tabs"
    )

  return skipIfReduce(tl)
}

export function playClosing(onDone: () => void) {
  const tl = gsap.timeline({
    defaults: { ease: "power2.inOut" },
    onComplete: onDone,
  })

  tl.addLabel("tabsIn")
    .to(
      TAB_IDS,
      { y: -20, autoAlpha: 0, duration: 0.35, stagger: 0.04 },
      "tabsIn"
    )
    .to(
      motionTarget("#prop-pen"),
      { scale: 1, y: 0, rotation: 0, duration: 0.3 },
      "tabsIn"
    )
  const composeBits = gsap.utils.toArray<Element>(
    "#page foreignObject, #compose-form"
  )
  if (composeBits.length) {
    tl.to(composeBits, { autoAlpha: 0, duration: 0.25 }, "tabsIn")
  }
  tl.addLabel("close", "tabsIn+=0.25")
    .set("#book-cover", {
      autoAlpha: 1,
      rotationY: -105,
      pointerEvents: "auto",
    })
    .add(() => {
      el("#book-cover")?.setAttribute("aria-hidden", "false")
    }, "close")
    .to(
      "#book-cover",
      {
        rotationY: 0,
        transformOrigin: "left center",
        duration: 0.65,
      },
      "close"
    )
    .to("#page", { autoAlpha: 0, duration: 0.3 }, "close")
    .addLabel("tape", "close+=0.4")
    .to(
      motionTarget("#prop-tape"),
      { y: 0, rotation: 0, duration: 0.5 },
      "tape"
    )
    .to(
      motionTargets(SECONDARY_TAPE_SELECTORS),
      { y: 0, rotation: 0, duration: 0.45, stagger: 0.03 },
      "tape+=0.05"
    )
    .to(
      ["#btn-login", "#brand-mark"],
      { autoAlpha: 1, pointerEvents: "auto", duration: 0.35 },
      "tape"
    )

  return skipIfReduce(tl)
}

export function playInkGrow() {
  const swap = el("#ink-swap")
  if (!swap) return gsap.timeline()
  swap.setAttribute("data-ink-state", "growing")
  const inner = gsap.utils.toArray<Element>(
    "#ink-swap #ink-empty, #ink-swap [id^='list-']"
  )
  const bits = inner.length ? inner : [swap]
  gsap.set(bits, { transformOrigin: "50% 0%" })
  const tl = gsap.timeline({
    defaults: { ease: "power1.out" },
    onComplete: () => {
      swap.setAttribute("data-ink-state", "grown")
    },
  })
  tl.fromTo(
    bits,
    { scaleY: 0.08, y: 16 },
    { scaleY: 1, y: 0, duration: 0.55, stagger: 0.045 }
  )
  return skipIfReduce(tl)
}

export function playTabFlip(
  fromId: string,
  toId: string,
  inkSwap: () => void = playInkGrow
) {
  const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } })
  const fromNode = el(fromId)
  const toNode = el(toId)
  if (fromNode) {
    tl.to(motionOf(fromNode), { y: 0, rotation: 0, duration: 0.35 })
    fromNode.setAttribute("data-state", "idle")
    fromNode.setAttribute("data-rest", "idle")
  }
  if (toNode) {
    tl.to(motionOf(toNode), { scale: 0.98, duration: 0.12 }, "<")
    tl.to(motionOf(toNode), {
      scale: 1,
      y: -4,
      rotation: -1.5,
      duration: 0.4,
    })
    toNode.setAttribute("data-state", "settle")
    toNode.setAttribute("data-rest", "settle")
  }
  tl.add(() => {
    inkSwap()
  }, "<0.1")
  return skipIfReduce(tl)
}

export function enterCompose() {
  const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } })
  tl.to(motionTarget("#prop-pen"), {
    scale: 0.98,
    y: 2,
    rotation: "-=4",
    duration: 0.45,
  }).to(
    motionTargets([...SECONDARY_TAPE_SELECTORS, "#prop-cup", "#prop-plant"]),
    { x: "+=8", duration: 0.5 },
    "<"
  )
  const record = el("#tab-record")
  if (record) {
    tl.to(motionOf(record), { y: -4, rotation: -1.5, duration: 0.35 }, "<")
    record.setAttribute("data-state", "settle")
    record.setAttribute("data-rest", "settle")
  }
  tl.fromTo(
    "#page foreignObject",
    { autoAlpha: 0, y: 10 },
    { autoAlpha: 1, y: 0, duration: 0.5 },
    "<0.1"
  )
  return skipIfReduce(tl)
}

export function exitCompose(saved: boolean) {
  const tl = gsap.timeline({ defaults: { ease: "power2.inOut" } })
  tl.to("#page foreignObject, #compose-form", {
    autoAlpha: 0,
    y: 8,
    duration: 0.3,
  })
    .to(
      motionTarget("#prop-pen"),
      { scale: 1, y: 0, rotation: 0, duration: 0.4 },
      "<"
    )
    .to(
      motionTargets([...SECONDARY_TAPE_SELECTORS, "#prop-cup", "#prop-plant"]),
      { x: 0, duration: 0.45 },
      "<"
    )
  const record = el("#tab-record")
  if (record) {
    tl.to(motionOf(record), { ...STICKER.idle, duration: 0.35 }, "<")
    record.setAttribute("data-state", "idle")
    record.setAttribute("data-rest", "idle")
  }
  if (saved) {
    const swap = el("#ink-swap")
    swap?.setAttribute("data-ink-state", "idle")
  }
  return skipIfReduce(tl)
}

export function playAmbient() {
  if (reduceMotion()) return
  const cup = el("#prop-cup")
  const plant = el("#prop-plant")
  if (cup) {
    gsap.to(motionOf(cup), {
      y: -6,
      opacity: 0.92,
      yoyo: true,
      repeat: -1,
      duration: 3.4,
      ease: "sine.inOut",
    })
  }
  if (plant) {
    gsap.to(poseOf(plant), {
      scaleY: 1.02,
      transformOrigin: "50% 100%",
      yoyo: true,
      repeat: -1,
      duration: 4.2,
      ease: "sine.inOut",
    })
  }
}
