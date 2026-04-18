import { test, expect } from '@playwright/test'
import { setRoleLimits, setDeadlockCondition } from './helpers/stores'

const ROLE_NAMES = [
  'デュエリスト',
  'イニシエーター',
  'コントローラー',
  'センチネル',
]

test.describe('Issue #15: 抽選実行・結果表示UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // E2E-PICK-001: ボタンクリック→エージェント画像・名前・ロール表示
  test('E2E-PICK-001: ランダムピックボタンクリックでエージェント情報が表示される', async ({
    page,
  }) => {
    // 初期状態: プレースホルダー（?）が表示されている
    await expect(page.getByTestId('result-placeholder').first()).toBeVisible()

    // ピック実行
    await page.getByTestId('pick-button').click()

    // 結果表示: エージェント名・ロール・画像が表示される（演出完了を待つ）
    const agentName = page.getByTestId('result-agent-name').first()
    const agentRole = page.getByTestId('result-agent-role').first()
    const agentImage = page.getByTestId('result-agent-image').first()

    await expect(agentName).toBeVisible()
    await expect(agentRole).toBeVisible()
    await expect(agentImage).toBeVisible()

    // ロール名が既知のロール名のいずれか
    const roleText = await agentRole.textContent()
    expect(ROLE_NAMES.some((name) => roleText?.includes(name))).toBeTruthy()

    // プレースホルダーは非表示
    await expect(page.getByTestId('result-placeholder')).toHaveCount(0)
  })

  // E2E-PICK-002: 再度ピック→新結果
  test('E2E-PICK-002: もう一度ピックで再抽選が実行される', async ({ page }) => {
    // 1回目のピック
    await page.getByTestId('pick-button').click()

    // 演出完了まで待つ（reroll-all-button が出現する）
    const rerollAllButton = page.getByTestId('reroll-all-button')
    await expect(rerollAllButton).toBeVisible({ timeout: 3000 })

    // もう一度ピック
    await rerollAllButton.click()

    // 結果が引き続き表示されること
    await expect(page.getByTestId('result-agent-name').first()).toBeVisible()
    await expect(page.getByTestId('result-agent-role').first()).toBeVisible()
    await expect(page.getByTestId('result-agent-image').first()).toBeVisible()

    // プレースホルダーは非表示のまま
    await expect(page.getByTestId('result-placeholder')).toHaveCount(0)
  })

  // E2E-PICK-003: P1再抽選→P1のみ変更、P2維持
  test('E2E-PICK-003: 個別再抽選でそのプレイヤーのみ再抽選される', async ({
    page,
  }) => {
    // 2人のプレイヤーを追加
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await expect(page.getByTestId('player-card')).toHaveCount(2)

    // 抽選実行
    await page.getByTestId('pick-button').click()

    // 演出完了まで待つ
    await expect(page.getByTestId('reroll-all-button')).toBeVisible({
      timeout: 3000,
    })

    const p1Card = page.getByTestId('player-card').nth(0)
    const p2Card = page.getByTestId('player-card').nth(1)

    await expect(p1Card.getByTestId('result-agent-name')).toBeVisible()
    await expect(p2Card.getByTestId('result-agent-name')).toBeVisible()

    // P2の結果を記録
    const p2AgentName = await p2Card
      .getByTestId('result-agent-name')
      .textContent()
    expect(p2AgentName).toBeTruthy()

    // P1の個別再抽選
    await p1Card.getByTestId('reroll-button').click()

    // P2の結果が変わっていないこと
    await expect(p2Card.getByTestId('result-agent-name')).toHaveText(
      p2AgentName ?? '',
    )

    // P1にも結果が表示されていること
    await expect(p1Card.getByTestId('result-agent-name')).toBeVisible()
  })

  // E2E-PICK-004: 厳しい条件→エラーメッセージ表示。条件緩和→再抽選成功
  test('E2E-PICK-004: 条件エラー時にエラーメッセージが表示され、条件緩和後は成功する', async ({
    page,
  }) => {
    // 不可能な条件を設定（デュエリスト最小2人、プレイヤー1人）
    await setRoleLimits(page, {
      duelist: { min: 2, max: 5 },
      initiator: { min: 0, max: 5 },
      controller: { min: 0, max: 5 },
      sentinel: { min: 0, max: 5 },
    })

    // ピック実行 → エラー
    await page.getByTestId('pick-button').click()
    await expect(page.getByTestId('pick-error')).toBeVisible()

    // 条件を緩和
    await setRoleLimits(page, {
      duelist: { min: 0, max: 5 },
      initiator: { min: 0, max: 5 },
      controller: { min: 0, max: 5 },
      sentinel: { min: 0, max: 5 },
    })

    // 再抽選成功
    await page.getByTestId('pick-button').click()
    await expect(page.getByTestId('pick-error')).not.toBeVisible()
    await expect(page.getByTestId('result-agent-name').first()).toBeVisible()
  })

  // E2E-DEAD-001: デッドロック条件→エラーメッセージ表示
  test('E2E-DEAD-001: デッドロック条件でエラーメッセージが表示される', async ({
    page,
  }) => {
    // 2人追加して3人にする
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    // 全員が同じエージェントしか使えず重複不可 → デッドロック
    // ジェットだけ許可して重複不可（3人いるのに1体しかない）
    await setDeadlockCondition(page, 'jett', false)

    // ピック実行 → エラー
    await page.getByTestId('pick-button').click()
    await expect(page.getByTestId('pick-error')).toBeVisible()

    const errorText = await page.getByTestId('pick-error').textContent()
    expect(errorText).toBeTruthy()
  })
})
