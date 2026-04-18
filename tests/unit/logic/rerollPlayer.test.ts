import { describe, it, expect } from 'vitest'
import type { RoleId } from '../../../src/logic/types'
import { rerollPlayer } from '../../../src/logic/randomPicker'
import {
  testAgents,
  makePlayer,
  makePartySettings,
  makePickResult,
} from '../helpers/logicHelpers'

describe('rerollPlayer', () => {
  // UT-REROLL-001: 1人再抽選で有効なエージェントが返る
  it('UT-REROLL-001: 1人再抽選で有効なエージェントが返る', () => {
    const players = [makePlayer('p1')]
    const currentResults = [makePickResult('p1', 'jett')]
    const result = rerollPlayer({
      targetPlayerId: 'p1',
      currentResults,
      players,
      partySettings: makePartySettings(),
      allAgents: testAgents,
    })
    expect(result).toHaveProperty('playerId')
    if ('playerId' in result) {
      expect(result.playerId).toBe('p1')
      expect(testAgents.map((a) => a.id)).toContain(result.agent.id)
    }
  })

  // UT-REROLL-002: 重複可で他プレイヤーと同じエージェントが返りうる
  it('UT-REROLL-002: 重複可でP2候補がjettのみの場合、P2再抽選でP2=jettが返る', () => {
    const players = [
      makePlayer('p1'),
      makePlayer('p2', {
        allowedRoles: new Set<RoleId>(['duelist']),
        excludedAgentIds: new Set(['reyna']),
      }),
    ]
    const currentResults = [
      makePickResult('p1', 'jett'),
      makePickResult('p2', 'jett'),
    ]
    const result = rerollPlayer({
      targetPlayerId: 'p2',
      currentResults,
      players,
      partySettings: makePartySettings({ allowDuplicates: true }),
      allAgents: testAgents,
    })
    expect(result).toHaveProperty('playerId')
    if ('playerId' in result) {
      expect(result.playerId).toBe('p2')
      expect(result.agent.id).toBe('jett')
    }
  })

  // UT-REROLL-003: ロール人数制限の残枠を考慮
  it('UT-REROLL-003: duelist max=1 かつ P1=jett(duelist)のとき、P2再抽選でduelistは返らない', () => {
    const players = [makePlayer('p1'), makePlayer('p2')]
    const currentResults = [
      makePickResult('p1', 'jett'),
      makePickResult('p2', 'sage'),
    ]
    const result = rerollPlayer({
      targetPlayerId: 'p2',
      currentResults,
      players,
      partySettings: makePartySettings({
        roleLimits: {
          duelist: { min: 0, max: 1 },
          initiator: { min: 0, max: 5 },
          controller: { min: 0, max: 5 },
          sentinel: { min: 0, max: 5 },
        },
      }),
      allAgents: testAgents,
    })
    expect(result).toHaveProperty('playerId')
    if ('playerId' in result) {
      expect(result.playerId).toBe('p2')
      expect(result.agent.roleId).not.toBe('duelist')
    }
  })

  // UT-REROLL-004: 必須エージェントの充足を維持
  it('UT-REROLL-004: required=jett かつ P1=jettのとき、P2再抽選でjett以外が返る', () => {
    const players = [makePlayer('p1'), makePlayer('p2')]
    const currentResults = [
      makePickResult('p1', 'jett'),
      makePickResult('p2', 'sage'),
    ]
    const result = rerollPlayer({
      targetPlayerId: 'p2',
      currentResults,
      players,
      partySettings: makePartySettings({
        allowDuplicates: false,
        agentConstraints: { jett: 'required' },
      }),
      allAgents: testAgents,
    })
    expect(result).toHaveProperty('playerId')
    if ('playerId' in result) {
      expect(result.playerId).toBe('p2')
      // P1でjett充足済み＆重複不可なのでP2はjett以外
      expect(result.agent.id).not.toBe('jett')
    }
  })

  // UT-REROLL-005: 必須エージェントが対象プレイヤーにのみ割当可能
  it('UT-REROLL-005: required=jett かつ P1のみjett候補のとき、P1再抽選後もP1=jett', () => {
    const players = [
      makePlayer('p1'), // P1はjettを候補に含む
      makePlayer('p2', { excludedAgentIds: new Set(['jett']) }), // P2はjettを除外
    ]
    const currentResults = [
      makePickResult('p1', 'reyna'), // P1は現在reyna（再抽選される）
      makePickResult('p2', 'sage'),
    ]
    const result = rerollPlayer({
      targetPlayerId: 'p1',
      currentResults,
      players,
      partySettings: makePartySettings({
        agentConstraints: { jett: 'required' },
      }),
      allAgents: testAgents,
    })
    expect(result).toHaveProperty('playerId')
    if ('playerId' in result) {
      expect(result.playerId).toBe('p1')
      // jettは必須かつP1のみ候補 → P1はjettを取らなければならない
      expect(result.agent.id).toBe('jett')
    }
  })

  // UT-REROLL-007: 必須2体・固定側で1体充足済み・残り1件を対象プレイヤーが充足
  it('UT-REROLL-007: required={jett,sage} / P1=jett(確定) / P2再抽選でP2=sage', () => {
    const players = [makePlayer('p1'), makePlayer('p2')]
    const currentResults = [
      makePickResult('p1', 'jett'),
      makePickResult('p2', 'sova'),
    ]
    const result = rerollPlayer({
      targetPlayerId: 'p2',
      currentResults,
      players,
      partySettings: makePartySettings({
        allowDuplicates: false,
        agentConstraints: { jett: 'required', sage: 'required' },
      }),
      allAgents: testAgents,
    })
    expect(result).toHaveProperty('playerId')
    if ('playerId' in result) {
      expect(result.playerId).toBe('p2')
      // sage は P2 のみが充足できる必須エージェント
      expect(result.agent.id).toBe('sage')
    }
  })

  // UT-REROLL-ERR-001: 存在しない targetPlayerId でエラー
  it('UT-REROLL-ERR-001: 存在しないtargetPlayerIdを渡すとErrorを返す', () => {
    const players = [makePlayer('p1')]
    const currentResults = [makePickResult('p1', 'jett')]
    const result = rerollPlayer({
      targetPlayerId: 'non-existent',
      currentResults,
      players,
      partySettings: makePartySettings(),
      allAgents: testAgents,
    })
    expect(result).toHaveProperty('key', 'reroll.playerNotFound')
  })

  // UT-REROLL-ERR-002: currentResults が不足している場合エラー
  it('UT-REROLL-ERR-002: currentResultsに全プレイヤーの結果が揃っていない場合Errorを返す', () => {
    const players = [makePlayer('p1'), makePlayer('p2')]
    // p2 の結果が欠落
    const currentResults = [makePickResult('p1', 'jett')]
    const result = rerollPlayer({
      targetPlayerId: 'p1',
      currentResults,
      players,
      partySettings: makePartySettings(),
      allAgents: testAgents,
    })
    expect(result).toHaveProperty('key', 'reroll.noResults')
  })

  // UT-REROLL-ERR-003: currentResults の ID が players と一致しない場合エラー
  it('UT-REROLL-ERR-003: currentResultsのIDがplayersと一致しない場合Errorを返す', () => {
    const players = [makePlayer('p1'), makePlayer('p2')]
    const currentResults = [
      makePickResult('p1', 'jett'),
      makePickResult('p-unknown', 'sage'),
    ]
    const result = rerollPlayer({
      targetPlayerId: 'p1',
      currentResults,
      players,
      partySettings: makePartySettings(),
      allAgents: testAgents,
    })
    expect(result).toHaveProperty('key', 'reroll.incompleteResults')
  })

  // UT-REROLL-006: 再抽選候補が0体でエラー
  it('UT-REROLL-006: 重複不可でP1の全候補（duelist）が他プレイヤーに使われている場合、Errorを返す', () => {
    const players = [
      makePlayer('p1', { allowedRoles: new Set<RoleId>(['duelist']) }),
      makePlayer('p2'),
      makePlayer('p3'),
    ]
    // P2とP3がduelist（jett, reyna）を全て使用
    const currentResults = [
      makePickResult('p1', 'jett'), // P1の現在の結果（再抽選される）
      makePickResult('p2', 'jett'), // P2がjettを使用
      makePickResult('p3', 'reyna'), // P3がreynaを使用
    ]
    const result = rerollPlayer({
      targetPlayerId: 'p1',
      currentResults,
      players,
      partySettings: makePartySettings({ allowDuplicates: false }),
      allAgents: testAgents,
    })
    expect(result).toHaveProperty('key', 'pick.noValidCombination')
  })
})
