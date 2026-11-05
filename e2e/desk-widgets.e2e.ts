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
    await expect(page.locator("#widget-category")).not.toBeInViewport()
    await expect(page.locator("#widget-subs")).not.toBeInViewport()
    await expect(page.locator("#widget-charges")).not.toBeInViewport()
    await expect(page.locator("#widget-compose")).not.toBeInViewport()
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
    await expect(page.locator("#widget-login")).not.toBeInViewport()
    await expect(page.locator("#widget-category")).toBeInViewport()
    await expect(page.locator("#widget-subs")).toBeInViewport()
    await expect(page.locator("#widget-charges")).toBeInViewport()
    await expect(page.locator("#widget-compose")).toBeInViewport()

    await page.locator("#widget-category").click()
    await expect(root).toHaveAttribute("data-phase", "held")
    await expect(root).toHaveAttribute("data-held", "category")

    await page.locator("#desk").click({ position: { x: 40, y: 40 } })
    await expect(root).toHaveAttribute("data-phase", "desk")
    await expect(root).toHaveAttribute("data-held", "")

    await page.locator("#btn-logout").click()
    await expect(root).toHaveAttribute("data-phase", /exit|login-only/)
    await expect(page.locator("#widget-login")).toBeInViewport({
      timeout: 8_000,
    })
  })
})
