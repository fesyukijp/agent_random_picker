import { test, expect } from '@playwright/test'

test.describe('Issue #1: モバイルでピックボタンがフッターを覆わない', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
  })

  // E2E-MOBILE-FOOTER-001: ピックボタンがフッターと重ならない（ボタン下端 <= フッター上端）
  test('E2E-MOBILE-FOOTER-001: ピックボタンの下端がフッターの上端を超えない', async ({
    page,
  }) => {
    const pickBtn = page.getByTestId('pick-button')
    const footer = page.locator('footer')

    await expect(pickBtn).toBeVisible()
    await expect(footer).toBeVisible()

    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    )

    const pickBox = await pickBtn.boundingBox()
    const footerBox = await footer.boundingBox()
    if (!pickBox || !footerBox) throw new Error('bounding box is null')

    expect(pickBox.y + pickBox.height).toBeLessThanOrEqual(footerBox.y)
  })

  // E2E-MOBILE-FOOTER-002: フッター内のリンクがピックボタンに覆われずクリック可能
  test('E2E-MOBILE-FOOTER-002: フッターのバグ報告リンクがクリック可能', async ({
    page,
  }) => {
    await page.evaluate(() =>
      window.scrollTo(0, document.documentElement.scrollHeight),
    )

    const bugReportLink = page
      .locator('footer')
      .getByRole('link', { name: /バグ報告/ })
    await expect(bugReportLink).toBeVisible()

    // Playwright の actionability チェック: 他要素で覆われていればここで失敗する
    await bugReportLink.click({ trial: true })
  })
})
