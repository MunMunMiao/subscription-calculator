export type DeskPhase = "login-only" | "enter" | "desk" | "held" | "exit"

export type ContentWidgetId = "category" | "subs" | "charges" | "compose"

export type WidgetId = "login" | ContentWidgetId

export const CONTENT_WIDGET_IDS = [
  "category",
  "subs",
  "charges",
  "compose",
] as const

export const WIDGET_FOUR_STATES = ["idle", "hover", "act", "held"] as const

export type WidgetFourState = (typeof WIDGET_FOUR_STATES)[number]

export const WIDGET_SCENE_IDS = {
  login: "widget-login",
  category: "widget-category",
  subs: "widget-subs",
  charges: "widget-charges",
  compose: "widget-compose",
} as const

export type SceneWidgetId =
  (typeof WIDGET_SCENE_IDS)[keyof typeof WIDGET_SCENE_IDS]

export const CONTENT_SCENE_IDS = [
  WIDGET_SCENE_IDS.category,
  WIDGET_SCENE_IDS.subs,
  WIDGET_SCENE_IDS.charges,
  WIDGET_SCENE_IDS.compose,
] as const

export type DeskSnapshot = {
  phase: DeskPhase
  held: ContentWidgetId | null
  locked: boolean
  fromLogin: boolean
}

export type DeskEvent =
  | { type: "boot"; user: boolean; fromLogin: boolean }
  | { type: "login-success" }
  | { type: "enter-done" }
  | { type: "pick"; id: ContentWidgetId }
  | { type: "put-down" }
  | { type: "logout" }
  | { type: "exit-done" }

export function isDeskLocked(phase: DeskPhase): boolean {
  return phase === "enter" || phase === "exit"
}

export function isOverview(state: DeskSnapshot): boolean {
  return state.phase === "desk" && state.held === null
}

export function sceneIdFor(id: WidgetId): (typeof WIDGET_SCENE_IDS)[WidgetId] {
  return WIDGET_SCENE_IDS[id]
}

export function isContentWidgetId(value: string): value is ContentWidgetId {
  return (CONTENT_WIDGET_IDS as readonly string[]).includes(value)
}

export function bootDesk(input: {
  user: boolean
  fromLogin: boolean
}): DeskSnapshot {
  if (!input.user) {
    return {
      phase: "login-only",
      held: null,
      locked: false,
      fromLogin: false,
    }
  }
  return {
    phase: "enter",
    held: null,
    locked: true,
    fromLogin: input.fromLogin,
  }
}

function withPhase(
  phase: DeskPhase,
  held: ContentWidgetId | null,
  fromLogin: boolean
): DeskSnapshot {
  return {
    phase,
    held,
    locked: isDeskLocked(phase),
    fromLogin,
  }
}

export function reduceDesk(
  state: DeskSnapshot,
  event: DeskEvent
): DeskSnapshot {
  switch (event.type) {
    case "boot":
      return bootDesk(event)
    case "login-success":
      if (state.locked) return state
      if (state.phase !== "login-only") return state
      return withPhase("enter", null, true)
    case "enter-done":
      if (state.phase !== "enter") return state
      return withPhase("desk", null, false)
    case "pick":
      if (state.locked) return state
      if (state.phase !== "desk" && state.phase !== "held") return state
      if (state.phase === "held" && state.held === event.id) return state
      return withPhase("held", event.id, false)
    case "put-down":
      if (state.locked) return state
      if (state.phase !== "held") return state
      return withPhase("desk", null, false)
    case "logout":
      if (state.locked) return state
      if (state.phase !== "desk" && state.phase !== "held") return state
      return withPhase("exit", null, false)
    case "exit-done":
      if (state.phase !== "exit") return state
      return withPhase("login-only", null, false)
    default: {
      const _never: never = event
      return _never
    }
  }
}
