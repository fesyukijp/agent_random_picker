import { describe, it, expect } from 'vitest'
import { AGENTS, ROLES } from '../../../src/data/agents'

describe('Agent Master Data', () => {
  // UT-DATA-001: 全エージェントが4ロールのいずれかに属する
  it('all agents belong to one of the 4 valid roles', () => {
    const validRoleIds = ROLES.map((r) => r.id)
    for (const agent of AGENTS) {
      expect(validRoleIds).toContain(agent.roleId)
    }
  })

  // UT-DATA-002: エージェントIDが一意
  it('all agent IDs are unique', () => {
    const ids = AGENTS.map((a) => a.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  // UT-DATA-003: 全エージェントにname, roleId, imageUrlが設定
  it('all agents have name, roleId, and imageUrl set', () => {
    for (const agent of AGENTS) {
      expect(agent.id).toBeTruthy()
      expect(agent.name).toBeTruthy()
      expect(agent.roleId).toBeTruthy()
      expect(agent.imageUrl).toBeTruthy()
    }
  })

  // UT-DATA-004: 4ロールすべてに少なくとも1体のエージェントが存在
  it('all 4 roles have at least one agent', () => {
    for (const role of ROLES) {
      const agentsForRole = AGENTS.filter((a) => a.roleId === role.id)
      expect(agentsForRole.length).toBeGreaterThanOrEqual(1)
    }
  })

  // UT-DATA-005: エージェントIDの一覧がスナップショットと一致（追加・削除を検出）
  it('agent IDs match known snapshot', () => {
    expect(AGENTS.map((a) => a.id).sort()).toMatchSnapshot()
  })

  // UT-DATA-006: エージェント数の健全性チェック
  // ADR-013: BigInt 移行済みのためビット幅上限は存在しない。
  // ここでは Valorant の実際のエージェント数（2026年時点で29体）を大幅に超えていないことを確認する。
  it('agent count is within reasonable range', () => {
    expect(AGENTS.length).toBeGreaterThanOrEqual(1)
    expect(AGENTS.length).toBeLessThanOrEqual(100)
  })
})

describe('Role Master Data', () => {
  it('all 4 roles are defined', () => {
    expect(ROLES).toHaveLength(4)
    const roleIds = ROLES.map((r) => r.id)
    expect(roleIds).toContain('duelist')
    expect(roleIds).toContain('initiator')
    expect(roleIds).toContain('controller')
    expect(roleIds).toContain('sentinel')
  })

  it('all roles have id and name set', () => {
    for (const role of ROLES) {
      expect(role.id).toBeTruthy()
      expect(role.name).toBeTruthy()
    }
  })
})
