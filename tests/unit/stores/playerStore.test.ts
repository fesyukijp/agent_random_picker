import { beforeEach, describe, expect, it } from 'vitest'
import { usePlayerStore } from '../../../src/stores/playerStore'
import { AGENTS } from '../../../src/data/agents'
import { getPlayer, resetStore } from '../helpers/storeHelpers'

beforeEach(() => {
  resetStore()
})

// ===== プレイヤー管理 (ST-PLAYER-001~007) =====

describe('プレイヤー管理', () => {
  // ST-PLAYER-001: 初期状態で1プレイヤー
  it('ST-PLAYER-001: 初期状態で1プレイヤーかつデフォルト設定', () => {
    const { players, partySettings } = usePlayerStore.getState()
    expect(players).toHaveLength(1)
    expect(players[0].settings.name).toBe('')
    expect(players[0].settings.allowedRoles).toEqual(
      new Set(['duelist', 'initiator', 'controller', 'sentinel']),
    )
    expect(players[0].settings.excludedAgentIds).toEqual(new Set())
    expect(partySettings.allowDuplicates).toBe(false)
    expect(partySettings.agentConstraints).toEqual({})
    expect(partySettings.roleLimits).toEqual({
      duelist: { min: 0, max: 5 },
      initiator: { min: 0, max: 5 },
      controller: { min: 0, max: 5 },
      sentinel: { min: 0, max: 5 },
    })
  })

  // ST-PLAYER-002: プレイヤー追加
  it('ST-PLAYER-002: addPlayerでplayers.lengthが1増加し新プレイヤーがデフォルト設定', () => {
    usePlayerStore.getState().addPlayer()
    const { players } = usePlayerStore.getState()
    expect(players).toHaveLength(2)
    const newPlayer = players[1]
    expect(newPlayer.settings.name).toBe('')
    expect(newPlayer.settings.allowedRoles).toEqual(
      new Set(['duelist', 'initiator', 'controller', 'sentinel']),
    )
    expect(newPlayer.settings.excludedAgentIds).toEqual(new Set())
  })

  // ST-PLAYER-003: プレイヤー追加上限
  it('ST-PLAYER-003: 5人の状態でaddPlayerを呼んでもplayers.length===5のまま', () => {
    for (let i = 0; i < 4; i++) {
      usePlayerStore.getState().addPlayer()
    }
    expect(usePlayerStore.getState().players).toHaveLength(5)
    usePlayerStore.getState().addPlayer()
    expect(usePlayerStore.getState().players).toHaveLength(5)
  })

  // ST-PLAYER-004: プレイヤー削除
  it('ST-PLAYER-004: removePlayer(id)で該当プレイヤーが削除され他は維持', () => {
    usePlayerStore.getState().addPlayer()
    const { players } = usePlayerStore.getState()
    const targetId = players[1].id
    usePlayerStore.getState().removePlayer(targetId)
    const updated = usePlayerStore.getState().players
    expect(updated).toHaveLength(1)
    expect(updated.find((p) => p.id === targetId)).toBeUndefined()
  })

  // ST-PLAYER-005: 最後の1人は削除不可
  it('ST-PLAYER-005: 1人の状態でremovePlayerを呼んでもplayers.length===1のまま', () => {
    const { players } = usePlayerStore.getState()
    usePlayerStore.getState().removePlayer(players[0].id)
    expect(usePlayerStore.getState().players).toHaveLength(1)
  })

  // ST-PLAYER-006: プレイヤー名変更
  it('ST-PLAYER-006: updatePlayerName(id, "テスト")で該当プレイヤーのname==="テスト"', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id
    usePlayerStore.getState().updatePlayerName(playerId, 'テスト')
    const updated = getPlayer(playerId)
    expect(updated.settings.name).toBe('テスト')
  })

  // ST-PLAYER-007: プレイヤー名20文字制限
  it('ST-PLAYER-007: 21文字の名前を設定すると20文字に切り詰められる', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id
    usePlayerStore.getState().updatePlayerName(playerId, 'あ'.repeat(21))
    const updated = getPlayer(playerId)
    expect(updated.settings.name.length).toBeLessThanOrEqual(20)
  })
})

// ===== 個別設定 (ST-PLAYER-008~014) =====

describe('個別設定', () => {
  // ST-PLAYER-008: ロールトグル
  it('ST-PLAYER-008: toggleRole(id, "duelist")でduelistがallowedRolesから除外/追加される', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id

    // duelistをオフ
    usePlayerStore.getState().toggleRole(playerId, 'duelist')
    let updated = getPlayer(playerId)
    expect(updated.settings.allowedRoles.has('duelist')).toBe(false)

    // duelistを再オン
    usePlayerStore.getState().toggleRole(playerId, 'duelist')
    updated = getPlayer(playerId)
    expect(updated.settings.allowedRoles.has('duelist')).toBe(true)
  })

  // ST-PLAYER-008b: ロールをOFFにすると該当ロールの全エージェントがexcludedAgentIdsに追加（Issue #40）
  it('ST-PLAYER-008b: toggleRole(id, "duelist")でOFFにするとduelistエージェントが全て除外される', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id
    const duelistAgents = AGENTS.filter((a) => a.roleId === 'duelist')

    usePlayerStore.getState().toggleRole(playerId, 'duelist')
    const updated = getPlayer(playerId)
    for (const agent of duelistAgents) {
      expect(updated.settings.excludedAgentIds.has(agent.id)).toBe(true)
    }
  })

  // ST-PLAYER-008c: ロールをOFF→ONに戻すとそのロールのエージェント除外が解除される
  it('ST-PLAYER-008c: toggleRole OFF→ONでそのロールのエージェント除外が解除される', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id

    usePlayerStore.getState().toggleRole(playerId, 'duelist') // OFF → 全agents除外
    usePlayerStore.getState().toggleRole(playerId, 'duelist') // ON → agents除外解除
    const updated = getPlayer(playerId)
    const duelistAgents = AGENTS.filter((a) => a.roleId === 'duelist')
    // OFF→ONでエージェント除外が解除される（OFF時の逆操作）
    for (const agent of duelistAgents) {
      expect(updated.settings.excludedAgentIds.has(agent.id)).toBe(false)
    }
  })

  // ST-PLAYER-008d: 手動除外したエージェントもロールOFF→ONで除外解除される（意図的設計）
  // トレードオフ: 現在のデータモデルでは「手動除外」と「ロールOFF由来の除外」を区別できない。
  // OFF時に全エージェントを除外し、ON時に全エージェントを復元する対称設計を採用。
  it('ST-PLAYER-008d: 手動除外→ロールOFF→ON後に手動除外も解除される', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id

    usePlayerStore.getState().toggleAgent(playerId, 'jett') // 手動除外
    expect(getPlayer(playerId).settings.excludedAgentIds.has('jett')).toBe(true)

    usePlayerStore.getState().toggleRole(playerId, 'duelist') // OFF
    usePlayerStore.getState().toggleRole(playerId, 'duelist') // ON
    const updated = getPlayer(playerId)
    // 手動除外もON時に解除される（対称設計によるトレードオフ）
    expect(updated.settings.excludedAgentIds.has('jett')).toBe(false)
  })

  // ST-PLAYER-020: ロールOFF中にエージェントをONにすると親ロールが自動でON（Issue #40）
  it('ST-PLAYER-020: ロールOFF中にtoggleAgent ONすると親ロールが自動でONになる', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id

    // duelistをOFFにする（全duelistエージェントも除外される）
    usePlayerStore.getState().toggleRole(playerId, 'duelist')
    let updated = getPlayer(playerId)
    expect(updated.settings.allowedRoles.has('duelist')).toBe(false)

    // jett（duelist）をONにする → duelistロールが自動でONになる
    usePlayerStore.getState().toggleAgent(playerId, 'jett')
    updated = getPlayer(playerId)
    expect(updated.settings.excludedAgentIds.has('jett')).toBe(false)
    expect(updated.settings.allowedRoles.has('duelist')).toBe(true)
  })

  // ST-PLAYER-021: ロールON中にエージェントをOFFにしてもロールは変化なし（Issue #40）
  it('ST-PLAYER-021: ロールON中にエージェントをOFFにしてもロールはONのまま', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id

    // sentinelはONのまま、sentinelエージェントをOFFにしてもsentinelはONのまま
    usePlayerStore.getState().toggleAgent(playerId, 'sage') // sageをOFF
    const updated = getPlayer(playerId)
    expect(updated.settings.allowedRoles.has('sentinel')).toBe(true)
    expect(updated.settings.excludedAgentIds.has('sage')).toBe(true)
  })

  // ST-PLAYER-009: 最後の1ロールもオフにできる（0件を許容）
  it('ST-PLAYER-009: 1ロールのみオンの状態でtoggleRoleを呼ぶと0件になる', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id

    // duelist以外をすべてオフにする
    usePlayerStore.getState().toggleRole(playerId, 'initiator')
    usePlayerStore.getState().toggleRole(playerId, 'controller')
    usePlayerStore.getState().toggleRole(playerId, 'sentinel')

    // 最後のduelistもオフにできる
    usePlayerStore.getState().toggleRole(playerId, 'duelist')
    const updated = getPlayer(playerId)
    expect(updated.settings.allowedRoles.size).toBe(0)
  })

  // ST-PLAYER-010: 全ロール一括オン
  it('ST-PLAYER-010: setAllRoles(id, true)でallowedRolesに全4ロール', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id

    // まず一部をオフ
    usePlayerStore.getState().toggleRole(playerId, 'duelist')
    usePlayerStore.getState().toggleRole(playerId, 'initiator')

    usePlayerStore.getState().setAllRoles(playerId, true)
    const updated = getPlayer(playerId)
    expect(updated.settings.allowedRoles).toEqual(
      new Set(['duelist', 'initiator', 'controller', 'sentinel']),
    )
  })

  // ST-PLAYER-010b: setAllRoles(true) の副作用 — excludedAgentIds も全件解除される
  it('ST-PLAYER-010b: setAllRoles(id, true)でexcludedAgentIdsが全件解除される', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id
    usePlayerStore.getState().setAllRoles(playerId, false) // 全除外
    usePlayerStore.getState().setAllRoles(playerId, true)
    const updated = getPlayer(playerId)
    expect(updated.settings.excludedAgentIds.size).toBe(0)
  })

  // ST-PLAYER-011: 全ロール一括オフ（0件を許容）
  it('ST-PLAYER-011: setAllRoles(id, false)でallowedRolesが空になる', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id
    usePlayerStore.getState().setAllRoles(playerId, false)
    const updated = getPlayer(playerId)
    expect(updated.settings.allowedRoles.size).toBe(0)
  })

  // ST-PLAYER-011b: setAllRoles(false) の副作用 — excludedAgentIds も全件追加される
  it('ST-PLAYER-011b: setAllRoles(id, false)でexcludedAgentIdsに全エージェントが追加される', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id
    usePlayerStore.getState().setAllRoles(playerId, false)
    const updated = getPlayer(playerId)
    expect(updated.settings.excludedAgentIds.size).toBe(AGENTS.length)
  })

  // ST-PLAYER-012: エージェントトグル
  it('ST-PLAYER-012: toggleAgent(id, "jett")でjettがexcludedAgentIdsに追加/削除される', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id

    // jettを除外
    usePlayerStore.getState().toggleAgent(playerId, 'jett')
    let updated = getPlayer(playerId)
    expect(updated.settings.excludedAgentIds.has('jett')).toBe(true)

    // jettを再度有効化
    usePlayerStore.getState().toggleAgent(playerId, 'jett')
    updated = getPlayer(playerId)
    expect(updated.settings.excludedAgentIds.has('jett')).toBe(false)
  })

  // ST-PLAYER-013: 全エージェント一括オン
  it('ST-PLAYER-013: setAllAgents(id, true)でexcludedAgentIdsが空になる', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id

    // まずいくつか除外
    usePlayerStore.getState().toggleAgent(playerId, 'jett')
    usePlayerStore.getState().toggleAgent(playerId, 'sage')

    usePlayerStore.getState().setAllAgents(playerId, true)
    const updated = getPlayer(playerId)
    expect(updated.settings.excludedAgentIds.size).toBe(0)
  })

  // ST-PLAYER-014: 全エージェント一括オフ
  it('ST-PLAYER-014: setAllAgents(id, false)でexcludedAgentIdsに全エージェントIDが入る', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id

    usePlayerStore.getState().setAllAgents(playerId, false)
    const updated = getPlayer(playerId)
    expect(updated.settings.excludedAgentIds.size).toBe(AGENTS.length)
    for (const agent of AGENTS) {
      expect(updated.settings.excludedAgentIds.has(agent.id)).toBe(true)
    }
  })

  // ST-PLAYER-014b: setAllAgents(false) の副作用 — allowedRoles も空になる
  it('ST-PLAYER-014b: setAllAgents(id, false)でallowedRolesも空になる', () => {
    const { players } = usePlayerStore.getState()
    const playerId = players[0].id
    usePlayerStore.getState().setAllAgents(playerId, false)
    const updated = getPlayer(playerId)
    expect(updated.settings.allowedRoles.size).toBe(0)
  })
})

// ===== 全体設定 (ST-PLAYER-015~018) =====

describe('全体設定', () => {
  // ST-PLAYER-015: 重複設定変更
  it('ST-PLAYER-015: setAllowDuplicates(true)でpartySettings.allowDuplicates===true', () => {
    usePlayerStore.getState().setAllowDuplicates(true)
    expect(usePlayerStore.getState().partySettings.allowDuplicates).toBe(true)
  })

  // ST-PLAYER-016: ロール人数制限設定
  it('ST-PLAYER-016: setRoleLimit("duelist", 1, 2)でroleLimits.duelist==={min:1, max:2}', () => {
    usePlayerStore.getState().setRoleLimit('duelist', 1, 2)
    expect(usePlayerStore.getState().partySettings.roleLimits.duelist).toEqual({
      min: 1,
      max: 2,
    })
  })

  // ST-PLAYER-016b: setRoleLimit に min>max を渡すとクランプされる（M-1）
  it('ST-PLAYER-016b: setRoleLimit(min>max)はmax>=minにクランプされる', () => {
    usePlayerStore.getState().setRoleLimit('duelist', 3, 1)
    const { min, max } =
      usePlayerStore.getState().partySettings.roleLimits.duelist
    expect(min).toBeGreaterThanOrEqual(0)
    expect(max).toBeGreaterThanOrEqual(min)
  })

  // ST-PLAYER-016c: setRoleLimit に負の min を渡すと 0 にクランプされる（M-1）
  it('ST-PLAYER-016c: setRoleLimit(min<0)はmin=0にクランプされる', () => {
    usePlayerStore.getState().setRoleLimit('duelist', -1, 2)
    expect(usePlayerStore.getState().partySettings.roleLimits.duelist.min).toBe(
      0,
    )
  })

  // ST-PLAYER-017: エージェント制約サイクル
  it('ST-PLAYER-017: cycleAgentConstraint("jett")を3回呼ぶとallowed→required→banned→allowed', () => {
    // 初期はallowed（未設定）
    expect(
      usePlayerStore.getState().partySettings.agentConstraints['jett'] ??
        'allowed',
    ).toBe('allowed')

    usePlayerStore.getState().cycleAgentConstraint('jett')
    expect(
      usePlayerStore.getState().partySettings.agentConstraints['jett'],
    ).toBe('required')

    usePlayerStore.getState().cycleAgentConstraint('jett')
    expect(
      usePlayerStore.getState().partySettings.agentConstraints['jett'],
    ).toBe('banned')

    usePlayerStore.getState().cycleAgentConstraint('jett')
    // 'allowed' に戻ったらキーが削除される（不在 = 'allowed' パターン）
    expect(
      usePlayerStore.getState().partySettings.agentConstraints['jett'],
    ).toBeUndefined()
  })

  // ST-PLAYER-019a: ロール人数制限リセット
  it('ST-PLAYER-019a: resetRoleLimits()で全ロールのmin=0、max=players.lengthになる', () => {
    // 3人に増やす
    usePlayerStore.getState().addPlayer()
    usePlayerStore.getState().addPlayer()
    // ロール制限を変更
    usePlayerStore.getState().setRoleLimit('duelist', 2, 4)
    usePlayerStore.getState().setRoleLimit('sentinel', 1, 3)

    usePlayerStore.getState().resetRoleLimits()

    const { roleLimits } = usePlayerStore.getState().partySettings
    const playerCount = usePlayerStore.getState().players.length
    for (const role of [
      'duelist',
      'initiator',
      'controller',
      'sentinel',
    ] as const) {
      expect(roleLimits[role]).toEqual({ min: 0, max: playerCount })
    }
  })

  // ST-PLAYER-019b: エージェント制約リセット
  it('ST-PLAYER-019b: resetAgentConstraints()でagentConstraintsが{}になる', () => {
    usePlayerStore.getState().cycleAgentConstraint('jett') // required
    usePlayerStore.getState().cycleAgentConstraint('sage') // required
    usePlayerStore.getState().cycleAgentConstraint('sage') // banned

    usePlayerStore.getState().resetAgentConstraints()

    expect(usePlayerStore.getState().partySettings.agentConstraints).toEqual({})
  })

  // ST-PLAYER-022: ロール単位一括 - banned設定
  it('ST-PLAYER-022: setRoleAgentConstraints("duelist", "banned")でduelist全エージェントがbannedになる', () => {
    const duelistAgents = AGENTS.filter((a) => a.roleId === 'duelist')
    usePlayerStore.getState().setRoleAgentConstraints('duelist', 'banned')
    const { agentConstraints } = usePlayerStore.getState().partySettings
    for (const agent of duelistAgents) {
      expect(agentConstraints[agent.id]).toBe('banned')
    }
  })

  // ST-PLAYER-023: ロール単位一括 - allowed設定（キーを削除）
  it('ST-PLAYER-023: setRoleAgentConstraints("duelist", "allowed")でduelist全エージェントの制約が削除される', () => {
    const duelistAgents = AGENTS.filter((a) => a.roleId === 'duelist')
    // まずbannedにしてから
    usePlayerStore.getState().setRoleAgentConstraints('duelist', 'banned')
    // allowedに戻す
    usePlayerStore.getState().setRoleAgentConstraints('duelist', 'allowed')
    const { agentConstraints } = usePlayerStore.getState().partySettings
    for (const agent of duelistAgents) {
      expect(agentConstraints[agent.id]).toBeUndefined()
    }
  })

  // ST-PLAYER-024: ロール単位一括 - 他ロールに影響しない
  it('ST-PLAYER-024: setRoleAgentConstraints("duelist", "required")はsentinelの制約に影響しない', () => {
    // sentinelのエージェントにbanned設定
    usePlayerStore.getState().setAgentConstraint('sage', 'banned')
    // duelistを一括required
    usePlayerStore.getState().setRoleAgentConstraints('duelist', 'required')
    const { agentConstraints } = usePlayerStore.getState().partySettings
    // sageはbannedのまま
    expect(agentConstraints['sage']).toBe('banned')
  })

  // ST-PLAYER-018: 全設定リセット
  it('ST-PLAYER-018: resetAll()で初期状態に戻る', () => {
    // 各種変更を加える
    usePlayerStore.getState().addPlayer()
    usePlayerStore.getState().addPlayer()
    usePlayerStore.getState().setAllowDuplicates(true)
    usePlayerStore.getState().setRoleLimit('duelist', 2, 3)
    usePlayerStore.getState().cycleAgentConstraint('jett')

    // リセット
    usePlayerStore.getState().resetAll()

    const { players, partySettings } = usePlayerStore.getState()
    expect(players).toHaveLength(1)
    expect(partySettings.allowDuplicates).toBe(false)
    expect(partySettings.roleLimits).toEqual({
      duelist: { min: 0, max: 5 },
      initiator: { min: 0, max: 5 },
      controller: { min: 0, max: 5 },
      sentinel: { min: 0, max: 5 },
    })
    expect(partySettings.agentConstraints).toEqual({})
  })
})
