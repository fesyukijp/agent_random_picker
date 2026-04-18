import { beforeEach, describe, expect, it } from 'vitest'
import { AGENTS } from '../../../src/data/agents'
import { randomPick, rerollPlayer } from '../../../src/logic/randomPicker'
import type { PartySettings, PickResult } from '../../../src/logic/types'
import { usePlayerStore } from '../../../src/stores/playerStore'
import { makePlayer, makePartySettings } from '../helpers/logicHelpers'
import { resetStore } from '../helpers/storeHelpers'

const DEFAULT_PARTY_SETTINGS: PartySettings = makePartySettings()

beforeEach(() => {
  resetStore()
})

// ===== 非機能テスト: パフォーマンス =====

describe('非機能テスト: パフォーマンス', () => {
  // NFT-PERF-001: ランダムピック実行時間（1人）
  it('NFT-PERF-001: 1人のランダムピックが0.5秒以内に完了する', () => {
    // Arrange
    const players = [makePlayer('p1')]

    // Act
    const start = performance.now()
    const result = randomPick({
      players,
      partySettings: DEFAULT_PARTY_SETTINGS,
      allAgents: AGENTS,
    })
    const elapsed = performance.now() - start

    // Assert
    expect(Array.isArray(result)).toBe(true)
    expect(elapsed).toBeLessThan(import.meta.env.CI ? 2000 : 500)
  })

  // NFT-PERF-002: ランダムピック実行時間（5人・複雑条件）
  it('NFT-PERF-002: 5人（重複不可・ロール制限あり・必須3体）のランダムピックが0.5秒以内に完了する', () => {
    // Arrange
    const players = [
      makePlayer('p1'),
      makePlayer('p2'),
      makePlayer('p3'),
      makePlayer('p4'),
      makePlayer('p5'),
    ]
    const complexSettings: PartySettings = {
      allowDuplicates: false,
      roleLimits: {
        duelist: { min: 0, max: 3 },
        initiator: { min: 1, max: 3 },
        controller: { min: 1, max: 3 },
        sentinel: { min: 0, max: 3 },
      },
      agentConstraints: {
        jett: 'required', // duelist
        sova: 'required', // initiator
        omen: 'required', // controller
      },
    }

    // Act
    const start = performance.now()
    const result = randomPick({
      players,
      partySettings: complexSettings,
      allAgents: AGENTS,
    })
    const elapsed = performance.now() - start

    // Assert
    expect(Array.isArray(result)).toBe(true)
    expect(elapsed).toBeLessThan(import.meta.env.CI ? 2000 : 500)
  })

  // NFT-PERF-003: プレイヤー単位再抽選実行時間
  it('NFT-PERF-003: 5人中1人の再抽選が0.3秒以内に完了する', () => {
    // Arrange: 先に通常の抽選で結果を取得
    const players = [
      makePlayer('p1'),
      makePlayer('p2'),
      makePlayer('p3'),
      makePlayer('p4'),
      makePlayer('p5'),
    ]
    const pickResult = randomPick({
      players,
      partySettings: DEFAULT_PARTY_SETTINGS,
      allAgents: AGENTS,
    })
    expect(Array.isArray(pickResult)).toBe(true)
    if (!Array.isArray(pickResult)) throw new Error('pick failed')
    const currentResults: PickResult[] = pickResult

    // Act
    const start = performance.now()
    const result = rerollPlayer({
      targetPlayerId: 'p1',
      currentResults,
      players,
      partySettings: DEFAULT_PARTY_SETTINGS,
      allAgents: AGENTS,
    })
    const elapsed = performance.now() - start

    // Assert
    expect(result).toHaveProperty('playerId')
    expect(elapsed).toBeLessThan(import.meta.env.CI ? 1500 : 300)
  })

  // NFT-PERF-004: 設定操作の視覚的フィードバック（ストア状態更新）
  it('NFT-PERF-004: ロールトグル操作のストア更新が0.1秒以内に完了する', () => {
    // Arrange
    const playerId = usePlayerStore.getState().players[0].id

    // Act
    const start = performance.now()
    usePlayerStore.getState().toggleRole(playerId, 'duelist')
    const elapsed = performance.now() - start

    // Assert
    expect(elapsed).toBeLessThan(import.meta.env.CI ? 500 : 100)
  })
})
