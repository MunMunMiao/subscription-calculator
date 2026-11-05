import { expect, test, type Page } from "@playwright/test"

function desk(page: Page) {
  return page.getByTestId("desk-root")
}

test.describe("DeskScene smoke", () => {
  test("sealed landing shows 手帐 + GitHub login", async ({ page }) => {
    await page.goto("/")
    await expect(desk(page)).toHaveAttribute("data-scene", "sealed")
    await expect(page.locator("#brand-mark")).toContainText("手帐")
    await expect(page.locator("#btn-login")).toContainText("GitHub 登录")
    await expect(page.locator("#page")).toHaveAttribute("data-state", "sealed")
  })

  test("mocked session boots browse, tab flip, compose save grows ink, logout closes", async ({
    page,
  }) => {
    await page.goto("/?e2e=browse")
    const root = desk(page)

    await expect(root).toHaveAttribute("data-scene", "browse")
    await expect(root).toHaveAttribute("data-tab", "overview")
    await expect(page.locator("#btn-login")).toBeHidden()
    await expect(page.locator("#brand-mark")).toBeHidden()
    const coverCopy = await page
      .locator("#book-cover")
      .evaluate((node) => node.textContent ?? "")
    expect(coverCopy).not.toMatch(/手帐|GitHub 登录/)
    await expect(page.locator("#book-cover")).toHaveAttribute(
      "aria-hidden",
      "true"
    )
    await expect(page.locator("#book-cover")).toHaveCSS(
      "pointer-events",
      "none"
    )
    await expect(page.locator("#tab-overview")).toBeVisible()
    await expect(page.locator("#btn-write")).toBeVisible()
    await expect(page.locator("#ink-empty")).toContainText("还没有记录")
    await expect(page).toHaveURL(/e2e=browse/)

    const beforeFlip = page.url()
    await page.locator("#tab-category").click()
    await expect(root).toHaveAttribute("data-scene", "browse")
    await expect(root).toHaveAttribute("data-tab", "category")
    await expect(page.locator("#tab-category")).toHaveAttribute(
      "data-state",
      "settle"
    )
    expect(new URL(page.url()).pathname).toBe(new URL(beforeFlip).pathname)

    await page.locator("#tab-overview").click()
    await expect(root).toHaveAttribute("data-tab", "overview")

    await page.locator("#btn-write").click()
    await expect(root).toHaveAttribute("data-scene", "compose")
    await expect(page.locator("#compose-form")).toBeVisible()
    await page.getByTestId("ink-name").fill("Netflix")
    await page.getByTestId("ink-amount").fill("15.99")
    await page.locator("#btn-save").click()

    await expect(root).toHaveAttribute("data-scene", "browse", {
      timeout: 8_000,
    })
    await expect(page.locator("#ink-swap")).toHaveAttribute(
      "data-ink-state",
      /growing|grown/
    )
    await expect(page.locator("#ink-swap")).toHaveAttribute(
      "data-ink-state",
      "grown"
    )
    await expect(page.locator("#ink-empty")).toHaveCount(0)
    await expect(page.getByText("每月经常")).toBeVisible()

    await page.locator("#btn-logout").click()
    await expect(root).toHaveAttribute("data-scene", "closing")
    await expect(page.locator("#btn-login")).toBeVisible({ timeout: 8_000 })
    await expect(desk(page)).toHaveAttribute("data-scene", "sealed")
    await expect(page.locator("#brand-mark")).toContainText("手帐")
  })
})
