import { expect, test, type Page } from "@playwright/test"

function desk(page: Page) {
  return page.getByTestId("desk-root")
}

async function gsapXY(page: Page, selector: string) {
  return page.locator(selector).evaluate((node) => {
    const vars = (
      node as SVGElement & {
        _gsap?: { x: string | number; y: string | number }
      }
    )._gsap
    if (!vars) return { x: 0, y: 0 }
    const x = Number.parseFloat(String(vars.x ?? "0"))
    const y = Number.parseFloat(String(vars.y ?? "0"))
    return {
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
    }
  })
}

test.describe("Widget desk smoke", () => {
  test("login-only is a bare wood desk plus corner login chrome", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(desk(page)).toHaveAttribute("data-phase", "login-only")
    await expect(page.locator("#widget-login")).toHaveCount(0)
    await expect(page.locator("#login-control")).toBeVisible()
    await expect(page.locator("#brand-mark")).toContainText("手帐")
    await expect(page.locator("#btn-login")).toContainText("GitHub 登录")
    await expect(page.locator("#widget-overview")).toHaveCount(0)
    await expect(page.locator("#widget-category")).toBeHidden()
    await expect(page.locator("#widget-subs")).toBeHidden()
    await expect(page.locator("#widget-charges")).toBeHidden()
    await expect(page.locator("#widget-compose")).toBeHidden()
    await expect(page.locator("#prop-cup")).toBeHidden()
    await expect(page.locator("#prop-pen")).toBeHidden()
    await expect(page.locator("#prop-plant")).toBeHidden()
  })

  test("e2e browse plays enter then desk with four content widgets", async ({
    page,
  }) => {
    await page.goto("/?e2e=browse")
    const root = desk(page)
    await expect(root).toHaveAttribute("data-phase", /enter|desk/)
    let maxAbs = 0
    for (let i = 0; i < 20; i++) {
      const category = await gsapXY(page, "#widget-category")
      maxAbs = Math.max(maxAbs, Math.abs(category.x), Math.abs(category.y))
      if ((await root.getAttribute("data-phase")) === "desk") break
      await page.waitForTimeout(50)
    }
    await expect(root).toHaveAttribute("data-phase", "desk", { timeout: 8_000 })
    if (maxAbs > 0) expect(maxAbs).toBeGreaterThan(160)
    await expect(root).toHaveAttribute("data-held", "")
    await expect(page.locator("#widget-overview")).toHaveCount(0)
    await expect(page.locator("#widget-login")).toHaveCount(0)
    await expect(page.locator("#login-control")).toBeHidden()
    await expect(page.locator("#widget-category")).toBeVisible()
    await expect(page.locator("#widget-subs")).toBeVisible()
    await expect(page.locator("#widget-charges")).toBeVisible()
    await expect(page.locator("#widget-compose")).toBeVisible()
    await expect(page.locator("#desk-ink-total")).toHaveText(
      /[$¥]\d+\.\d{2} \/ 月/
    )
    await expect(page.locator("#desk-ink-total")).not.toContainText(/iCloud|年/)
    await expect(page.locator("#widget-category")).toContainText(
      /流媒体|软件|云服务/
    )
    await expect(page.locator("#widget-subs")).toContainText(/Netflix|GitHub/)
    await expect(page.locator("#widget-charges")).toContainText(/\d{2}\/\d{2}/)
    await expect(page.locator("#widget-compose")).toContainText("记一笔")
    await expect(page.locator("#widget-category foreignObject")).toHaveCount(0)
    await expect(page.locator("#widget-subs foreignObject")).toHaveCount(0)
    await expect(page.locator("#widget-charges foreignObject")).toHaveCount(0)
    await expect(page.locator("#widget-compose foreignObject")).toHaveCount(0)
    await expect(page.locator(".widget-face")).toHaveCount(0)

    await page.locator("#widget-category").click()
    await expect(root).toHaveAttribute("data-phase", "held")
    await expect(root).toHaveAttribute("data-held", "category")
    await expect(page.locator("#widget-category foreignObject")).toHaveCount(0)
    await expect(page.locator(".widget-face")).toHaveCount(0)

    const hit = page.locator("#desk-hit")
    const box = await hit.boundingBox()
    expect(box).toBeTruthy()
    await page.mouse.click(
      box!.x + box!.width * 0.5,
      box!.y + box!.height * 0.42
    )
    await expect(root).toHaveAttribute("data-phase", "desk")
    await expect(root).toHaveAttribute("data-held", "")

    await page.locator("#widget-subs").click()
    await expect(root).toHaveAttribute("data-held", "subs")
    await expect(page.locator("#widget-subs foreignObject")).toHaveCount(0)
    await page.mouse.click(
      box!.x + box!.width * 0.5,
      box!.y + box!.height * 0.42
    )
    await expect(root).toHaveAttribute("data-phase", "desk")
    await expect(root).toHaveAttribute("data-held", "")

    await page.locator("#widget-charges").click()
    await expect(root).toHaveAttribute("data-held", "charges")
    await expect(page.locator("#widget-charges foreignObject")).toHaveCount(0)
    await page.mouse.click(
      box!.x + box!.width * 0.5,
      box!.y + box!.height * 0.42
    )
    await expect(root).toHaveAttribute("data-phase", "desk")
    await expect(root).toHaveAttribute("data-held", "")

    await page.locator("#btn-logout").click()
    await expect(root).toHaveAttribute("data-phase", /exit|login-only/)
    let minLoginY = 0
    for (let i = 0; i < 24; i++) {
      const login = await gsapXY(page, "#login-control")
      minLoginY = Math.min(minLoginY, login.y)
      if ((await root.getAttribute("data-phase")) === "login-only") break
      await page.waitForTimeout(50)
    }
    expect(minLoginY).toBeLessThanOrEqual(-400)
    await expect(page.locator("#login-control")).toBeVisible({
      timeout: 8_000,
    })
    await expect(page.locator("#widget-login")).toHaveCount(0)
    await expect(page.locator("#prop-cup")).toBeHidden()
    await expect(page.locator("#widget-category")).toBeHidden()
  })

  test("cup paints behind 订阅 and does not steal hits", async ({ page }) => {
    await page.goto("/?e2e=browse")
    const root = desk(page)
    await expect(root).toHaveAttribute("data-phase", "desk", { timeout: 8_000 })

    const cupBehindWidgets = await page.evaluate(() => {
      const cup = document.getElementById("prop-cup")
      const layer = document.getElementById("widget-layer")
      if (!cup || !layer) return false
      return Boolean(
        cup.compareDocumentPosition(layer) & Node.DOCUMENT_POSITION_FOLLOWING
      )
    })
    expect(cupBehindWidgets).toBe(true)

    const subs = page.locator("#widget-subs")
    const box = await subs.boundingBox()
    expect(box).toBeTruthy()
    await page.mouse.click(box!.x + box!.width * 0.45, box!.y + 16)
    await expect(root).toHaveAttribute("data-held", "subs")
    await expect(page.locator("#widget-subs foreignObject")).toHaveCount(0)
    await expect(page.locator(".widget-face")).toHaveCount(0)
  })

  test("compose pick-up / put-down leaves the pen in its slot", async ({
    page,
  }) => {
    await page.goto("/?e2e=browse")
    const root = desk(page)
    await expect(root).toHaveAttribute("data-phase", "desk", { timeout: 8_000 })

    const slot = page.locator("#prop-pen-slot")
    await expect(slot).toHaveAttribute(
      "transform",
      /translate\(\s*134\s+94\s*\)/
    )

    const hit = page.locator("#desk-hit")
    const deskBox = await hit.boundingBox()
    expect(deskBox).toBeTruthy()

    for (let i = 0; i < 2; i++) {
      await page.locator("#widget-compose").click()
      await expect(root).toHaveAttribute("data-held", "compose")
      await expect(page.locator("#widget-compose foreignObject")).toHaveCount(0)
      await expect(page.locator(".widget-face")).toHaveCount(0)
      await expect(page.locator("#widget-compose")).toContainText(
        /保存|更新|返回/
      )
      const hasScroller = await page
        .locator("#widget-compose")
        .evaluate((node) => {
          const all = [node, ...Array.from(node.querySelectorAll("*"))]
          return all.some((el) => {
            const style = getComputedStyle(el)
            return (
              style.overflow === "auto" ||
              style.overflow === "scroll" ||
              style.overflowY === "auto" ||
              style.overflowY === "scroll"
            )
          })
        })
      expect(hasScroller).toBe(false)
      await page.mouse.click(
        deskBox!.x + deskBox!.width * 0.5,
        deskBox!.y + deskBox!.height * 0.42
      )
      await expect(root).toHaveAttribute("data-phase", "desk")
      await expect(root).toHaveAttribute("data-held", "")
      await expect(page.locator("#widget-compose foreignObject")).toHaveCount(0)
    }

    await expect(slot).toHaveAttribute(
      "transform",
      /translate\(\s*134\s+94\s*\)/
    )
    await expect
      .poll(async () => {
        const pen = await gsapXY(page, "#prop-pen")
        return Math.abs(pen.x) < 2 && Math.abs(pen.y) < 2
      })
      .toBe(true)
  })
})
