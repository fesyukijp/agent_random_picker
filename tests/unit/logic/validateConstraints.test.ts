import { describe, it, expect } from 'vitest'
import type { Agent, RoleId } from '../../../src/logic/types'
import { validateConstraints } from '../../../src/logic/validator'
import {
  testAgents,
  makePlayer,
  makePartySettings,
} from '../helpers/logicHelpers'

// UT-VAL-008 用: controller 4体 + UT-VAL-012 用: duelist 3体—このファイル固有の拡張データ
const extendedTestAgents: Agent[] = [
  ...testAgents,
  {
    id: 'viper',
    name: 'ヴァイパー',
    roleId: 'controller',
    imageUrl: '/agents/viper.webp',
  },
  {
    id: 'astra',
    name: 'アストラ',
    roleId: 'controller',
    imageUrl: '/agents/astra.webp',
  },
  {
    id: 'phoenix',
    name: 'フェニックス',
    roleId: 'duelist',
    imageUrl: '/agents/phoenix.webp',
  },
]

describe('validateConstraints', () => {
  // UT-VAL-001: 全デフォルト設定（1人）で検証成功
  it('UT-VAL-001: 全デフォルト設定（1人）で検証成功', () => {
    const result = validateConstraints({
      players: [makePlayer('p1')],
      partySettings: makePartySettings(),
      agents: testAgents,
    })
    expect(result.valid).toBe(true)
  })

  // UT-VAL-002: 全デフォルト設定（5人）で検証成功
  it('UT-VAL-002: 全デフォルト設定（5人）で検証成功', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => makePlayer(id))
    const result = validateConstraints({
      players,
      partySettings: makePartySettings(),
      agents: testAgents,
    })
    expect(result.valid).toBe(true)
  })

  // UT-VAL-003: プレイヤーの候補が0体
  it('UT-VAL-003: プレイヤーの候補が0体の場合、エラーを返す', () => {
    const p1 = makePlayer('p1', {
      name: 'テスト太郎',
      allowedRoles: new Set<RoleId>(),
    })
    const result = validateConstraints({
      players: [p1],
      partySettings: makePartySettings(),
      agents: testAgents,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.key).toBe('validation.noRolesSelected')
      expect(result.error.params?.name).toBe('テスト太郎')
    }
  })

  // UT-VAL-004: 必須エージェント数 > プレイヤー数
  it('UT-VAL-004: 必須エージェント数がプレイヤー数を超える場合、エラーを返す', () => {
    const result = validateConstraints({
      players: [makePlayer('p1'), makePlayer('p2')],
      partySettings: makePartySettings({
        agentConstraints: {
          jett: 'required',
          sage: 'required',
          omen: 'required',
        },
      }),
      agents: testAgents,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.key).toBe('validation.requiredExceedsPlayers')
      expect(result.error.params?.count).toBe(3)
      expect(result.error.params?.n).toBe(2)
    }
  })

  // UT-VAL-005: ロール下限合計 > プレイヤー数
  it('UT-VAL-005: ロール下限合計がプレイヤー数を超える場合、エラーを返す', () => {
    const result = validateConstraints({
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      partySettings: makePartySettings({
        roleLimits: {
          duelist: { min: 2, max: 3 },
          initiator: { min: 0, max: 3 },
          controller: { min: 0, max: 3 },
          sentinel: { min: 2, max: 3 },
        },
      }),
      agents: testAgents,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.key).toBe('validation.totalMinExceedsPlayers')
      expect(result.error.params?.totalMin).toBe(4)
      expect(result.error.params?.n).toBe(3)
    }
  })

  // UT-VAL-006: ロール下限 > 上限
  it('UT-VAL-006: ロール下限が上限を超える場合、エラーを返す', () => {
    const result = validateConstraints({
      players: [makePlayer('p1')],
      partySettings: makePartySettings({
        roleLimits: {
          duelist: { min: 3, max: 1 },
          initiator: { min: 0, max: 5 },
          controller: { min: 0, max: 5 },
          sentinel: { min: 0, max: 5 },
        },
      }),
      agents: testAgents,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.key).toBe('validation.roleMinExceedsMax')
      expect(result.error.params?.role).toBe('duelist')
    }
  })

  // UT-VAL-007: 必須エージェントが全員の候補外
  it('UT-VAL-007: 必須エージェントが全プレイヤーの候補外の場合、エラーを返す', () => {
    const p1 = makePlayer('p1', { excludedAgentIds: new Set(['jett']) })
    const p2 = makePlayer('p2', { excludedAgentIds: new Set(['jett']) })
    const result = validateConstraints({
      players: [p1, p2],
      partySettings: makePartySettings({
        agentConstraints: { jett: 'required' },
      }),
      agents: testAgents,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.key).toBe('validation.requiredUnreachable')
      expect(result.error.params?.agentId).toBe('jett')
    }
  })

  // UT-VAL-008: 重複不可で候補が足りない場合の正しい判定（成功ケース）
  it('UT-VAL-008: 重複不可でcontroller 4体から3人選択（各1体ずつ異なる除外）は成功', () => {
    const p1 = makePlayer('p1', {
      allowedRoles: new Set<RoleId>(['controller']),
      excludedAgentIds: new Set(['omen']),
    })
    const p2 = makePlayer('p2', {
      allowedRoles: new Set<RoleId>(['controller']),
      excludedAgentIds: new Set(['brimstone']),
    })
    const p3 = makePlayer('p3', {
      allowedRoles: new Set<RoleId>(['controller']),
      excludedAgentIds: new Set(['viper']),
    })
    const result = validateConstraints({
      players: [p1, p2, p3],
      partySettings: makePartySettings({ allowDuplicates: false }),
      agents: extendedTestAgents,
    })
    expect(result.valid).toBe(true)
  })

  // UT-VAL-009: 重複可で同じ候補1体のみの全プレイヤーが検証成功
  it('UT-VAL-009: 重複可で全プレイヤーの候補が同じ1体のみでも検証成功', () => {
    const p1 = makePlayer('p1', {
      allowedRoles: new Set<RoleId>(['duelist']),
      excludedAgentIds: new Set(['reyna']),
    })
    const p2 = makePlayer('p2', {
      allowedRoles: new Set<RoleId>(['duelist']),
      excludedAgentIds: new Set(['reyna']),
    })
    const result = validateConstraints({
      players: [p1, p2],
      partySettings: makePartySettings({ allowDuplicates: true }),
      agents: testAgents,
    })
    expect(result.valid).toBe(true)
  })

  // UT-VAL-010: 重複不可でプレイヤー数 > 全候補ユニオン数
  it('UT-VAL-010: 重複不可でプレイヤー数が全候補ユニオン数を超える場合、エラーを返す', () => {
    const p1 = makePlayer('p1', { allowedRoles: new Set<RoleId>(['duelist']) })
    const p2 = makePlayer('p2', { allowedRoles: new Set<RoleId>(['duelist']) })
    const p3 = makePlayer('p3', { allowedRoles: new Set<RoleId>(['duelist']) })
    const result = validateConstraints({
      players: [p1, p2, p3],
      partySettings: makePartySettings({ allowDuplicates: false }),
      agents: testAgents,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.key).toBe('validation.noDuplicatesInsufficientAgents')
    }
  })

  // UT-VAL-011: ロール上限合計 < プレイヤー数
  it('UT-VAL-011: 全ロールmax=0でロール上限合計がプレイヤー数未満の場合、エラーを返す', () => {
    const result = validateConstraints({
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      partySettings: makePartySettings({
        roleLimits: {
          duelist: { min: 0, max: 0 },
          initiator: { min: 0, max: 0 },
          controller: { min: 0, max: 0 },
          sentinel: { min: 0, max: 0 },
        },
      }),
      agents: testAgents,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.key).toBe('validation.totalMaxBelowPlayers')
    }
  })

  // UT-VAL-012: 必須エージェントのロールが下限超過
  it('UT-VAL-012: 必須エージェントのロール合計がロールmaxを超える場合、エラーを返す', () => {
    const result = validateConstraints({
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      partySettings: makePartySettings({
        roleLimits: {
          duelist: { min: 0, max: 1 },
          initiator: { min: 0, max: 3 },
          controller: { min: 0, max: 3 },
          sentinel: { min: 0, max: 3 },
        },
        agentConstraints: {
          jett: 'required',
          reyna: 'required',
          phoenix: 'required',
        },
      }),
      agents: extendedTestAgents,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.key).toBe('validation.requiredExceedsRoleMax')
      expect(result.error.params?.role).toBe('duelist')
      expect(result.error.params?.count).toBe(3)
      expect(result.error.params?.max).toBe(1)
    }
  })

  // UT-VAL-013: フロー判定で実現不可能な組み合わせ
  it('UT-VAL-013: 重複不可でP1・P2の候補が同じ1体のみの場合、エラーを返す', () => {
    const p1 = makePlayer('p1', {
      allowedRoles: new Set<RoleId>(['duelist']),
      excludedAgentIds: new Set(['reyna']),
    })
    const p2 = makePlayer('p2', {
      allowedRoles: new Set<RoleId>(['duelist']),
      excludedAgentIds: new Set(['reyna']),
    })
    const result = validateConstraints({
      players: [p1, p2],
      partySettings: makePartySettings({ allowDuplicates: false }),
      agents: testAgents,
    })
    expect(result.valid).toBe(false)
    if (!result.valid) {
      expect(result.error.key).toBe('validation.noDuplicatesInsufficientAgents')
    }
  })
})
