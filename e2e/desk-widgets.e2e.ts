import { expect, test, type Page } from "@playwright/test"

function desk(page: Page) {
  return page.getByTestId("desk-root")
}

test.describe("Widget desk smoke", () => {
  test("login-only shows only widget-login; no overview widget", async ({
    page,
  }) => {
    await page.goto("/")
    await expect(desk(page)).toHaveAttribute("data-phase", "login-only")
    await expect(page.locator("#widget-login")).toBeVisible()
    await expect(page.locator("#brand-mark")).toContainText("手帐")
    await expect(page.locator("#btn-login")).toContainText("GitHub 登录")
    await expect(page.locator("#widget-overview")).toHaveCount(0)
    await expect(page.locator("#widget-category")).toBeHidden()
    await expect(page.locator("#widget-subs")).toBeHidden()
    await expect(page.locator("#widget-charges")).toBeHidden()
    await expect(page.locator("#widget-compose")).toBeHidden()
  })

  test("e2e browse plays enter then desk with four content widgets", async ({
    page,
  }) => {
    await page.goto("/?e2e=browse")
    const root = desk(page)
    await expect(root).toHaveAttribute("data-phase", /enter|desk/)
    await expect(root).toHaveAttribute("data-phase", "desk", { timeout: 8_000 })
    await expect(root).toHaveAttribute("data-held", "")
    await expect(page.locator("#widget-overview")).toHaveCount(0)
    await expect(page.locator("#widget-login")).toBeHidden()
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

    await page.locator("#widget-category").click()
    await expect(root).toHaveAttribute("data-phase", "held")
    await expect(root).toHaveAttribute("data-held", "category")

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
    await page.mouse.click(
      box!.x + box!.width * 0.5,
      box!.y + box!.height * 0.42
    )
    await expect(root).toHaveAttribute("data-phase", "desk")
    await expect(root).toHaveAttribute("data-held", "")

    await page.locator("#btn-logout").click()
    await expect(root).toHaveAttribute("data-phase", /exit|login-only/)
    await expect(page.locator("#widget-login")).toBeInViewport({
      timeout: 8_000,
    })
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
      /translate\(\s*168\s+118\s*\)/
    )

    const before = await page.locator("#prop-pen").boundingBox()
    expect(before).toBeTruthy()

    const hit = page.locator("#desk-hit")
    const deskBox = await hit.boundingBox()
    expect(deskBox).toBeTruthy()

    for (let i = 0; i < 2; i++) {
      await page.locator("#widget-compose").click()
      await expect(root).toHaveAttribute("data-held", "compose")
      await expect(
        page.locator("#widget-compose foreignObject.compose-face")
      ).toHaveCount(1)
      await expect(page.locator(".widget-face.is-open")).toHaveCount(0)
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
      /translate\(\s*168\s+118\s*\)/
    )
    await expect
      .poll(async () => {
        const after = await page.locator("#prop-pen").boundingBox()
        if (!after || !before) return false
        return (
          Math.abs(after.x - before.x) < 24 &&
          Math.abs(after.y - before.y) < 24 &&
          after.x > 0 &&
          after.y > 0
        )
      })
      .toBe(true)
  })
})
