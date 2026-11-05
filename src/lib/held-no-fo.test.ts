/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"
import { join } from "node:path"

describe("held widget faces have no foreignObject paper", () => {
  test("only LoginFace uses foreignObject; compose and content widgets do not", async () => {
    const src = await Bun.file(
      join(import.meta.dir, "../components/desk-widgets.tsx")
    ).text()

    const loginFace = src.slice(
      src.indexOf("function LoginFace"),
      src.indexOf("export function LoginWidget")
    )
    expect(loginFace).toContain("foreignObject")

    const withoutLoginFace = src.replace(
      /function LoginFace\([\s\S]*?\n\}\n\n/,
      ""
    )
    expect(withoutLoginFace).not.toContain("foreignObject")

    const composeHeld = src.slice(
      src.indexOf("export function ComposeHeldInk"),
      src.indexOf("export function DeskInk")
    )
    expect(composeHeld).not.toContain("foreignObject")
    expect(composeHeld).not.toContain("<input")
    expect(composeHeld).not.toContain("<form")
  })
})
