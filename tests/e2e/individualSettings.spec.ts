import { test, expect } from '@playwright/test'

test.describe('Issue #13: 個別設定UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // E2E-SETTINGS-001: ロール設定のオン/オフ（FR-007）
  test('E2E-SETTINGS-001: ロール設定のトグルが正常に動作する', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    // ロール設定を展開
    await playerCard.getByRole('button', { name: 'ロール設定' }).click()

    // デュエリストはデフォルトでオン
    const duelistBtn = playerCard.getByTestId('role-toggle-duelist')
    await expect(duelistBtn).toHaveAttribute('aria-pressed', 'true')

    // クリックしてオフ
    await duelistBtn.click()
    await expect(duelistBtn).toHaveAttribute('aria-pressed', 'false')

    // もう一度クリックしてオン
    await duelistBtn.click()
    await expect(duelistBtn).toHaveAttribute('aria-pressed', 'true')
  })

  // E2E-SETTINGS-002: ロール一括操作（FR-007）
  test('E2E-SETTINGS-002: ロールの一括オン/オフが正常に動作する', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    // ロール設定を展開
    await playerCard.getByRole('button', { name: 'ロール設定' }).click()

    // すべてオフ（最低1つのロールは維持される）
    await playerCard
      .getByRole('button', { name: 'すべてのロールをオフにする' })
      .click()

    const activeRolesAfterOff = playerCard.locator(
      '[data-testid^="role-toggle-"][aria-pressed="true"]',
    )
    await expect(activeRolesAfterOff).toHaveCount(0)

    // すべてオン
    await playerCard
      .getByRole('button', { name: 'すべてのロールをオンにする' })
      .click()

    const activeRolesAfterOn = playerCard.locator(
      '[data-testid^="role-toggle-"][aria-pressed="true"]',
    )
    await expect(activeRolesAfterOn).toHaveCount(4)
  })

  // E2E-SETTINGS-003: エージェント設定のオン/オフ（FR-008）
  test('E2E-SETTINGS-003: エージェント設定のトグルが正常に動作する', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    // エージェント設定を展開
    await playerCard.getByRole('button', { name: 'エージェント設定' }).click()

    // ジェットはデフォルトでオン（excludedAgentIdsが空）
    const jettBtn = playerCard.getByTestId('agent-toggle-jett')
    await expect(jettBtn).toHaveAttribute('aria-pressed', 'true')

    // クリックしてオフ（除外リストに追加）
    await jettBtn.click()
    await expect(jettBtn).toHaveAttribute('aria-pressed', 'false')

    // もう一度クリックしてオン（除外リストから削除）
    await jettBtn.click()
    await expect(jettBtn).toHaveAttribute('aria-pressed', 'true')
  })

  // E2E-SETTINGS-004: エージェント一括操作（FR-008）
  test('E2E-SETTINGS-004: エージェントの一括オン/オフが正常に動作する', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    // エージェント設定を展開
    await playerCard.getByRole('button', { name: 'エージェント設定' }).click()

    // すべてオフ
    await playerCard
      .getByRole('button', { name: 'すべてのエージェントをオフにする' })
      .click()

    const activeAgentsAfterOff = playerCard.locator(
      '[data-testid^="agent-toggle-"][aria-pressed="true"]',
    )
    await expect(activeAgentsAfterOff).toHaveCount(0)

    // すべてオン
    await playerCard
      .getByRole('button', { name: 'すべてのエージェントをオンにする' })
      .click()

    const inactiveAgentsAfterOn = playerCard.locator(
      '[data-testid^="agent-toggle-"][aria-pressed="false"]',
    )
    await expect(inactiveAgentsAfterOn).toHaveCount(0)
  })

  // E2E-SETTINGS-005: ロール設定が抽選結果に反映（FR-007）
  // NOTE: このテストはIssue #15（抽選実行・結果表示UI）の実装が完了後にパスする
  test('E2E-SETTINGS-005: sentinelのみオンにして抽選するとsentinelエージェントのみが結果に出る', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    // ロール設定を展開
    await playerCard.getByRole('button', { name: 'ロール設定' }).click()

    // すべてオフ（duelistのみ残る）
    await playerCard
      .getByRole('button', { name: 'すべてのロールをオフにする' })
      .click()

    // sentinelを有効化（sentinelのみになる）
    await playerCard.getByTestId('role-toggle-sentinel').click()

    // sentinelのみがアクティブであることを確認
    await expect(
      playerCard.getByTestId('role-toggle-sentinel'),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(playerCard.getByTestId('role-toggle-duelist')).toHaveAttribute(
      'aria-pressed',
      'false',
    )

    // ランダムピック実行
    await page.getByRole('button', { name: 'ランダムピック！' }).click()

    // 演出完了（confirmed）まで待ってからロールを確認
    const resultItem = page.getByTestId('result-item').first()
    await expect(resultItem).toHaveAttribute('data-status', 'confirmed')
    await expect(resultItem.getByTestId('result-role-sentinel')).toBeVisible()
  })

  // E2E-SETTINGS-006: エージェントがロール別セクションで表示される（Issue #40）
  test('E2E-SETTINGS-006: エージェント設定がロール別セクションに分類して表示される', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()
    await playerCard.getByRole('button', { name: 'エージェント設定' }).click()

    // 4ロールのセクションヘッダーが表示される
    await expect(
      playerCard.getByTestId('agent-section-role-duelist'),
    ).toBeVisible()
    await expect(
      playerCard.getByTestId('agent-section-role-initiator'),
    ).toBeVisible()
    await expect(
      playerCard.getByTestId('agent-section-role-controller'),
    ).toBeVisible()
    await expect(
      playerCard.getByTestId('agent-section-role-sentinel'),
    ).toBeVisible()

    // ジェットはデュエリストセクション内に存在する
    await expect(playerCard.getByTestId('agent-toggle-jett')).toBeVisible()
  })

  // E2E-SETTINGS-007: ロールOFFのセクションはグレーアウト表示（Issue #40）
  test('E2E-SETTINGS-007: ロールOFF時にセクションヘッダーのaria-pressedがfalseになる', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    // まずロール設定でduelistをOFF
    await playerCard.getByRole('button', { name: 'ロール設定' }).click()
    await playerCard.getByTestId('role-toggle-duelist').click()
    await playerCard.getByRole('button', { name: 'ロール設定' }).click()

    // エージェント設定を展開
    await playerCard.getByRole('button', { name: 'エージェント設定' }).click()

    // duelistセクションのヘッダーはaria-pressed="false"
    await expect(
      playerCard.getByTestId('agent-section-role-duelist'),
    ).toHaveAttribute('aria-pressed', 'false')

    // initiatorセクションのヘッダーはaria-pressed="true"（ONのまま）
    await expect(
      playerCard.getByTestId('agent-section-role-initiator'),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  // E2E-SETTINGS-008: ロールOFF中にエージェントをONにすると親ロールが自動でON（Issue #40）
  test('E2E-SETTINGS-008: ロールOFF中にエージェントをONにすると親ロールが自動でONになる', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    // エージェント設定を展開
    await playerCard.getByRole('button', { name: 'エージェント設定' }).click()

    // duelistセクションヘッダーをクリックしてOFFにする
    await playerCard.getByTestId('agent-section-role-duelist').click()
    await expect(
      playerCard.getByTestId('agent-section-role-duelist'),
    ).toHaveAttribute('aria-pressed', 'false')

    // jett（duelist）をON → duelistロールが自動でON
    await playerCard.getByTestId('agent-toggle-jett').click()
    await expect(playerCard.getByTestId('agent-toggle-jett')).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await expect(
      playerCard.getByTestId('agent-section-role-duelist'),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  // E2E-SETTINGS-009: AgentSettingsのロールヘッダーでロールのON/OFFが操作できる（Issue #40）
  test('E2E-SETTINGS-009: エージェント設定のロールヘッダーをクリックするとロールがトグルされる', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()
    await playerCard.getByRole('button', { name: 'エージェント設定' }).click()

    // duelistセクションヘッダーをクリック → duelistがOFF
    await playerCard.getByTestId('agent-section-role-duelist').click()
    await expect(
      playerCard.getByTestId('agent-section-role-duelist'),
    ).toHaveAttribute('aria-pressed', 'false')

    // もう一度クリック → duelistがON
    await playerCard.getByTestId('agent-section-role-duelist').click()
    await expect(
      playerCard.getByTestId('agent-section-role-duelist'),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  // E2E-SETTINGS-010: ロール設定バッジ — デフォルト時は非表示（Issue #41）
  test('E2E-SETTINGS-010: デフォルト状態ではロール設定バッジが表示されない', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    await expect(
      playerCard.getByTestId('role-settings-badge'),
    ).not.toBeVisible()
  })

  // E2E-SETTINGS-011: ロール設定バッジ — ロールを無効化するとバッジが表示される（Issue #41）
  test('E2E-SETTINGS-011: ロールを無効化するとロール設定バッジが表示される', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    // ロール設定を展開
    await playerCard.getByRole('button', { name: 'ロール設定' }).click()

    // デュエリストをオフ
    await playerCard.getByTestId('role-toggle-duelist').click()

    // バッジが表示される（3/4）
    const badge = playerCard.getByTestId('role-settings-badge')
    await expect(badge).toBeVisible()
    await expect(badge).toContainText('3/4')
  })

  // E2E-SETTINGS-012: エージェント設定バッジ — デフォルト時は非表示（Issue #41）
  test('E2E-SETTINGS-012: デフォルト状態ではエージェント設定バッジが表示されない', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    await expect(
      playerCard.getByTestId('agent-settings-badge'),
    ).not.toBeVisible()
  })

  // E2E-SETTINGS-013: エージェント設定バッジ — エージェントを無効化するとバッジが表示される（Issue #41）
  test('E2E-SETTINGS-013: エージェントを無効化するとエージェント設定バッジが表示される', async ({
    page,
  }) => {
    const playerCard = page.getByTestId('player-card').first()

    // エージェント設定を展開
    await playerCard.getByRole('button', { name: 'エージェント設定' }).click()

    // ジェットをオフ
    await playerCard.getByTestId('agent-toggle-jett').click()

    // バッジが表示される（28/29）
    const badge = playerCard.getByTestId('agent-settings-badge')
    await expect(badge).toBeVisible()
    await expect(badge).toContainText('28/29')
  })
})
