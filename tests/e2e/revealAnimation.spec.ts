import { test, expect } from '@playwright/test'

test.describe('Issue #18: 発表演出実装（スタックリスト型）', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // E2E-REVEAL-001: RANDOMIZE後、行が順番に点灯する
  test('E2E-REVEAL-001: RANDOMIZE後、行が順番に点灯する', async ({ page }) => {
    // 2人プレイヤーを用意
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await expect(page.getByTestId('player-card')).toHaveCount(2)

    // RANDOMIZE実行
    await page.getByTestId('pick-button').click()

    // 最初の行がrevealingになるまで待つ
    const firstRow = page.getByTestId('result-item').nth(0)
    const secondRow = page.getByTestId('result-item').nth(1)

    await expect(firstRow).toHaveAttribute('data-status', 'revealing', {
      timeout: 500,
    })

    // 2行目はまだpending（1行目が発表中の間）
    await expect(secondRow).toHaveAttribute('data-status', 'pending')

    // 1行目がconfirmedになり、2行目がrevealingになるまで待つ
    await expect(firstRow).toHaveAttribute('data-status', 'confirmed', {
      timeout: 1500,
    })
    await expect(secondRow).toHaveAttribute('data-status', 'revealing', {
      timeout: 1500,
    })
  })

  // E2E-REVEAL-002: 全員発表後に「もう一度ピック」ボタンが出現する
  test('E2E-REVEAL-002: 全員発表後にもう一度ピックボタンが出現する', async ({
    page,
  }) => {
    // RANDOMIZE実行（1人）
    await page.getByTestId('pick-button').click()

    // result-itemが表示される
    await expect(page.getByTestId('result-item')).toHaveCount(1)

    // 演出完了後にもう一度ピックボタンが出現する（1人×500ms + 余裕）
    const rerollButton = page.getByTestId('reroll-all-button')
    await expect(rerollButton).toBeVisible({ timeout: 2000 })

    // もう一度ピックボタンをクリックすると再抽選が実行される
    await rerollButton.click()

    // 再抽選後も同数のresult-itemが表示される
    await expect(page.getByTestId('result-item')).toHaveCount(1)
  })
})
