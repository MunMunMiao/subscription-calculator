export type DeskPhase = "login-only" | "enter" | "desk" | "expanded" | "exit"

export type ContentWidgetId = "category" | "subs" | "charges" | "compose"
export type AuthWidgetId = "github"
export type WidgetId = ContentWidgetId | AuthWidgetId

export const CONTENT_WIDGET_IDS = [
  "category",
  "subs",
  "charges",
  "compose",
] as const

/** One Auth Widget per source on the desk. Never bucket into 「更多登录」. */
export const AUTH_WIDGET_IDS = ["github"] as const

export const WIDGET_FOUR_STATES = ["idle", "hover", "act", "held"] as const

export type WidgetFourState = (typeof WIDGET_FOUR_STATES)[number]

export const WIDGET_SCENE_IDS = {
  category: "widget-category",
  subs: "widget-subs",
  charges: "widget-charges",
  compose: "widget-compose",
  github: "widget-auth-github",
} as const

export type SceneWidgetId =
  (typeof WIDGET_SCENE_IDS)[keyof typeof WIDGET_SCENE_IDS]

export const CONTENT_SCENE_IDS = CONTENT_WIDGET_IDS.map(
  (id) => WIDGET_SCENE_IDS[id]
)

export const AUTH_SCENE_IDS = AUTH_WIDGET_IDS.map((id) => WIDGET_SCENE_IDS[id])

export type DeskSnapshot = {
  phase: DeskPhase
  expanded: ContentWidgetId | null
  locked: boolean
  fromLogin: boolean
}

export type DeskEvent =
  | { type: "boot"; user: boolean; fromLogin: boolean }
  | { type: "login-success" }
  | { type: "enter-done" }
  | { type: "expand"; id: ContentWidgetId }
  | { type: "collapse" }
  | { type: "logout" }
  | { type: "exit-done" }

export function isDeskLocked(phase: DeskPhase): boolean {
  return phase === "enter" || phase === "exit"
}

export function isOverview(state: DeskSnapshot): boolean {
  return state.phase === "desk" && state.expanded === null
}

export function sceneIdFor(id: WidgetId): (typeof WIDGET_SCENE_IDS)[WidgetId] {
  return WIDGET_SCENE_IDS[id]
}

export function isContentWidgetId(value: string): value is ContentWidgetId {
  return (CONTENT_WIDGET_IDS as readonly string[]).includes(value)
}

export function isAuthWidgetId(value: string): value is AuthWidgetId {
  return (AUTH_WIDGET_IDS as readonly string[]).includes(value)
}

export function bootDesk(input: {
  user: boolean
  fromLogin: boolean
}): DeskSnapshot {
  if (!input.user) {
    return {
      phase: "login-only",
      expanded: null,
      locked: false,
      fromLogin: false,
    }
  }
  return {
    phase: "enter",
    expanded: null,
    locked: true,
    fromLogin: input.fromLogin,
  }
}

function withPhase(
  phase: DeskPhase,
  expanded: ContentWidgetId | null,
  fromLogin: boolean
): DeskSnapshot {
  return {
    phase,
    expanded,
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
    case "expand":
      if (state.locked) return state
      if (state.phase !== "desk" && state.phase !== "expanded") return state
      if (state.phase === "expanded" && state.expanded === event.id) {
        return withPhase("desk", null, false)
      }
      return withPhase("expanded", event.id, false)
    case "collapse":
      if (state.locked) return state
      if (state.phase !== "expanded") return state
      return withPhase("desk", null, false)
    case "logout":
      if (state.locked) return state
      if (state.phase !== "desk" && state.phase !== "expanded") return state
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
