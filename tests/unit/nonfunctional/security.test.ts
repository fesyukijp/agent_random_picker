import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerStore } from '../../../src/stores/playerStore'
import { storeWithPersist, resetStore } from '../helpers/storeHelpers'

const STORAGE_KEY = 'agent-picker-players'

beforeEach(() => {
  resetStore()
})

// ===== 非機能テスト: セキュリティ =====

describe('非機能テスト: セキュリティ', () => {
  // NFT-SEC-001: XSS対策（プレイヤー名）
  it('NFT-SEC-001: プレイヤー名にスクリプトタグを入力しても文字列として保存される', () => {
    // Arrange
    const xssInput = '<script>alert(1)</script>'
    const { players, updatePlayerName } = usePlayerStore.getState()
    const playerId = players[0].id

    // Act
    updatePlayerName(playerId, xssInput)

    // Assert: ストア内で文字列として保存されていること
    const storedName = usePlayerStore.getState().players[0].settings.name
    expect(typeof storedName).toBe('string')
    // MAX_NAME_LENGTH=20 でトリミングされた文字列として取得できること
    expect(storedName).toBe(xssInput.slice(0, 20))

    // localStorageへのシリアライズ後も文字列として扱われること
    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()
    if (!stored) throw new Error('localStorage に値が見つかりません')
    const parsed: { state: { players: [{ settings: { name: string } }] } } =
      JSON.parse(stored)
    expect(typeof parsed.state.players[0].settings.name).toBe('string')
  })

  // NFT-SEC-002: localStorage改ざん耐性
  it('NFT-SEC-002: localStorageにスクリプトタグを含む不正ロール値を注入してもフィルタリングされる', async () => {
    // Arrange: スクリプトタグを含む不正なallowedRolesを注入
    const maliciousData = JSON.stringify({
      state: {
        players: [
          {
            id: 'player-1',
            settings: {
              name: 'テストプレイヤー',
              allowedRoles: {
                __type: 'Set',
                // 不正な値: スクリプトタグや有効でないロールID
                values: [
                  '<script>document.cookie</script>',
                  'duelist',
                  'INVALID_ROLE',
                ],
              },
              excludedAgentIds: { __type: 'Set', values: [] },
            },
          },
        ],
        partySettings: {
          allowDuplicates: false,
          roleLimits: {
            duelist: { min: 0, max: 5 },
            initiator: { min: 0, max: 5 },
            controller: { min: 0, max: 5 },
            sentinel: { min: 0, max: 5 },
          },
          agentConstraints: {},
        },
      },
      version: 1,
    })
    localStorage.setItem(STORAGE_KEY, maliciousData)

    // Act
    await storeWithPersist.persist.rehydrate()

    // Assert: 不正なロール値が除去され、有効なロールIDのみ残ること
    const allowedRoles =
      usePlayerStore.getState().players[0].settings.allowedRoles
    const validRoleIds = ['duelist', 'initiator', 'controller', 'sentinel']

    // スクリプトタグが allowedRoles に混入していないこと
    for (const role of allowedRoles) {
      expect(validRoleIds).toContain(role)
    }

    // 有効なロール 'duelist' は保持されること
    expect(allowedRoles.has('duelist')).toBe(true)

    // 無効値の件数: 'duelist' のみが有効で、他2件（スクリプトタグ, INVALID_ROLE）は除去
    expect(allowedRoles.size).toBe(1)
  })
})
