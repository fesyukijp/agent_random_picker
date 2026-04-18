import type {
  Agent,
  PartySettings,
  PickResult,
  Player,
  RoleId,
} from '../../../src/logic/types'
import { MAX_PLAYERS } from '../../../src/stores/playerStore'

// ===== 共通テスト用エージェントデータ（テスト設計書 7.1 準拠） =====

export const testAgents: Agent[] = [
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
    id: 'sova',
    name: 'ソーヴァ',
    roleId: 'initiator',
    imageUrl: '/agents/sova.webp',
  },
  {
    id: 'breach',
    name: 'ブリーチ',
    roleId: 'initiator',
    imageUrl: '/agents/breach.webp',
  },
  {
    id: 'omen',
    name: 'オーメン',
    roleId: 'controller',
    imageUrl: '/agents/omen.webp',
  },
  {
    id: 'brimstone',
    name: 'ブリムストーン',
    roleId: 'controller',
    imageUrl: '/agents/brimstone.webp',
  },
  {
    id: 'sage',
    name: 'セージ',
    roleId: 'sentinel',
    imageUrl: '/agents/sage.webp',
  },
  {
    id: 'cypher',
    name: 'サイファー',
    roleId: 'sentinel',
    imageUrl: '/agents/cypher.webp',
  },
]

export const ALL_ROLES = new Set<RoleId>([
  'duelist',
  'initiator',
  'controller',
  'sentinel',
])

export function makePlayer(
  id: string,
  overrides?: {
    name?: string
    allowedRoles?: Set<RoleId>
    excludedAgentIds?: Set<string>
  },
): Player {
  return {
    id,
    settings: {
      // デフォルトは本番コードと同じ空文字（id を使うと空文字フォールバックロジックがテストされない）
      name: overrides?.name ?? '',
      allowedRoles: overrides?.allowedRoles ?? new Set(ALL_ROLES),
      excludedAgentIds: overrides?.excludedAgentIds ?? new Set(),
    },
  }
}

export function makePartySettings(
  overrides?: Partial<
    Omit<PartySettings, 'roleLimits'> & {
      roleLimits?: Partial<
        Record<RoleId, Partial<{ min: number; max: number }>>
      >
    }
  >,
): PartySettings {
  const defaults: PartySettings['roleLimits'] = {
    duelist: { min: 0, max: MAX_PLAYERS },
    initiator: { min: 0, max: MAX_PLAYERS },
    controller: { min: 0, max: MAX_PLAYERS },
    sentinel: { min: 0, max: MAX_PLAYERS },
  }
  const roleLimitOverrides = overrides?.roleLimits
  return {
    allowDuplicates: overrides?.allowDuplicates ?? false,
    roleLimits: roleLimitOverrides
      ? {
          duelist: { ...defaults.duelist, ...roleLimitOverrides.duelist },
          initiator: {
            ...defaults.initiator,
            ...roleLimitOverrides.initiator,
          },
          controller: {
            ...defaults.controller,
            ...roleLimitOverrides.controller,
          },
          sentinel: { ...defaults.sentinel, ...roleLimitOverrides.sentinel },
        }
      : defaults,
    agentConstraints: overrides?.agentConstraints ?? {},
  }
}

export function makePickResult(
  playerId: string,
  agentId: string,
  agents: Agent[] = testAgents,
): PickResult {
  const agent = agents.find((a) => a.id === agentId)
  if (!agent) {
    throw new Error(`テストデータにエージェント "${agentId}" が存在しません`)
  }
  return { playerId, agent }
}
