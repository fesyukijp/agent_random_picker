import { test, expect } from '@playwright/test'

test.describe('Issue #12: プレイヤー管理UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // E2E-PLAYER-001: +ボタンで5人まで追加、5人で+ボタン非表示
  test('E2E-PLAYER-001: +ボタンで5人まで追加でき、5人で+ボタンが非表示になる', async ({
    page,
  }) => {
    await expect(page.getByTestId('player-card')).toHaveCount(1)

    const addButton = page.getByRole('button', { name: 'プレイヤーを追加' })
    await expect(addButton).toBeVisible()

    await addButton.click()
    await expect(page.getByTestId('player-card')).toHaveCount(2)

    await addButton.click()
    await expect(page.getByTestId('player-card')).toHaveCount(3)

    await addButton.click()
    await expect(page.getByTestId('player-card')).toHaveCount(4)

    await addButton.click()
    await expect(page.getByTestId('player-card')).toHaveCount(5)

    await expect(addButton).not.toBeVisible()
  })

  // E2E-PLAYER-002: 削除ボタンでプレイヤー削除、1人の時は削除ボタン非表示
  test('E2E-PLAYER-002: 1人の時は削除ボタンが非表示で、2人以上で表示・削除できる', async ({
    page,
  }) => {
    await expect(page.getByTestId('player-card')).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: 'プレイヤーを削除' }),
    ).toHaveCount(0)

    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await expect(page.getByTestId('player-card')).toHaveCount(2)
    await expect(
      page.getByRole('button', { name: 'プレイヤーを削除' }),
    ).toHaveCount(2)

    await page.getByRole('button', { name: 'プレイヤーを削除' }).first().click()
    await expect(page.getByTestId('player-card')).toHaveCount(1)
    await expect(
      page.getByRole('button', { name: 'プレイヤーを削除' }),
    ).toHaveCount(0)
  })

  // E2E-PLAYER-003: 名前入力→表示反映
  test('E2E-PLAYER-003: プレイヤー名を入力すると表示に反映される', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()
    const nameInput = playerCard.getByRole('textbox')

    await nameInput.fill('ゲーマー')

    await expect(playerCard.getByText('ゲーマー')).toBeVisible()
  })

  // E2E-PLAYER-004: 空欄→デフォルト名表示
  test('E2E-PLAYER-004: 名前が空欄の場合はデフォルト名（プレイヤーN）が表示される', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    await expect(playerCard.getByText('プレイヤー1')).toBeVisible()

    const nameInput = playerCard.getByRole('textbox')
    await nameInput.fill('テスト')
    await nameInput.clear()

    await expect(playerCard.getByText('プレイヤー1')).toBeVisible()
  })

  // E2E-PLAYER-005: 削除ボタンのタッチターゲットが 44×44px 以上
  test('E2E-PLAYER-005: 削除ボタンのタッチターゲットが WCAG 2.1 AA 基準（44×44px）を満たす', async ({
    page,
  }) => {
    // 2人にして削除ボタンを表示する（PlayerRow の setup モードが描画される）
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await expect(page.getByTestId('player-card')).toHaveCount(2)

    const deleteButton = page
      .getByRole('button', { name: 'プレイヤーを削除' })
      .first()
    await expect(deleteButton).toBeVisible()

    const box = await deleteButton.boundingBox()
    if (!box) throw new Error('削除ボタンの boundingBox が取得できません')
    expect(box.width).toBeGreaterThanOrEqual(44)
    expect(box.height).toBeGreaterThanOrEqual(44)
  })
})
