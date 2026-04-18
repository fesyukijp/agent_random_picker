import { test, expect } from '@playwright/test'

test.describe('Issue #14: 全体設定UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
  })

  // E2E-PARTY-001: 1人→非表示、2人→表示
  test('E2E-PARTY-001: プレイヤーが1人の時は全体設定を非表示、2人以上で表示', async ({
    page,
  }) => {
    await expect(page.getByTestId('party-settings')).not.toBeVisible()

    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await expect(page.getByTestId('player-card')).toHaveCount(2)

    await expect(page.getByTestId('party-settings')).toBeVisible()

    await page.getByRole('button', { name: 'プレイヤーを削除' }).first().click()
    await expect(page.getByTestId('player-card')).toHaveCount(1)

    await expect(page.getByTestId('party-settings')).not.toBeVisible()
  })

  // E2E-PARTY-002: 重複許可の切替
  test('E2E-PARTY-002: 重複許可トグルを切り替えられる', async ({ page }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    const toggle = page.getByTestId('allow-duplicates-toggle')
    await expect(toggle).toBeVisible()

    // デフォルトはOFF（重複不可）
    await expect(toggle).not.toBeChecked()

    // ONに切り替え
    await toggle.click()
    await expect(toggle).toBeChecked()

    // OFFに戻す
    await toggle.click()
    await expect(toggle).not.toBeChecked()
  })

  // E2E-PARTY-ACC-001: 初期状態で折りたたまれている
  test('E2E-PARTY-ACC-001: 初期状態でロール人数制限・エージェント制約は折りたたまれている', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    await expect(page.getByTestId('role-limit-duelist-min')).not.toBeVisible()
    await expect(
      page.getByTestId('agent-constraint-jett-required'),
    ).not.toBeVisible()
  })

  // E2E-PARTY-ACC-002: ロール人数制限アコーディオンの開閉
  test('E2E-PARTY-ACC-002: ロール人数制限ボタンをクリックで展開・再クリックで閉じる', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    const btn = page.getByRole('button', {
      name: 'ロール人数制限',
      exact: true,
    })
    await expect(btn).toHaveAttribute('aria-expanded', 'false')

    await btn.click()
    await expect(page.getByTestId('role-limit-duelist-min')).toBeVisible()
    await expect(btn).toHaveAttribute('aria-expanded', 'true')

    await btn.click()
    await expect(page.getByTestId('role-limit-duelist-min')).not.toBeVisible()
    await expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  // E2E-PARTY-ACC-003: エージェント制約アコーディオンの開閉
  test('E2E-PARTY-ACC-003: エージェント制約ボタンをクリックで展開・再クリックで閉じる', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    const btn = page.getByRole('button', {
      name: 'エージェント制約',
      exact: true,
    })
    await expect(btn).toHaveAttribute('aria-expanded', 'false')

    await btn.click()
    await expect(
      page.getByTestId('agent-constraint-jett-required'),
    ).toBeVisible()
    await expect(btn).toHaveAttribute('aria-expanded', 'true')

    await btn.click()
    await expect(
      page.getByTestId('agent-constraint-jett-required'),
    ).not.toBeVisible()
    await expect(btn).toHaveAttribute('aria-expanded', 'false')
  })

  // E2E-PARTY-003: ロール人数制限
  test('E2E-PARTY-003: ロール人数制限（duelistのmin=1/max=1）→結果のduelistが1人', async ({
    page,
  }) => {
    // 3人追加
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await expect(page.getByTestId('player-card')).toHaveCount(3)

    // ロール人数制限アコーディオンを開く
    await page
      .getByRole('button', { name: 'ロール人数制限', exact: true })
      .click()

    // duelistのmin=1, max=1に設定
    await page.getByTestId('role-limit-duelist-min').fill('1')
    await page.getByTestId('role-limit-duelist-max').fill('1')

    // ピック実行
    await page.getByRole('button', { name: 'ランダムピック！' }).click()

    // 結果を確認
    const resultItems = page.getByTestId('result-item')
    await expect(resultItems).toHaveCount(3)

    // duelistは1人だけ
    const duelistItems = page.getByTestId('result-role-duelist')
    await expect(duelistItems).toHaveCount(1)
  })

  // E2E-PARTY-004: エージェント制約 - 必須
  test('E2E-PARTY-004: jettを必須に設定すると結果に含まれる', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    // エージェント制約アコーディオンを開く
    await page
      .getByRole('button', { name: 'エージェント制約', exact: true })
      .click()

    // セグメントボタンでjettを必須に設定
    const jettRequired = page.getByTestId('agent-constraint-jett-required')
    await expect(jettRequired).toBeVisible()
    await jettRequired.click()

    // 必須ボタンがアクティブ、対象ボタンが非アクティブ
    const jettAllowed = page.getByTestId('agent-constraint-jett-allowed')
    await expect(jettRequired).toHaveAttribute('aria-pressed', 'true')
    await expect(jettAllowed).toHaveAttribute('aria-pressed', 'false')

    // ピック実行
    await page.getByRole('button', { name: 'ランダムピック！' }).click()

    // jettが結果に含まれる
    const resultItems = page.getByTestId('result-item')
    await expect(resultItems).toHaveCount(2)
    await expect(page.getByTestId('result-agent-jett')).toBeVisible()
  })

  // E2E-PARTY-005: エージェント制約 - 除外
  test('E2E-PARTY-005: jettを除外に設定すると結果に含まれない', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    // エージェント制約アコーディオンを開く
    await page
      .getByRole('button', { name: 'エージェント制約', exact: true })
      .click()

    // セグメントボタンでjettを除外に設定
    const jettBanned = page.getByTestId('agent-constraint-jett-banned')
    await jettBanned.click()
    await expect(jettBanned).toHaveAttribute('aria-pressed', 'true')

    // ピック実行
    await page.getByRole('button', { name: 'ランダムピック！' }).click()

    // jettが結果に含まれない
    await expect(page.getByTestId('result-agent-jett')).toHaveCount(0)
  })

  // E2E-PARTY-006: エージェント制約 - ロール別セクション表示
  test('E2E-PARTY-006: エージェント制約がロール別セクションで表示される', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    // エージェント制約アコーディオンを開く
    await page
      .getByRole('button', { name: 'エージェント制約', exact: true })
      .click()

    // ロール別セクションヘッダーが存在する
    await expect(
      page.getByTestId('agent-constraint-section-duelist'),
    ).toBeVisible()
    await expect(
      page.getByTestId('agent-constraint-section-initiator'),
    ).toBeVisible()
    await expect(
      page.getByTestId('agent-constraint-section-controller'),
    ).toBeVisible()
    await expect(
      page.getByTestId('agent-constraint-section-sentinel'),
    ).toBeVisible()

    // jettはduelistセクション内に存在する
    const duelistSection = page.getByTestId('agent-constraint-section-duelist')
    await expect(
      duelistSection.getByTestId('agent-constraint-jett-required'),
    ).toBeVisible()
  })

  // E2E-PARTY-RST-001: ロール人数制限リセットボタン
  test('E2E-PARTY-RST-001: ロール人数制限リセットボタンでmin/maxがデフォルトに戻る', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    // ロール人数制限アコーディオンを開く
    await page
      .getByRole('button', { name: 'ロール人数制限', exact: true })
      .click()

    // duelistを変更
    await page.getByTestId('role-limit-duelist-min').fill('1')
    await expect(page.getByTestId('role-limit-duelist-min')).toHaveValue('1')

    // リセットボタンをクリック
    await page.getByTestId('reset-role-limits').click()

    // デフォルト値（min=0, max=players.length=2）に戻っている
    await expect(page.getByTestId('role-limit-duelist-min')).toHaveValue('0')
    await expect(page.getByTestId('role-limit-duelist-max')).toHaveValue('2')
  })

  // E2E-PARTY-RST-002: エージェント制約リセットボタン
  test('E2E-PARTY-RST-002: エージェント制約リセットボタンで全て対象に戻る', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    // エージェント制約アコーディオンを開く
    await page
      .getByRole('button', { name: 'エージェント制約', exact: true })
      .click()

    // jettを必須に設定
    await page.getByTestId('agent-constraint-jett-required').click()
    await expect(
      page.getByTestId('agent-constraint-jett-required'),
    ).toHaveAttribute('aria-pressed', 'true')

    // リセットボタンをクリック
    await page.getByTestId('reset-agent-constraints').click()

    // jettが対象（allowed）に戻っている
    await expect(
      page.getByTestId('agent-constraint-jett-allowed'),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByTestId('agent-constraint-jett-required'),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  // E2E-PARTY-BULK-001: ロールヘッダーに一括ボタンが表示される
  test('E2E-PARTY-BULK-001: エージェント制約展開時にロールヘッダー横に一括ボタンが表示される', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await page
      .getByRole('button', { name: 'エージェント制約', exact: true })
      .click()

    // 全4ロールのヘッダー横に一括ボタン（3種）が存在することを確認
    for (const role of ['duelist', 'initiator', 'controller', 'sentinel']) {
      for (const constraint of ['banned', 'allowed', 'required']) {
        await expect(
          page.getByTestId(`role-agent-constraint-${role}-${constraint}`),
        ).toBeVisible()
      }
    }
  })

  // E2E-PARTY-BULK-002: ロール単位一括除外
  // 注意: jett, phoenix は agents.ts の duelist エージェントに依存。
  // エージェント追加・ロール変更時はこのテストも合わせて更新すること。
  test('E2E-PARTY-BULK-002: duelistの一括除外ボタンでduelist全エージェントが除外になる', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await page
      .getByRole('button', { name: 'エージェント制約', exact: true })
      .click()

    // duelistの一括除外ボタンをクリック
    await page.getByTestId('role-agent-constraint-duelist-banned').click()

    // duelist エージェントの代表2体が除外になっていることを確認
    await expect(
      page.getByTestId('agent-constraint-jett-banned'),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByTestId('agent-constraint-phoenix-banned'),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  // E2E-PARTY-BULK-003: ロール単位一括必須
  // 注意: jett, raze は agents.ts の duelist エージェントに依存。
  // エージェント追加・ロール変更時はこのテストも合わせて更新すること。
  test('E2E-PARTY-BULK-003: duelistの一括必須ボタンでduelist全エージェントが必須になる', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await page
      .getByRole('button', { name: 'エージェント制約', exact: true })
      .click()

    // duelistの一括必須ボタンをクリック
    await page.getByTestId('role-agent-constraint-duelist-required').click()

    // duelist エージェントの代表2体が必須になっていることを確認
    await expect(
      page.getByTestId('agent-constraint-jett-required'),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByTestId('agent-constraint-raze-required'),
    ).toHaveAttribute('aria-pressed', 'true')
  })

  // E2E-PARTY-BULK-004: ロール単位一括対象（allowed）
  test('E2E-PARTY-BULK-004: 除外後に一括対象ボタンで全てallowedに戻る', async ({
    page,
  }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await page
      .getByRole('button', { name: 'エージェント制約', exact: true })
      .click()

    // 先にbannedにしてから
    await page.getByTestId('role-agent-constraint-duelist-banned').click()
    await expect(
      page.getByTestId('agent-constraint-jett-banned'),
    ).toHaveAttribute('aria-pressed', 'true')

    // 一括対象に戻す
    await page.getByTestId('role-agent-constraint-duelist-allowed').click()
    await expect(
      page.getByTestId('agent-constraint-jett-allowed'),
    ).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByTestId('agent-constraint-jett-banned'),
    ).toHaveAttribute('aria-pressed', 'false')
  })

  // E2E-PARTY-007: エージェント制約 - 対象に戻す
  test('E2E-PARTY-007: 必須に設定したjettを対象に戻せる', async ({ page }) => {
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()

    // エージェント制約アコーディオンを開く
    await page
      .getByRole('button', { name: 'エージェント制約', exact: true })
      .click()

    // まず必須に設定
    await page.getByTestId('agent-constraint-jett-required').click()

    // 対象ボタンをクリックして戻す
    const jettAllowed = page.getByTestId('agent-constraint-jett-allowed')
    await jettAllowed.click()
    await expect(jettAllowed).toHaveAttribute('aria-pressed', 'true')
    await expect(
      page.getByTestId('agent-constraint-jett-required'),
    ).toHaveAttribute('aria-pressed', 'false')
  })
})
