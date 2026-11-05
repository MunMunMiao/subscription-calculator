import { describe, expect, test } from "vitest"

// oxlint-disable-next-line import/default -- Vite ?raw is a default string export
import widgetsSource from "../components/desk-widgets.tsx?raw"

describe("compact widget faces have no foreignObject paper", () => {
  test("desk widgets source has no foreignObject, form, or input", () => {
    expect(widgetsSource).not.toContain("foreignObject")
    expect(widgetsSource).not.toContain("<input")
    expect(widgetsSource).not.toContain("<form")
    expect(widgetsSource).not.toContain("login-control")
    expect(widgetsSource).not.toContain("更多登录")
    expect(widgetsSource).not.toContain("widget-login")
  })
})
