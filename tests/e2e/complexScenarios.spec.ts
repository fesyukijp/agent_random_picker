import { test, expect } from '@playwright/test'

test.describe('Issue #19: 複合シナリオ', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // E2E-COMPLEX-001: 5人フルパーティー抽選
  test('E2E-COMPLEX-001: 5人フルパーティーで全員異なるエージェントが割り当てられる', async ({
    page,
  }) => {
    // 4人追加して5人にする
    const addButton = page.getByRole('button', { name: 'プレイヤーを追加' })
    await addButton.click()
    await addButton.click()
    await addButton.click()
    await addButton.click()
    await expect(page.getByTestId('player-card')).toHaveCount(5)

    // 重複不可に設定（デフォルトでOFF=重複不可）
    const allowDuplicatesToggle = page.getByTestId('allow-duplicates-toggle')
    await expect(allowDuplicatesToggle).not.toBeChecked()

    // ロール人数制限アコーディオンを開く
    await page
      .getByRole('button', { name: 'ロール人数制限', exact: true })
      .click()

    // 各プレイヤーにロール制限設定（duelistのmin=1,max=2）
    await page.getByTestId('role-limit-duelist-min').fill('1')
    await page.getByTestId('role-limit-duelist-max').fill('2')

    // ランダムピック実行
    await page.getByRole('button', { name: 'ランダムピック！' }).click()

    // 全5人の結果が表示される
    const resultItems = page.getByTestId('result-item')
    await expect(resultItems).toHaveCount(5, { timeout: 5000 })

    // 全プレイヤーにエージェント名が表示される
    const agentNames = page.getByTestId('result-agent-name')
    await expect(agentNames).toHaveCount(5)

    // 全員のエージェント名を収集して重複がないことを確認
    const names: string[] = []
    for (let i = 0; i < 5; i++) {
      const name = await agentNames.nth(i).textContent()
      expect(name).toBeTruthy()
      names.push(name ?? '')
    }
    const uniqueNames = new Set(names)
    expect(uniqueNames.size).toBe(5)

    // duelistのロール制限が充足されている（1〜2人）
    const duelistResults = page.getByTestId('result-role-duelist')
    const duelistCount = await duelistResults.count()
    expect(duelistCount).toBeGreaterThanOrEqual(1)
    expect(duelistCount).toBeLessThanOrEqual(2)
  })

  // E2E-COMPLEX-002: 設定変更→抽選→個別再抽選→全体再抽選
  test('E2E-COMPLEX-002: 設定変更→抽選→P2個別再抽選→全体再抽選で各段階で正しい結果が出る', async ({
    page,
  }) => {
    // 2人追加して3人にする
    const addButton = page.getByRole('button', { name: 'プレイヤーを追加' })
    await addButton.click()
    await addButton.click()
    await expect(page.getByTestId('player-card')).toHaveCount(3)

    // P1のロール設定: sentinelのみ
    const p1Card = page.getByTestId('player-card').nth(0)
    await p1Card.getByRole('button', { name: 'ロール設定' }).click()
    await p1Card
      .getByRole('button', { name: 'すべてのロールをオフにする' })
      .click()
    await p1Card.getByTestId('role-toggle-sentinel').click()

    // ランダムピック実行
    await page.getByRole('button', { name: 'ランダムピック！' }).click()

    // 発表完了まで待つ
    const rerollAllButton = page.getByTestId('reroll-all-button')
    await expect(rerollAllButton).toBeVisible({ timeout: 5000 })

    // 3人全員に結果が表示される
    await expect(page.getByTestId('result-agent-name')).toHaveCount(3)

    // P1がsentinelであることを確認
    const p1ResultCard = page.getByTestId('player-card').nth(0)
    await expect(p1ResultCard.getByTestId('result-role-sentinel')).toBeVisible()

    // P2の結果を記録
    const p2Card = page.getByTestId('player-card').nth(1)
    const p2AgentName = await p2Card
      .getByTestId('result-agent-name')
      .textContent()
    expect(p2AgentName).toBeTruthy()

    // P2個別再抽選
    await p2Card.getByTestId('reroll-button').click()

    // P2に結果が表示されている
    await expect(p2Card.getByTestId('result-agent-name')).toBeVisible()

    // 全体再抽選
    await rerollAllButton.click()

    // 発表完了まで待つ
    await expect(rerollAllButton).toBeVisible({ timeout: 5000 })

    // 3人全員に結果が引き続き表示される
    await expect(page.getByTestId('result-agent-name')).toHaveCount(3)
  })

  // E2E-COMPLEX-003: プレイヤー削除後の抽選
  test('E2E-COMPLEX-003: 3人で抽選後にP3を削除して2人で再抽選できる', async ({
    page,
  }) => {
    // 2人追加して3人にする
    const addButton = page.getByRole('button', { name: 'プレイヤーを追加' })
    await addButton.click()
    await addButton.click()
    await expect(page.getByTestId('player-card')).toHaveCount(3)

    // ランダムピック実行
    await page.getByRole('button', { name: 'ランダムピック！' }).click()

    // 発表完了まで待つ
    const rerollAllButton = page.getByTestId('reroll-all-button')
    await expect(rerollAllButton).toBeVisible({ timeout: 5000 })

    // 3人分の結果が表示される
    await expect(page.getByTestId('result-agent-name')).toHaveCount(3)

    // セットアップに戻る
    await page.getByTestId('back-to-setup-button').click()
    await expect(page.getByTestId('player-card')).toHaveCount(3)

    // P3を削除
    const deleteButtons = page.getByRole('button', { name: 'プレイヤーを削除' })
    await deleteButtons.last().click()
    await expect(page.getByTestId('player-card')).toHaveCount(2)

    // 2人で再度ランダムピック
    await page.getByRole('button', { name: 'ランダムピック！' }).click()

    // 2人分の結果が表示される
    const resultItems = page.getByTestId('result-item')
    await expect(resultItems).toHaveCount(2, { timeout: 5000 })
    await expect(page.getByTestId('result-agent-name')).toHaveCount(2)
  })
})
