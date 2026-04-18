// ===== マスターデータ型 =====

export type RoleId = 'duelist' | 'initiator' | 'controller' | 'sentinel'

export const ROLE_IDS: readonly RoleId[] = [
  'duelist',
  'initiator',
  'controller',
  'sentinel',
]

export interface Role {
  id: RoleId
  name: string
}

export interface Agent {
  id: string
  name: string
  roleId: RoleId
  imageUrl: string
}

// ===== プレイヤー設定型 =====

export interface PlayerSettings {
  name: string
  /**
   * NOTE: Set 型フィールドは playerStore.ts の jsonStorage（replacer/reviver）に依存して
   * シリアライズ/デシリアライズされる。ストレージ層を変更する際は Set ラッパー処理を引き継ぐこと。
   */
  allowedRoles: Set<RoleId>
  excludedAgentIds: Set<string>
}

export interface Player {
  id: string
  settings: PlayerSettings
}

// ===== パーティー全体設定型 =====

export type AgentConstraint = 'allowed' | 'required' | 'banned'

export interface PartySettings {
  allowDuplicates: boolean
  /**
   * ロール別の割り当て人数制限。
   *
   * 不変条件（抽選ロジックはこれを前提とする）:
   *   - min >= 0
   *   - min <= max
   *
   * 注意: allowedRoles / excludedAgentIds との組み合わせによっては
   * 有効な割り当てが存在しない状態（候補ゼロ）になりうる。
   * 抽選ロジックはこの状態を検出し、エラーとして呼び出し元に返すこと。
   */
  roleLimits: Record<RoleId, { min: number; max: number }>
  agentConstraints: Record<string, AgentConstraint>
}

// ===== 抽選結果型 =====

export interface PickResult {
  playerId: string
  agent: Agent
}
