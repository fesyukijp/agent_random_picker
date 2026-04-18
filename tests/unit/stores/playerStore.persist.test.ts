import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerStore } from '../../../src/stores/playerStore'
import { storeWithPersist, resetStore } from '../helpers/storeHelpers'

const STORAGE_KEY = 'agent-picker-players'

beforeEach(() => {
  resetStore()
})

// ===== localStorage永続化 (ST-PERSIST-001〜005) =====

describe('localStorage永続化', () => {
  // ST-PERSIST-001: 設定変更がlocalStorageに保存される
  it('ST-PERSIST-001: プレイヤー追加後にlocalStorageにデータが存在する', () => {
    usePlayerStore.getState().addPlayer()
    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()
    expect(stored).toContain('players')
  })

  // ST-PERSIST-002: localStorageからの復元
  it('ST-PERSIST-002: localStorageからの復元', async () => {
    // localStorageに保存データをセット（version=1のSet形式）
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          players: [
            {
              id: '00000000-0000-4000-8000-000000000001',
              settings: {
                name: 'RestoredPlayer',
                allowedRoles: {
                  __type: 'Set',
                  values: ['duelist', 'initiator', 'controller', 'sentinel'],
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
      }),
    )

    // localStorageから復元
    await storeWithPersist.persist.rehydrate()
    expect(usePlayerStore.getState().players[0].settings.name).toBe(
      'RestoredPlayer',
    )
  })

  // ST-PERSIST-003: 不正データでデフォルトにフォールバック
  it('ST-PERSIST-003: 不正JSONでデフォルト状態にフォールバック', async () => {
    localStorage.setItem(STORAGE_KEY, 'invalid json ###')

    await storeWithPersist.persist.rehydrate()

    const { players } = usePlayerStore.getState()
    expect(players).toHaveLength(1)
    expect(players[0].settings.name).toBe('')
  })

  // ST-PERSIST-004: バージョン不一致時のマイグレーション
  it('ST-PERSIST-004: version=0のデータがマイグレーションされて復元される', async () => {
    // version=0のデータ: Setが配列として格納されている
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          players: [
            {
              id: 'migrated-id',
              settings: {
                name: 'MigratedPlayer',
                allowedRoles: ['duelist', 'initiator'],
                excludedAgentIds: [],
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
        version: 0,
      }),
    )

    await storeWithPersist.persist.rehydrate()

    const { players } = usePlayerStore.getState()
    expect(players[0].settings.name).toBe('MigratedPlayer')
    expect(players[0].settings.allowedRoles).toBeInstanceOf(Set)
    expect(players[0].settings.allowedRoles.has('duelist')).toBe(true)
    expect(players[0].settings.excludedAgentIds).toBeInstanceOf(Set)
    // 非 UUID 形式の 'migrated-id' が有効な UUID に置換されること
    expect(players[0].id).not.toBe('migrated-id')
    expect(players[0].id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    )
  })

  // ST-PERSIST-005: Set型データのシリアライズ/デシリアライズ
  it('ST-PERSIST-005: allowedRoles(Set)が保存・復元後もSet型として正しく機能する', async () => {
    // duelistが除外されたSetを含むデータをlocalStorageにセット
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        state: {
          players: [
            {
              id: 'set-id',
              settings: {
                name: '',
                allowedRoles: {
                  __type: 'Set',
                  values: ['initiator', 'controller', 'sentinel'],
                },
                excludedAgentIds: { __type: 'Set', values: ['jett'] },
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
      }),
    )

    // localStorageから復元
    await storeWithPersist.persist.rehydrate()

    const restored = usePlayerStore.getState().players[0]
    expect(restored.settings.allowedRoles).toBeInstanceOf(Set)
    expect(restored.settings.allowedRoles.has('duelist')).toBe(false)
    expect(restored.settings.allowedRoles.has('initiator')).toBe(true)
    expect(restored.settings.excludedAgentIds).toBeInstanceOf(Set)
    expect(restored.settings.excludedAgentIds.has('jett')).toBe(true)
  })
})
