import { beforeEach, describe, expect, it } from 'vitest'
import { useResultStore } from '../../../src/stores/resultStore'
import type { RoleId } from '../../../src/logic/types'
import {
  testAgents,
  makePartySettings,
  makePlayer,
} from '../helpers/logicHelpers'

const defaultPartySettings = makePartySettings()

beforeEach(() => {
  useResultStore.setState(useResultStore.getInitialState(), true)
})

// ===== ST-RESULT-001: 初期状態 =====

describe('初期状態', () => {
  it('ST-RESULT-001: ストア初期化でresults===null, isLoading===false, error===null', () => {
    const { results, isLoading, error } = useResultStore.getState()
    expect(results).toBeNull()
    expect(isLoading).toBe(false)
    expect(error).toBeNull()
  })
})

// ===== ST-RESULT-002: 抽選実行成功 =====

describe('抽選実行成功', () => {
  it('ST-RESULT-002: executePick(有効な入力)でresultsに結果配列, isLoading===false, error===null', () => {
    const players = [makePlayer('p1')]
    useResultStore
      .getState()
      .executePick(players, defaultPartySettings, testAgents)
    const { results, isLoading, error } = useResultStore.getState()
    expect(results).not.toBeNull()
    if (!results) return
    expect(Array.isArray(results)).toBe(true)
    expect(results.length).toBe(1)
    expect(results[0].playerId).toBe('p1')
    expect(testAgents.find((a) => a.id === results[0].agent.id)).toBeDefined()
    expect(isLoading).toBe(false)
    expect(error).toBeNull()
  })
})

// ===== ST-RESULT-003: 抽選実行失敗 =====

describe('抽選実行失敗', () => {
  it('ST-RESULT-003: executePick(条件矛盾)でresults===null, errorにエラーメッセージ', () => {
    // 2人・重複不可・全員の候補がjettのみ → 有効な組み合わせなし
    const player1 = makePlayer('p1', {
      allowedRoles: new Set<RoleId>(['duelist']),
      excludedAgentIds: new Set(['reyna']),
    })
    const player2 = makePlayer('p2', {
      allowedRoles: new Set<RoleId>(['duelist']),
      excludedAgentIds: new Set(['reyna']),
    })
    useResultStore
      .getState()
      .executePick([player1, player2], defaultPartySettings, testAgents)
    const { results, error } = useResultStore.getState()
    expect(results).toBeNull()
    expect(error).not.toBeNull()
    if (!error) return
    expect(error).toHaveProperty(
      'key',
      'validation.noDuplicatesInsufficientAgents',
    )
  })
})

// ===== ST-RESULT-004: 再抽選成功 =====

describe('再抽選成功', () => {
  it('ST-RESULT-004: rerollPlayer(有効)で対象プレイヤーの結果が更新される', () => {
    const players = [makePlayer('p1'), makePlayer('p2')]
    useResultStore
      .getState()
      .executePick(players, defaultPartySettings, testAgents)
    const beforeResults = useResultStore.getState().results
    expect(beforeResults).not.toBeNull()
    if (!beforeResults) return
    expect(beforeResults).toHaveLength(2)

    const p1Before = beforeResults.find((r) => r.playerId === 'p1')
    if (!p1Before) throw new Error('p1 result not found in beforeResults')

    useResultStore
      .getState()
      .rerollPlayer('p2', players, defaultPartySettings, testAgents)
    const afterResults = useResultStore.getState().results
    expect(afterResults).not.toBeNull()
    if (!afterResults) return

    // 結果の件数は変わらない
    expect(afterResults).toHaveLength(2)
    // p1の結果は変わらない
    const p1After = afterResults.find((r) => r.playerId === 'p1')
    if (!p1After) throw new Error('p1 result not found in afterResults')
    expect(p1After.agent.id).toBe(p1Before.agent.id)
    // p2のエントリが存在する
    const p2After = afterResults.find((r) => r.playerId === 'p2')
    expect(p2After).toBeDefined()
    // エラーなし
    expect(useResultStore.getState().error).toBeNull()
  })
})

// ===== ST-RESULT-006: isLoading 遷移 =====

describe('isLoading 遷移', () => {
  it('ST-RESULT-006: executePick 開始時に isLoading が true になり、完了後に false に戻る', () => {
    const players = [makePlayer('p1')]
    // executePick は同期処理だが、set({ isLoading: true }) が呼ばれることを検証
    // Zustand の subscribe で中間状態をキャプチャ
    const states: boolean[] = []
    const unsub = useResultStore.subscribe((s) => {
      states.push(s.isLoading)
    })
    useResultStore
      .getState()
      .executePick(players, defaultPartySettings, testAgents)
    unsub()
    // 最初の set で true、最後の set で false
    expect(states[0]).toBe(true)
    expect(states[states.length - 1]).toBe(false)
  })
})

// ===== ST-RESULT-007: 再抽選失敗時にresultsが保持される =====

describe('再抽選失敗時のresults保持', () => {
  it('ST-RESULT-007: rerollPlayer失敗時にresultsは元の値を保持しerrorが設定される', () => {
    // 正常にピック
    const players = [
      makePlayer('p1', {
        allowedRoles: new Set<RoleId>(['duelist']),
        excludedAgentIds: new Set(['reyna']),
      }),
      makePlayer('p2', {
        allowedRoles: new Set<RoleId>(['duelist']),
        excludedAgentIds: new Set(['reyna']),
      }),
    ]
    useResultStore
      .getState()
      .executePick(
        players,
        makePartySettings({ allowDuplicates: true }),
        testAgents,
      )
    const originalResults = useResultStore.getState().results
    expect(originalResults).not.toBeNull()

    // 不可能な再抽選（重複不可でduelistが1体のみ、他プレイヤーが使用中）
    useResultStore
      .getState()
      .rerollPlayer(
        'p1',
        players,
        makePartySettings({ allowDuplicates: false }),
        testAgents,
      )
    // results は元の値を保持し、error が設定される
    expect(useResultStore.getState().results).toEqual(originalResults)
    expect(useResultStore.getState().error).not.toBeNull()
  })
})

// ===== ST-RESULT-008: isLoading ガード =====

describe('isLoading ガード', () => {
  it('ST-RESULT-008: isLoading中のexecutePickは無視される', () => {
    // isLoading を true に設定
    useResultStore.setState({ isLoading: true })
    const players = [makePlayer('p1')]
    useResultStore
      .getState()
      .executePick(players, defaultPartySettings, testAgents)
    // 実行されなかったので results は null のまま
    expect(useResultStore.getState().results).toBeNull()
    // isLoading もリセットされない（executePick が何もしなかったため）
    expect(useResultStore.getState().isLoading).toBe(true)
  })
})

// ===== ST-RESULT-005: 結果クリア =====

describe('結果クリア', () => {
  it('ST-RESULT-005: clearResults()でresults===null, error===null', () => {
    // エラー状態から clearResults を呼んでも両方リセットされる
    const player1 = makePlayer('p1', {
      allowedRoles: new Set<RoleId>(['duelist']),
      excludedAgentIds: new Set(['reyna']),
    })
    const player2 = makePlayer('p2', {
      allowedRoles: new Set<RoleId>(['duelist']),
      excludedAgentIds: new Set(['reyna']),
    })
    useResultStore
      .getState()
      .executePick([player1, player2], defaultPartySettings, testAgents)
    expect(useResultStore.getState().error).not.toBeNull()

    useResultStore.getState().clearResults()
    expect(useResultStore.getState().results).toBeNull()
    expect(useResultStore.getState().error).toBeNull()
  })
})
