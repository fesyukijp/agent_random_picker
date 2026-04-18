import { test, expect } from '@playwright/test'

test.describe('Issue #39: モバイルロール人数制限レイアウト', () => {
  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto('/')
  })

  // E2E-MOBILE-001: 390px幅でロール人数制限が水平スクロールなしに表示
  test('E2E-MOBILE-001: 390px幅でロール人数制限に水平スクロールが発生しない', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await expect(page.getByTestId('party-settings')).toBeVisible()

    // bodyが水平スクロールしていないことを確認
    const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
    const clientWidth = await page.evaluate(() => document.body.clientWidth)
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth)
  })

  // E2E-MOBILE-002: 390px幅でロール制限の全入力フィールドが操作可能
  test('E2E-MOBILE-002: 390px幅でロール人数制限の入力フィールドが全て操作可能', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await expect(page.getByTestId('party-settings')).toBeVisible()

    // ロール人数制限アコーディオンを開く
    await page
      .getByRole('button', { name: 'ロール人数制限', exact: true })
      .click()

    // 全ロールの入力フィールドがビューポート内に表示されること
    for (const roleId of ['duelist', 'initiator', 'controller', 'sentinel']) {
      const minInput = page.getByTestId(`role-limit-${roleId}-min`)
      const maxInput = page.getByTestId(`role-limit-${roleId}-max`)

      await expect(minInput).toBeVisible()
      await expect(maxInput).toBeVisible()

      // 入力フィールドがビューポートの右端を超えていないこと
      const minBox = await minInput.boundingBox()
      const maxBox = await maxInput.boundingBox()
      if (!minBox || !maxBox) throw new Error('bounding box is null')
      expect(minBox.x + minBox.width).toBeLessThanOrEqual(390)
      expect(maxBox.x + maxBox.width).toBeLessThanOrEqual(390)
    }
  })

  // E2E-MOBILE-003: 390px幅でロール人数制限の入力値が変更可能
  test('E2E-MOBILE-003: 390px幅でduelistのmin値を変更できる', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    // ロール人数制限アコーディオンを開く
    await page
      .getByRole('button', { name: 'ロール人数制限', exact: true })
      .click()

    const minInput = page.getByTestId('role-limit-duelist-min')
    await minInput.fill('1')
    await expect(minInput).toHaveValue('1')
  })
})
