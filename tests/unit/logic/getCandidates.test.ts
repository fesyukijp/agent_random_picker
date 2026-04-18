import { describe, it, expect } from 'vitest'
import type { AgentConstraint, RoleId } from '../../../src/logic/types'
import { getCandidates } from '../../../src/logic/randomPicker'
import { testAgents, ALL_ROLES } from '../helpers/logicHelpers'

const defaultConstraints: Record<string, AgentConstraint> = {}

describe('getCandidates', () => {
  // UT-CAND-001: 全ロール許可・除外なしで全エージェントが候補
  it('UT-CAND-001: 全ロール許可・除外なしで全エージェントが候補に含まれる', () => {
    const result = getCandidates({
      agents: testAgents,
      allowedRoles: ALL_ROLES,
      excludedAgentIds: new Set(),
      agentConstraints: defaultConstraints,
    })
    expect(result).toHaveLength(testAgents.length)
    expect(result.map((a) => a.id).sort()).toEqual(
      testAgents.map((a) => a.id).sort(),
    )
  })

  // UT-CAND-002: 特定ロールのみ許可
  it('UT-CAND-002: duelistのみ許可した場合、デュエリストのエージェントのみ返る', () => {
    const result = getCandidates({
      agents: testAgents,
      allowedRoles: new Set<RoleId>(['duelist']),
      excludedAgentIds: new Set(),
      agentConstraints: defaultConstraints,
    })
    expect(result).toHaveLength(2)
    expect(result.every((a) => a.roleId === 'duelist')).toBe(true)
    expect(result.map((a) => a.id).sort()).toEqual(['jett', 'reyna'])
  })

  // UT-CAND-003: 複数ロール許可
  it('UT-CAND-003: duelistとsentinelを許可した場合、両方のエージェントが返る', () => {
    const result = getCandidates({
      agents: testAgents,
      allowedRoles: new Set<RoleId>(['duelist', 'sentinel']),
      excludedAgentIds: new Set(),
      agentConstraints: defaultConstraints,
    })
    expect(result).toHaveLength(4)
    expect(
      result.every((a) => a.roleId === 'duelist' || a.roleId === 'sentinel'),
    ).toBe(true)
  })

  // UT-CAND-004: 特定エージェント除外
  it('UT-CAND-004: excludedAgentIdsにjettとsageを指定した場合、両者が候補に含まれない', () => {
    const result = getCandidates({
      agents: testAgents,
      allowedRoles: ALL_ROLES,
      excludedAgentIds: new Set(['jett', 'sage']),
      agentConstraints: defaultConstraints,
    })
    expect(result).toHaveLength(testAgents.length - 2)
    expect(result.find((a) => a.id === 'jett')).toBeUndefined()
    expect(result.find((a) => a.id === 'sage')).toBeUndefined()
  })

  // UT-CAND-005: 全体設定でbannedのエージェント除外
  it('UT-CAND-005: agentConstraintsでbannedにしたreynaが候補に含まれない', () => {
    const result = getCandidates({
      agents: testAgents,
      allowedRoles: ALL_ROLES,
      excludedAgentIds: new Set(),
      agentConstraints: { reyna: 'banned' },
    })
    expect(result.find((a) => a.id === 'reyna')).toBeUndefined()
    expect(result).toHaveLength(testAgents.length - 1)
  })

  // UT-CAND-006: ロール除外とエージェント除外の組み合わせ
  it('UT-CAND-006: duelistとinitiatorを許可しjettを除外した場合、jettを除くduelistとinitiatorが返る', () => {
    const result = getCandidates({
      agents: testAgents,
      allowedRoles: new Set<RoleId>(['duelist', 'initiator']),
      excludedAgentIds: new Set(['jett']),
      agentConstraints: defaultConstraints,
    })
    // duelist: reyna(jettは除外), initiator: sova, breach = 3体
    expect(result).toHaveLength(3)
    expect(result.find((a) => a.id === 'jett')).toBeUndefined()
    expect(
      result.every((a) => a.roleId === 'duelist' || a.roleId === 'initiator'),
    ).toBe(true)
  })

  // UT-CAND-007: 全ロール除外で候補が空
  it('UT-CAND-007: allowedRolesが空集合の場合、空配列が返る', () => {
    const result = getCandidates({
      agents: testAgents,
      allowedRoles: new Set<RoleId>(),
      excludedAgentIds: new Set(),
      agentConstraints: defaultConstraints,
    })
    expect(result).toHaveLength(0)
  })

  // UT-CAND-008: ロール許可だが全エージェント個別除外で候補が空
  it('UT-CAND-008: duelistを許可するが全デュエリストをexcludedAgentIdsに指定した場合、空配列が返る', () => {
    const result = getCandidates({
      agents: testAgents,
      allowedRoles: new Set<RoleId>(['duelist']),
      excludedAgentIds: new Set(['jett', 'reyna']),
      agentConstraints: defaultConstraints,
    })
    expect(result).toHaveLength(0)
  })

  // UT-CAND-009: 全体banned + 個別除外の重複適用
  it('UT-CAND-009: jettをbannedかつexcludedAgentIdsにも指定した場合、jettが含まれずエラーにならない', () => {
    const result = getCandidates({
      agents: testAgents,
      allowedRoles: ALL_ROLES,
      excludedAgentIds: new Set(['jett']),
      agentConstraints: { jett: 'banned' },
    })
    expect(result.find((a) => a.id === 'jett')).toBeUndefined()
    expect(result).toHaveLength(testAgents.length - 1)
  })

  // UT-CAND-010: required 制約のエージェントは getCandidates で除外されない
  it('UT-CAND-010: requiredに指定されたエージェントも候補に含まれる', () => {
    const result = getCandidates({
      agents: testAgents,
      allowedRoles: ALL_ROLES,
      excludedAgentIds: new Set(),
      agentConstraints: { jett: 'required', sage: 'required' },
    })
    // required は banned/excluded とは異なり、候補から除外されない
    expect(result.find((a) => a.id === 'jett')).toBeDefined()
    expect(result.find((a) => a.id === 'sage')).toBeDefined()
    expect(result).toHaveLength(testAgents.length)
  })
})
