export type SceneName = "sealed" | "opening" | "closing" | "browse" | "compose"

export type BrowseTab = "overview" | "category" | "subs" | "charges"

export type StickerState = "idle" | "hover" | "act" | "settle"

export const STICKER_FOUR_STATES: readonly StickerState[] = [
  "idle",
  "hover",
  "act",
  "settle",
]

export const SECONDARY_TAPE_IDS = [
  "prop-tape-floral",
  "prop-tape-blue",
  "prop-tape-gingham",
] as const

export const SECONDARY_TAPE_SELECTORS = [
  "#prop-tape-floral",
  "#prop-tape-blue",
  "#prop-tape-gingham",
] as const

export const INK_GROW_STATES = ["idle", "growing", "grown"] as const

export type InkGrowState = (typeof INK_GROW_STATES)[number]

export type SceneSnapshot = {
  scene: SceneName
  tab: BrowseTab
  locked: boolean
}

export type SceneEvent =
  | { type: "boot"; user: boolean; justAuthed: boolean }
  | { type: "login-success" }
  | { type: "opening-done" }
  | { type: "logout" }
  | { type: "closing-done" }
  | { type: "tab"; tab: BrowseTab }
  | { type: "compose" }
  | { type: "compose-saved"; tab?: BrowseTab }
  | { type: "compose-cancel"; tab?: BrowseTab }

export function isSceneLocked(scene: SceneName): boolean {
  return scene === "opening" || scene === "closing"
}

export function bootScene(input: {
  user: boolean
  justAuthed: boolean
}): SceneSnapshot {
  if (!input.user) {
    return { scene: "sealed", tab: "overview", locked: false }
  }
  if (input.justAuthed) {
    return { scene: "opening", tab: "overview", locked: true }
  }
  return { scene: "browse", tab: "overview", locked: false }
}

function withLock(scene: SceneName, tab: BrowseTab): SceneSnapshot {
  return { scene, tab, locked: isSceneLocked(scene) }
}

export function reduceScene(
  state: SceneSnapshot,
  event: SceneEvent
): SceneSnapshot {
  switch (event.type) {
    case "boot":
      return bootScene(event)
    case "login-success":
      if (state.locked) return state
      return withLock("opening", "overview")
    case "opening-done":
      if (state.scene !== "opening") return state
      return withLock("browse", "overview")
    case "logout":
      if (state.locked) return state
      if (state.scene !== "browse" && state.scene !== "compose") return state
      return withLock("closing", state.tab)
    case "closing-done":
      if (state.scene !== "closing") return state
      return withLock("sealed", "overview")
    case "tab":
      if (state.locked) return state
      if (state.scene !== "browse") return state
      return withLock("browse", event.tab)
    case "compose":
      if (state.locked) return state
      if (state.scene !== "browse") return state
      return withLock("compose", state.tab)
    case "compose-saved":
    case "compose-cancel":
      if (state.locked) return state
      if (state.scene !== "compose") return state
      return withLock("browse", event.tab ?? state.tab)
    default: {
      const _never: never = event
      return _never
    }
  }
}
