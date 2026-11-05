/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { join } from "node:path"

describe("held widget faces have no foreignObject paper", () => {
  test("desk widgets source has no foreignObject, form, or input", async () => {
    const src = await Bun.file(
      join(import.meta.dir, "../components/desk-widgets.tsx")
    ).text()
    expect(src).not.toContain("foreignObject")
    expect(src).not.toContain("<input")
    expect(src).not.toContain("<form")
    expect(src).not.toContain("login-control")
    expect(src).not.toContain("更多登录")
    expect(src).not.toContain("widget-login")
  })
})
