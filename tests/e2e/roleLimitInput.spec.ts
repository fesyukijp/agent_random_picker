import { test, expect } from '@playwright/test'

/**
 * Issue #2: ロール人数制限 min/max input の UX 改善。
 *  - Playwright fill() はクリア→セット相当で従来どおり動作することを確認
 *  - 手動の「全削除→任意値入力」がユーザー操作として成立すること
 *  - フォーカス時に既存値が全選択され、直接上書きしやすいこと
 *  - 空のまま blur したら前回有効値に戻ること（store 側には不正値を書かない）
 *  - props の min/max 範囲外の入力は UI 側でクランプされること
 */
test.describe('Issue #2: ロール人数制限 input の UX 改善', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    // playerCount=3 にセットする。これにより roleLimits[*].max の初期値は 3（= playerCount）、
    // min の初期値は 0 になる。以降のテストはこの前提で assert している。
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await page.getByRole('button', { name: 'プレイヤーを追加' }).click()
    await expect(page.getByTestId('player-card')).toHaveCount(3)
    await page
      .getByRole('button', { name: 'ロール人数制限', exact: true })
      .click()
  })

  // E2E-PARTY-INPUT-001: 既存値を全消去してから任意値を入力できる
  test('E2E-PARTY-INPUT-001: 最大値を Ctrl+A→Delete で消してから 1 を入力して確定できる', async ({
    page,
  }) => {
    const maxInput = page.getByTestId('role-limit-duelist-max')
    await expect(maxInput).toHaveValue('3')

    await maxInput.focus()
    await maxInput.press('ControlOrMeta+a')
    await maxInput.press('Delete')
    await maxInput.pressSequentially('1')
    await maxInput.blur()

    await expect(maxInput).toHaveValue('1')
  })

  // E2E-PARTY-INPUT-002: 最小値でも同様に全消去→任意値入力できる
  test('E2E-PARTY-INPUT-002: 最小値を Ctrl+A→Delete で消してから 2 を入力して確定できる', async ({
    page,
  }) => {
    const minInput = page.getByTestId('role-limit-duelist-min')
    await expect(minInput).toHaveValue('0')

    await minInput.focus()
    await minInput.press('ControlOrMeta+a')
    await minInput.press('Delete')
    await minInput.pressSequentially('2')
    await minInput.blur()

    await expect(minInput).toHaveValue('2')
  })

  // E2E-PARTY-INPUT-003: 空文字のまま blur すると前回の有効値に戻る（max）
  test('E2E-PARTY-INPUT-003a: 最大値を全削除したまま blur すると前回有効値が復元される', async ({
    page,
  }) => {
    const maxInput = page.getByTestId('role-limit-duelist-max')
    await expect(maxInput).toHaveValue('3')

    await maxInput.focus()
    await maxInput.press('ControlOrMeta+a')
    await maxInput.press('Delete')
    await expect(maxInput).toHaveValue('')

    await maxInput.blur()
    await expect(maxInput).toHaveValue('3')
  })

  // E2E-PARTY-INPUT-003b: 空文字のまま blur すると前回の有効値に戻る（min）
  // min と max は NumberInput の独立インスタンスであり、state 共有がないことも併せて担保する。
  test('E2E-PARTY-INPUT-003b: 最小値を全削除したまま blur すると前回有効値が復元される', async ({
    page,
  }) => {
    const minInput = page.getByTestId('role-limit-duelist-min')
    // 一旦 2 に変更してから空にして blur → 2 に戻ることで「前回有効値の保持」を検証
    await minInput.fill('2')
    await expect(minInput).toHaveValue('2')

    await minInput.focus()
    await minInput.press('ControlOrMeta+a')
    await minInput.press('Delete')
    await expect(minInput).toHaveValue('')

    await minInput.blur()
    await expect(minInput).toHaveValue('2')
  })

  // E2E-PARTY-INPUT-004: フォーカス直後にキー入力すると全選択分が置き換えられる
  // onFocus での select() により「既存値が全選択状態」になる効果を、
  // 「全選択されていないと生じない動作（1 文字入力で値全体が置換される）」で検証する。
  // selectionStart/End は <input type="number"> では Chromium が null を返すため直接検証できない。
  test('E2E-PARTY-INPUT-004: フォーカス直後にキー入力すると全選択分が置き換えられる', async ({
    page,
  }) => {
    const maxInput = page.getByTestId('role-limit-duelist-max')
    await expect(maxInput).toHaveValue('3')

    await maxInput.focus()
    await maxInput.pressSequentially('1')
    await maxInput.blur()

    // select() が効かなければ "31" となり clamp で "3" に戻るはず。
    // "1" で確定することが select() の効果の間接証拠になる。
    await expect(maxInput).toHaveValue('1')
  })

  // E2E-PARTY-INPUT-005: max に playerCount を超える値を入力すると UI 側で playerCount にクランプされる
  test('E2E-PARTY-INPUT-005: 最大値に playerCount(3) 超え 9 を fill すると 3 にクランプされる', async ({
    page,
  }) => {
    const maxInput = page.getByTestId('role-limit-duelist-max')
    await maxInput.fill('9')
    await maxInput.blur()

    await expect(maxInput).toHaveValue('3')
  })

  // E2E-PARTY-INPUT-006: min に現在の max を超える値を入力すると max 値にクランプされる
  test('E2E-PARTY-INPUT-006: max=1 設定後に min へ 4 を fill すると 1 にクランプされる', async ({
    page,
  }) => {
    const maxInput = page.getByTestId('role-limit-duelist-max')
    const minInput = page.getByTestId('role-limit-duelist-min')

    // 先に max を 1 に下げる
    await maxInput.fill('1')
    await maxInput.blur()
    await expect(maxInput).toHaveValue('1')

    // min に max を超える値 4 を入力 → NumberInput props max=limit.max=1 でクランプ
    await minInput.fill('4')
    await minInput.blur()
    await expect(minInput).toHaveValue('1')
  })

  // E2E-PARTY-INPUT-007: min=0 の最小境界値を明示的に設定できる
  test('E2E-PARTY-INPUT-007: min に 0 を入力して blur すると 0 を維持する', async ({
    page,
  }) => {
    const minInput = page.getByTestId('role-limit-duelist-min')

    // 一旦 2 に変更してから 0 に戻す
    await minInput.fill('2')
    await minInput.blur()
    await expect(minInput).toHaveValue('2')

    await minInput.fill('0')
    await minInput.blur()
    await expect(minInput).toHaveValue('0')
  })
})
