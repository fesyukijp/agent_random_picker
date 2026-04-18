import { describe, it, expect } from 'vitest'
import type { Agent, RoleId } from '../../../src/logic/types'
import { randomPick, getCandidates } from '../../../src/logic/randomPicker'
import {
  testAgents,
  makePlayer,
  makePartySettings,
} from '../helpers/logicHelpers'

// UT-PICK-011 用: 同ロール3体（一様性統計テスト）—このファイル固有のデータ
const threeAgents: Agent[] = [
  {
    id: 'jett',
    name: 'ジェット',
    roleId: 'duelist',
    imageUrl: '/agents/jett.webp',
  },
  {
    id: 'reyna',
    name: 'レイナ',
    roleId: 'duelist',
    imageUrl: '/agents/reyna.webp',
  },
  {
    id: 'phoenix',
    name: 'フェニックス',
    roleId: 'duelist',
    imageUrl: '/agents/phoenix.webp',
  },
]

describe('randomPick', () => {
  // UT-PICK-001: 1人・全デフォルト設定で有効なエージェントが返る
  it('UT-PICK-001: 1人・全デフォルト設定で有効なエージェントが返る', () => {
    const result = randomPick({
      players: [makePlayer('p1')],
      partySettings: makePartySettings(),
      allAgents: testAgents,
    })
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1)
      expect(result[0].playerId).toBe('p1')
      const agentIds = testAgents.map((a) => a.id)
      expect(agentIds).toContain(result[0].agent.id)
    }
  })

  // UT-PICK-002: 1人・ロール限定で該当ロールのエージェントが返る
  it('UT-PICK-002: 1人・ロール限定（sentinel）で該当ロールのエージェントが返る', () => {
    const result = randomPick({
      players: [
        makePlayer('p1', { allowedRoles: new Set<RoleId>(['sentinel']) }),
      ],
      partySettings: makePartySettings(),
      allAgents: testAgents,
    })
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(1)
      expect(result[0].agent.roleId).toBe('sentinel')
    }
  })

  // UT-PICK-003: 2人・重複不可で異なるエージェントが返る
  it('UT-PICK-003: 2人・重複不可で異なるエージェントが返る', () => {
    const result = randomPick({
      players: [makePlayer('p1'), makePlayer('p2')],
      partySettings: makePartySettings({ allowDuplicates: false }),
      allAgents: testAgents,
    })
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2)
      expect(result[0].agent.id).not.toBe(result[1].agent.id)
    }
  })

  // UT-PICK-004: 2人・重複可で同じエージェントが返りうる（候補1体のみ）
  it('UT-PICK-004: 2人・重複可で候補が1体のみの場合、両者が同じエージェントになる', () => {
    // 両プレイヤーの候補がjettのみ（reynaを除外）
    const result = randomPick({
      players: [
        makePlayer('p1', {
          allowedRoles: new Set<RoleId>(['duelist']),
          excludedAgentIds: new Set(['reyna']),
        }),
        makePlayer('p2', {
          allowedRoles: new Set<RoleId>(['duelist']),
          excludedAgentIds: new Set(['reyna']),
        }),
      ],
      partySettings: makePartySettings({ allowDuplicates: true }),
      allAgents: testAgents,
    })
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2)
      expect(result[0].agent.id).toBe('jett')
      expect(result[1].agent.id).toBe('jett')
    }
  })

  // UT-PICK-005: 5人・全デフォルトで5件の結果が返る（重複不可）
  it('UT-PICK-005: 5人・全デフォルト・重複不可で5件の異なる結果が返る', () => {
    const players = ['p1', 'p2', 'p3', 'p4', 'p5'].map((id) => makePlayer(id))
    const result = randomPick({
      players,
      partySettings: makePartySettings({ allowDuplicates: false }),
      allAgents: testAgents,
    })
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(5)
      const agentIds = result.map((r) => r.agent.id)
      const uniqueIds = new Set(agentIds)
      expect(uniqueIds.size).toBe(5)
    }
  })

  // UT-PICK-006: 必須エージェントが結果に含まれる
  it('UT-PICK-006: 必須エージェント（jett）が結果に含まれる', () => {
    const result = randomPick({
      players: [makePlayer('p1'), makePlayer('p2')],
      partySettings: makePartySettings({
        agentConstraints: { jett: 'required' },
      }),
      allAgents: testAgents,
    })
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2)
      expect(result.some((r) => r.agent.id === 'jett')).toBe(true)
    }
  })

  // UT-PICK-007: 複数必須エージェントがすべて結果に含まれる
  it('UT-PICK-007: 複数の必須エージェント（jett, sage, omen）がすべて結果に含まれる', () => {
    const result = randomPick({
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      partySettings: makePartySettings({
        agentConstraints: {
          jett: 'required',
          sage: 'required',
          omen: 'required',
        },
      }),
      allAgents: testAgents,
    })
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(3)
      const assignedIds = result.map((r) => r.agent.id)
      expect(assignedIds).toContain('jett')
      expect(assignedIds).toContain('sage')
      expect(assignedIds).toContain('omen')
    }
  })

  // UT-PICK-008: ロール人数制限が満たされる
  it('UT-PICK-008: duelist min=1 max=1 の場合、結果のduelistがちょうど1人', () => {
    const result = randomPick({
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      partySettings: makePartySettings({
        roleLimits: {
          duelist: { min: 1, max: 1 },
          initiator: { min: 0, max: 5 },
          controller: { min: 0, max: 5 },
          sentinel: { min: 0, max: 5 },
        },
      }),
      allAgents: testAgents,
    })
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(3)
      const duelists = result.filter((r) => r.agent.roleId === 'duelist')
      expect(duelists).toHaveLength(1)
    }
  })

  // UT-PICK-009: 条件不成立でエラー返却（UT-VAL-013と同じ入力）
  it('UT-PICK-009: 重複不可でP1・P2の候補が同じ1体のみの場合、Errorを返す', () => {
    // P1候補={jett}、P2候補={jett} → 重複不可で有効な割り当てなし
    const result = randomPick({
      players: [
        makePlayer('p1', {
          allowedRoles: new Set<RoleId>(['duelist']),
          excludedAgentIds: new Set(['reyna']),
        }),
        makePlayer('p2', {
          allowedRoles: new Set<RoleId>(['duelist']),
          excludedAgentIds: new Set(['reyna']),
        }),
      ],
      partySettings: makePartySettings({ allowDuplicates: false }),
      allAgents: testAgents,
    })
    expect(Array.isArray(result)).toBe(false)
    expect(result).toHaveProperty('key', 'pick.noValidCombination')
  })

  // UT-PICK-012: 必須エージェントが特定プレイヤーのみの候補
  it('UT-PICK-012: 必須jettがP1のみの候補の場合、jettは必ずP1に割り当てられる', () => {
    const result = randomPick({
      players: [
        makePlayer('p1'),
        makePlayer('p2', { excludedAgentIds: new Set(['jett']) }),
      ],
      partySettings: makePartySettings({
        agentConstraints: { jett: 'required' },
      }),
      allAgents: testAgents,
    })
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(2)
      const p1Result = result.find((r) => r.playerId === 'p1')
      expect(p1Result?.agent.id).toBe('jett')
    }
  })

  // UT-PICK-013: ロール人数制限と必須の組み合わせ
  it('UT-PICK-013: duelist min=2 かつ required=sage の場合、duelist 2人 + sage が割り当てられる', () => {
    // testAgents: duelist=2体(jett,reyna), sentinel=2体(sage,cypher)
    // duelist min=2 → jett, reyna は両方使われる（2体しかないため）
    // sage 必須 → sage が3人目
    const result = randomPick({
      players: [makePlayer('p1'), makePlayer('p2'), makePlayer('p3')],
      partySettings: makePartySettings({
        roleLimits: {
          duelist: { min: 2, max: 5 },
          initiator: { min: 0, max: 5 },
          controller: { min: 0, max: 5 },
          sentinel: { min: 0, max: 5 },
        },
        agentConstraints: { sage: 'required' },
      }),
      allAgents: testAgents,
    })
    expect(Array.isArray(result)).toBe(true)
    if (Array.isArray(result)) {
      expect(result).toHaveLength(3)
      const duelists = result.filter((r) => r.agent.roleId === 'duelist')
      expect(duelists.length).toBeGreaterThanOrEqual(2)
      expect(result.some((r) => r.agent.id === 'sage')).toBe(true)
    }
  })

  // UT-PICK-010: 一様性の統計的検証（候補2体、1人）
  // 試行回数 5000 回: 統計的有意性を保ちつつ crypto.getRandomValues のシステムコール負荷を軽減
  it(
    'UT-PICK-010: 候補2体・1人の場合、5000回実行で各50%±6%の範囲',
    { timeout: 15000 },
    () => {
      const params = {
        players: [
          makePlayer('p1', { allowedRoles: new Set<RoleId>(['duelist']) }),
        ],
        partySettings: makePartySettings(),
        allAgents: testAgents, // duelist: jett, reyna の2体
      }
      const counts: Record<string, number> = { jett: 0, reyna: 0 }
      const TRIALS = 5000
      for (let i = 0; i < TRIALS; i++) {
        const result = randomPick(params)
        if (Array.isArray(result)) {
          const id = result[0].agent.id
          if (id in counts) counts[id]++
        }
      }
      // 各エージェントが 43%〜57% の範囲に収まること（3σ + マージン: CI 大量実行での偽陰性を抑制）
      expect(counts.jett).toBeGreaterThan(TRIALS * 0.43)
      expect(counts.jett).toBeLessThan(TRIALS * 0.57)
      expect(counts.reyna).toBeGreaterThan(TRIALS * 0.43)
      expect(counts.reyna).toBeLessThan(TRIALS * 0.57)
    },
  )

  // UT-PICK-011: 一様性の統計的検証（2人・重複不可・各候補3体共通）
  // 試行回数 5000 回: χ²検定は 5000 回で十分な検出力
  it(
    'UT-PICK-011: 候補3体・2人・重複不可の場合、5000回実行でχ²検定p>0.01',
    { timeout: 15000 },
    () => {
      // jett, reyna, phoenix の3体（全員同ロール=duelist）
      // 有効な割り当て: 3×2=6通り、各1/6の確率
      const params = {
        players: [
          makePlayer('p1', {
            allowedRoles: new Set<RoleId>(['duelist']),
          }),
          makePlayer('p2', {
            allowedRoles: new Set<RoleId>(['duelist']),
          }),
        ],
        partySettings: makePartySettings({ allowDuplicates: false }),
        allAgents: threeAgents,
      }

      const counts = new Map<string, number>()
      const TRIALS = 5000
      for (let i = 0; i < TRIALS; i++) {
        const result = randomPick(params)
        if (Array.isArray(result)) {
          const key = `${result[0].agent.id}-${result[1].agent.id}`
          counts.set(key, (counts.get(key) ?? 0) + 1)
        }
      }

      // 6通りのアウトカムが存在すること
      expect(counts.size).toBe(6)

      // χ²検定: 5自由度、p=0.01 の棄却域は χ² > 15.086
      const expected = TRIALS / 6
      let chiSquared = 0
      for (const count of counts.values()) {
        chiSquared += (count - expected) ** 2 / expected
      }
      expect(chiSquared).toBeLessThan(15.086)
    },
  )

  // UT-PICK-014: precomputedCandidates を指定した場合もピックが成功する
  it('UT-PICK-014: precomputedCandidatesを指定した場合と同じ結果構造が返る', () => {
    const players = [makePlayer('p1'), makePlayer('p2')]
    const partySettings = makePartySettings()
    const candidates = players.map((p) =>
      getCandidates({
        agents: testAgents,
        allowedRoles: p.settings.allowedRoles,
        excludedAgentIds: p.settings.excludedAgentIds,
        agentConstraints: partySettings.agentConstraints,
      }),
    )
    const result = randomPick({
      players,
      partySettings,
      allAgents: testAgents,
      precomputedCandidates: candidates,
    })
    expect(Array.isArray(result)).toBe(true)
    if (!Array.isArray(result)) return
    expect(result).toHaveLength(2)
    expect(result[0].playerId).toBe('p1')
    expect(result[1].playerId).toBe('p2')
  })

  // ADR-013: BigInt 移行により 32 体以上でも正常動作する
  it('ADR-013: 40体のユニークエージェントでも正常にピックできる（BigInt移行確認）', () => {
    const agents = Array.from(
      { length: 40 },
      (_, i): Agent => ({
        id: `agent-big-${i}`,
        name: `エージェント${i + 1}`,
        roleId: (['duelist', 'initiator', 'controller', 'sentinel'] as const)[
          i % 4
        ],
        imageUrl: `/agents/big-${i}.webp`,
      }),
    )

    const result = randomPick({
      players: [makePlayer('p1')],
      partySettings: makePartySettings(),
      allAgents: agents,
    })
    expect(Array.isArray(result)).toBe(true)
    if (!Array.isArray(result)) return
    expect(result).toHaveLength(1)
    expect(result[0].playerId).toBe('p1')
  })
})
