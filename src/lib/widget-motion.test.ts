/// <reference types="bun-types" />
import { describe, expect, test } from "bun:test"

import {
  CONTENT_SELECTORS,
  FROM,
  LOGIN_BADGE,
  LOGIN_CONTROL,
  LOGIN_OUT,
  LOGIN_SLOT,
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

  test("LOGIN_OUT flies fully above the 800h stage", () => {
    expect(LOGIN_CONTROL).toBe("#login-control")
    expect(LOGIN_OUT).toEqual({ x: 48, y: -840, rotate: -8 })
    expect(Math.abs(LOGIN_OUT.y)).toBeGreaterThanOrEqual(420)
    expect(LOGIN_OUT.y).not.toBe(-160)
    expect(LOGIN_SLOT.x).toBeGreaterThan(STAGE.w * 0.7)
    expect(LOGIN_SLOT.y).toBeGreaterThan(STAGE.h * 0.7)
    expect(LOGIN_SLOT.x + LOGIN_BADGE.w).toBeLessThanOrEqual(STAGE.w)
    expect(LOGIN_SLOT.y + LOGIN_BADGE.h).toBeLessThanOrEqual(STAGE.h)
    expect(LOGIN_SLOT.y + LOGIN_BADGE.h + LOGIN_OUT.y).toBeLessThan(0)
  })
})
