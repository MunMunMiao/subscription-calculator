import { describe, expect, test } from "vitest"

// oxlint-disable-next-line import/default -- Vite ?raw is a default string export
import widgetsSource from "../components/desk-widgets.tsx?raw"

describe("compact widget faces have no foreignObject paper", () => {
  test("desk widgets source has no foreignObject, form, or input", () => {
    expect(widgetsSource).not.toContain("foreignObject")
    expect(widgetsSource).not.toContain("<input")
    expect(widgetsSource).not.toContain("<form")
    expect(widgetsSource).not.toContain("login-control")
    expect(widgetsSource).not.toContain("btn-logout")
    expect(widgetsSource).not.toContain("desk-ink-total")
    expect(widgetsSource).not.toContain("更多登录")
    expect(widgetsSource).not.toContain("widget-login")
    expect(widgetsSource).not.toContain("Noto Serif SC")
    expect(widgetsSource).toContain("LXGW WenKai")
    expect(widgetsSource).toContain("sm: 13")
    expect(widgetsSource).toContain("md: 16")
    expect(widgetsSource).toContain("lg: 18")
  })
})
