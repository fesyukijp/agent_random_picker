import { test, expect, type Page } from '@playwright/test'

/**
 * window.scrollTo 後に「viewport bottom === document bottom」を保証する。
 * sticky の再計算が次フレームにずれるケースで boundingBox() を安定して取得するため。
 */
async function scrollToBottom(page: Page): Promise<void> {
  await page.evaluate(() =>
    window.scrollTo(0, document.documentElement.scrollHeight),
  )
  await page.waitForFunction(
    () =>
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 1,
  )
}

// useIsMobile の閾値は max-width: 639px。境界ちょうど (639) と代表的端末 (320, 390) を網羅。
const MOBILE_VIEWPORTS = [
  { name: 'iPhone SE', width: 320, height: 568 },
  { name: 'iPhone 14', width: 390, height: 844 },
  { name: 'mobile boundary', width: 639, height: 900 },
] as const

test.describe('Issue #1: モバイルでピックボタンがフッターを覆わない', () => {
  for (const vp of MOBILE_VIEWPORTS) {
    test.describe(`viewport ${vp.width}×${vp.height} (${vp.name})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width: vp.width, height: vp.height })
        await page.goto('/')
      })

      // E2E-MOBILE-FOOTER-001: セットアップモード・初期状態
      test('E2E-MOBILE-FOOTER-001: 初期状態でピックボタン下端がフッター上端を超えない', async ({
        page,
      }) => {
        const pickBtn = page.getByTestId('pick-button')
        const footer = page.locator('footer')

        await expect(pickBtn).toBeVisible()
        await expect(footer).toBeVisible()

        await scrollToBottom(page)

        const pickBox = await pickBtn.boundingBox()
        const footerBox = await footer.boundingBox()
        if (!pickBox) throw new Error('pick-button の boundingBox() が null')
        if (!footerBox) throw new Error('footer の boundingBox() が null')

        expect(pickBox.y + pickBox.height).toBeLessThanOrEqual(footerBox.y)
      })

      // E2E-MOBILE-FOOTER-002: フッターの全リンクがクリック可能
      test('E2E-MOBILE-FOOTER-002: フッターのバグ報告・X リンクがクリック可能', async ({
        page,
      }) => {
        await scrollToBottom(page)

        const footer = page.locator('footer')
        const bugReportLink = footer.getByRole('link', { name: /バグ報告/ })
        const xLink = footer.getByRole('link', { name: /X.*Twitter/ })

        await expect(bugReportLink).toBeVisible()
        await expect(xLink).toBeVisible()

        // actionability チェック（visible + enabled + 他要素で覆われていない）
        await bugReportLink.click({ trial: true })
        await xLink.click({ trial: true })
      })

      // E2E-MOBILE-FOOTER-003: セットアップモード・全体設定展開でスクロールが発生する状態
      test('E2E-MOBILE-FOOTER-003: 5人・全体設定展開時でもフッターを覆わない', async ({
        page,
      }) => {
        const addPlayerBtn = page.getByRole('button', {
          name: 'プレイヤーを追加',
        })
        for (let i = 0; i < 4; i++) {
          await addPlayerBtn.click()
        }

        await page
          .getByRole('button', { name: 'ロール人数制限', exact: true })
          .click()
        await page
          .getByRole('button', { name: 'エージェント制約', exact: true })
          .click()

        // コンテンツ高が viewport を超えることを確認（このテストの前提）
        const overflow = await page.evaluate(
          () => document.documentElement.scrollHeight > window.innerHeight,
        )
        expect(overflow).toBe(true)

        await scrollToBottom(page)

        const pickBtn = page.getByTestId('pick-button')
        const footer = page.locator('footer')
        const pickBox = await pickBtn.boundingBox()
        const footerBox = await footer.boundingBox()
        if (!pickBox) throw new Error('pick-button の boundingBox() が null')
        if (!footerBox) throw new Error('footer の boundingBox() が null')

        expect(pickBox.y + pickBox.height).toBeLessThanOrEqual(footerBox.y)
      })
    })
  }

  // E2E-MOBILE-FOOTER-004: 発表モードの reroll-all-button が固定 viewport でフッターに隠れない
  test('E2E-MOBILE-FOOTER-004: 発表モードの「もう一度ピック！」がフッターを覆わない', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')

    // 5人状態で抽選し reveal 完了を待つ
    const addPlayerBtn = page.getByRole('button', { name: 'プレイヤーを追加' })
    for (let i = 0; i < 4; i++) {
      await addPlayerBtn.click()
    }
    await page.getByTestId('pick-button').click()

    const rerollAll = page.getByTestId('reroll-all-button')
    await expect(rerollAll).toBeVisible({ timeout: 5000 })

    await scrollToBottom(page)

    const footer = page.locator('footer')
    const rerollBox = await rerollAll.boundingBox()
    const footerBox = await footer.boundingBox()
    if (!rerollBox)
      throw new Error('reroll-all-button の boundingBox() が null')
    if (!footerBox) throw new Error('footer の boundingBox() が null')

    expect(rerollBox.y + rerollBox.height).toBeLessThanOrEqual(footerBox.y)

    // アクショナビリティも確認
    await rerollAll.click({ trial: true })
  })
})
