import { test, expect } from '@playwright/test'

test.describe('Issue #11: レイアウト・ヘッダー・フッター', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('ページを開くとタイトルが表示される', async ({ page }) => {
    await expect(
      page.getByRole('heading', { name: 'Agent Random Picker' }),
    ).toBeVisible()
  })

  test('ページを開くとメインのランダムピックボタンが表示される', async ({
    page,
  }) => {
    await expect(
      page.getByRole('button', { name: 'ランダムピック！' }),
    ).toBeVisible()
  })
})

test.describe('Issue #29: useThemeStore削除・テーマ切替UI除去', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  test('ヘッダーにテーマ切替ボタンが存在しない（言語切替ボタンのみ）', async ({
    page,
  }) => {
    const header = page.locator('header')
    // 言語切替ボタン1つのみ（テーマ切替ボタンは削除済み）
    await expect(header.getByRole('button')).toHaveCount(1)
    await expect(header.getByTestId('language-toggle')).toBeVisible()
  })
})
