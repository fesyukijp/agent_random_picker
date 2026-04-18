import { test, expect } from '@playwright/test'

test.describe('Issue #17: UIデザインシステム', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('E2E-DESIGN-001: ページ背景色が #0F1923 であること', async ({
    page,
  }) => {
    const bgColor = await page
      .locator('body')
      .evaluate((el) => window.getComputedStyle(el).backgroundColor)
    // #0F1923 → rgb(15, 25, 35)
    expect(bgColor).toBe('rgb(15, 25, 35)')
  })

  test('E2E-DESIGN-002: フォントが Barlow Condensed であること', async ({
    page,
  }) => {
    const fontFamily = await page
      .locator('body')
      .evaluate((el) => window.getComputedStyle(el).fontFamily)
    expect(fontFamily).toContain('Barlow Condensed')
  })

  test('E2E-DESIGN-003: メインボタンのアクセントカラーが #FF4655 であること', async ({
    page,
  }) => {
    const bgColor = await page
      .getByTestId('pick-button')
      .evaluate((el) => window.getComputedStyle(el).backgroundColor)
    // #FF4655 → rgb(255, 70, 85)
    expect(bgColor).toBe('rgb(255, 70, 85)')
  })

  test('E2E-DESIGN-004: 角丸が 2px であること', async ({ page }) => {
    const borderRadius = await page
      .getByTestId('pick-button')
      .evaluate((el) => window.getComputedStyle(el).borderRadius)
    expect(borderRadius).toBe('2px')
  })
})
