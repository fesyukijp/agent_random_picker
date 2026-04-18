import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerStore } from '../../../src/stores/playerStore'
import { useResultStore } from '../../../src/stores/resultStore'
import { getCandidates, randomPick } from '../../../src/logic/randomPicker'
import { validateConstraints } from '../../../src/logic/validator'
import { AGENTS } from '../../../src/data/agents'
import { resetStore } from '../helpers/storeHelpers'

const STORAGE_KEY = 'agent-picker-players'

beforeEach(() => {
  resetStore()
  useResultStore.setState(useResultStore.getInitialState(), true)
})

// ===== コンポーネント接続テスト（BT-CONN-001〜003） =====

describe('コンポーネント接続テスト', () => {
  // BT-CONN-001: ロール設定変更→ストア更新→候補反映
  it('BT-CONN-001: ロールトグル→playerStore更新→getCandidatesの結果変化', () => {
    const { players, partySettings } = usePlayerStore.getState()
    const player = players[0]

    // 初期状態（全ロール許可）での候補数
    const initialCandidates = getCandidates({
      agents: AGENTS,
      allowedRoles: player.settings.allowedRoles,
      excludedAgentIds: player.settings.excludedAgentIds,
      agentConstraints: partySettings.agentConstraints,
    })
    const initialCount = initialCandidates.length

    // duelistをオフにする
    usePlayerStore.getState().toggleRole(player.id, 'duelist')

    const { players: updatedPlayers, partySettings: updatedSettings } =
      usePlayerStore.getState()
    const updatedPlayer = updatedPlayers[0]

    // 更新後の候補数（duelistが除外されるので減少する）
    const updatedCandidates = getCandidates({
      agents: AGENTS,
      allowedRoles: updatedPlayer.settings.allowedRoles,
      excludedAgentIds: updatedPlayer.settings.excludedAgentIds,
      agentConstraints: updatedSettings.agentConstraints,
    })

    expect(updatedCandidates.length).toBeLessThan(initialCount)
    // 更新後の候補にduelistロールのエージェントが含まれないこと
    expect(updatedCandidates.every((agent) => agent.roleId !== 'duelist')).toBe(
      true,
    )
  })

  // BT-CONN-002: 全体設定変更→ストア更新→バリデーション反映
  it('BT-CONN-002: agentConstraint変更→partySettings更新→validateConstraintsの結果変化', () => {
    // 初期状態: 1人でバリデーションが通ること
    const { players, partySettings } = usePlayerStore.getState()
    const initialResult = validateConstraints({
      players,
      partySettings,
      agents: AGENTS,
    })
    expect(initialResult.valid).toBe(true)

    // 2人必須エージェントを設定（プレイヤー数1人に対して不可能）
    const duelists = AGENTS.filter((a) => a.roleId === 'duelist')
    usePlayerStore.getState().cycleAgentConstraint(duelists[0].id) // required
    usePlayerStore.getState().cycleAgentConstraint(duelists[1].id) // required

    const { players: updatedPlayers, partySettings: updatedSettings } =
      usePlayerStore.getState()
    const updatedResult = validateConstraints({
      players: updatedPlayers,
      partySettings: updatedSettings,
      agents: AGENTS,
    })

    // 必須エージェント数（2）> プレイヤー数（1）なのでバリデーションエラー
    expect(updatedResult.valid).toBe(false)
  })

  // BT-CONN-003: 設定変更→localStorage保存
  it('BT-CONN-003: 任意の設定変更後にlocalStorageにデータが保存される', () => {
    // 変更前はlocalStorageが空
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

    // 設定変更
    usePlayerStore.getState().setAllowDuplicates(true)

    // localStorageに保存されていること
    const stored = localStorage.getItem(STORAGE_KEY)
    expect(stored).not.toBeNull()

    // 保存データに変更が反映されていること
    if (!stored)
      throw new Error('localStorage should contain data after state change')
    const parsed = JSON.parse(stored)
    expect(parsed.state.partySettings.allowDuplicates).toBe(true)
  })
})

// ===== ストアとロジック層の整合性テスト（BT-TYPE-001〜002） =====

describe('ストアとロジック層の型整合性', () => {
  // BT-TYPE-001: ストアのPlayer型がロジック層と一致
  it('BT-TYPE-001: playerStore.players → randomPick引数に型変換なしで直接渡せる', () => {
    const { players, partySettings } = usePlayerStore.getState()

    // Player型をそのままrandomPickに渡せること
    const result = randomPick({
      players,
      partySettings,
      allAgents: AGENTS,
    })

    // エラーなく呼べること（型互換性の実証）
    // 1人・全デフォルト設定なので有効な結果が返る
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1)
      expect(result[0].playerId).toBe(players[0].id)
    }
  })

  // BT-TYPE-002: ストアのPartySettings型がロジック層と一致
  it('BT-TYPE-002: playerStore.partySettings → randomPick引数に型変換なしで直接渡せる', () => {
    // 2人に増やして partySettings も変更
    usePlayerStore.getState().addPlayer()
    usePlayerStore.getState().setAllowDuplicates(true)
    usePlayerStore.getState().setRoleLimit('duelist', 0, 2)

    const { players, partySettings } = usePlayerStore.getState()

    // PartySettings型をそのままrandomPickに渡せること
    const result = randomPick({
      players,
      partySettings,
      allAgents: AGENTS,
    })

    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2)
    }
  })
})

// ===== クロスストア連携テスト（BT-CROSS-001〜002） =====

describe('クロスストア連携', () => {
  // BT-CROSS-001: プレイヤー追加時に resultStore がクリアされる
  it('BT-CROSS-001: addPlayer後にresultStoreのresultsがnullになる', () => {
    // まずピック結果を作成
    const { players, partySettings } = usePlayerStore.getState()
    useResultStore.getState().executePick(players, partySettings, AGENTS)
    expect(useResultStore.getState().results).not.toBeNull()

    // プレイヤー追加 → subscribe で clearResults が発火
    usePlayerStore.getState().addPlayer()
    expect(useResultStore.getState().results).toBeNull()
  })

  // BT-CROSS-002: プレイヤー削除時に resultStore がクリアされる
  it('BT-CROSS-002: removePlayer後にresultStoreのresultsがnullになる', () => {
    // 2人に増やしてピック
    usePlayerStore.getState().addPlayer()
    const { players, partySettings } = usePlayerStore.getState()
    useResultStore.getState().executePick(players, partySettings, AGENTS)
    expect(useResultStore.getState().results).not.toBeNull()

    // プレイヤー削除 → subscribe で clearResults が発火
    usePlayerStore.getState().removePlayer(players[1].id)
    expect(useResultStore.getState().results).toBeNull()
  })
})
