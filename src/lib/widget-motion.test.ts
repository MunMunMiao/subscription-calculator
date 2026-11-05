/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"

import { AUTH_WIDGET_IDS, WIDGET_SCENE_IDS } from "./widget-machine"
import {
  AUTH_LOGIN_FACE,
  AUTH_OUT,
  AUTH_SELECTORS,
  AUTH_SLOTS,
  CONTENT_SELECTORS,
  FROM,
  OFF,
  STAGE,
} from "./widget-motion"

function absDelta(delta: { x: number; y: number }) {
  return Math.max(Math.abs(delta.x), Math.abs(delta.y))
}

describe("MOTION §§1–3 hard gates", () => {
  test("stage is 1280×800", () => {
    expect(STAGE).toEqual({ w: 1280, h: 800 })
  })

  test("OFF and FROM are true off-canvas, not micro-shift", () => {
    expect(OFF).toBeGreaterThanOrEqual(420)
    expect(OFF).toBe(480)
    for (const sel of CONTENT_SELECTORS) {
      expect(absDelta(FROM[sel])).toBeGreaterThanOrEqual(420)
      expect(Math.abs(FROM[sel].x)).toBe(OFF)
    }
  })

  test("auth widgets fly fully above the 800h stage", () => {
    expect(AUTH_SELECTORS).toEqual(
      AUTH_WIDGET_IDS.map((id) => `#${WIDGET_SCENE_IDS[id]}`)
    )
    expect(AUTH_SELECTORS).toContain("#widget-login")
    expect(AUTH_OUT.login).toEqual({ x: 48, y: -840, rotate: -8 })
    expect(Math.abs(AUTH_OUT.login.y)).toBeGreaterThanOrEqual(420)
    expect(AUTH_OUT.login.y).not.toBe(-160)
    expect(AUTH_SLOTS.login.x).toBeGreaterThan(STAGE.w * 0.7)
    expect(AUTH_SLOTS.login.y).toBeGreaterThan(STAGE.h * 0.7)
    expect(AUTH_SLOTS.login.x + AUTH_LOGIN_FACE.w).toBeLessThanOrEqual(STAGE.w)
    expect(AUTH_SLOTS.login.y + AUTH_LOGIN_FACE.h).toBeLessThanOrEqual(STAGE.h)
    expect(
      AUTH_SLOTS.login.y + AUTH_LOGIN_FACE.h + AUTH_OUT.login.y
    ).toBeLessThan(0)
  })
})
