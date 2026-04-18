import { test, expect } from '@playwright/test'

test.describe('Issue #16: localStorage永続化', () => {
  // E2E-PERSIST-001: 設定のlocalStorage保存・復元（FR-012）
  test('E2E-PERSIST-001: 3人の設定を変更後にページリロードしても設定が復元される', async ({
    page,
  }) => {
    await page.goto('/')

    // プレイヤーを3人に増やす
    const addButton = page.getByRole('button', { name: 'プレイヤーを追加' })
    await addButton.click()
    await addButton.click()
    await expect(page.getByTestId('player-card')).toHaveCount(3)

    // P1〜P3の名前を設定
    const playerCards = page.getByTestId('player-card')
    await playerCards.nth(0).getByRole('textbox').fill('Alice')
    await playerCards.nth(1).getByRole('textbox').fill('Bob')
    await playerCards.nth(2).getByRole('textbox').fill('Carol')

    // ページリロード
    await page.reload()

    // 3人の設定が復元されること
    await expect(page.getByTestId('player-card')).toHaveCount(3)
    const restoredCards = page.getByTestId('player-card')
    await expect(restoredCards.nth(0).getByRole('textbox')).toHaveValue('Alice')
    await expect(restoredCards.nth(1).getByRole('textbox')).toHaveValue('Bob')
    await expect(restoredCards.nth(2).getByRole('textbox')).toHaveValue('Carol')
  })

  // E2E-PERSIST-002: 初回訪問時のデフォルト状態
  test('E2E-PERSIST-002: localStorageクリア後にデフォルト状態（1人）で表示される', async ({
    page,
  }) => {
    // localStorageをクリアしてからアクセス
    await page.goto('/')
    await page.evaluate(() => localStorage.clear())
    await page.reload()

    // 1人、デフォルト設定で表示
    await expect(page.getByTestId('player-card')).toHaveCount(1)
    await expect(
      page.getByTestId('player-card').first().getByRole('textbox'),
    ).toHaveValue('')
  })
})
