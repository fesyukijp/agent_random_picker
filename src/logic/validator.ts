import { ROLE_IDS } from './types'
import type { Agent, PartySettings, Player, RoleId } from './types'
import { getCandidates } from './randomPicker'
import { AGENTS_BY_ID } from '../data/agents'
import type { TranslatableMessage } from '../i18n/types'

// ===== validateConstraints =====

interface ValidateConstraintsParams {
  players: readonly Player[]
  partySettings: PartySettings
  agents: readonly Agent[]
}

export type ValidationResult =
  | { valid: true; candidates: Agent[][] }
  | { valid: false; error: TranslatableMessage }

/**
 * 抽選前の条件整合性チェック。
 *
 * チェック順序:
 *   1. ロールmin > max
 *   2. Σmin > プレイヤー数
 *   3. 必須エージェント数 > プレイヤー数
 *   4. Σmax < プレイヤー数
 *   5. 各プレイヤーの候補が0体
 *   6. 必須エージェントが誰の候補にも含まれない
 *   7. 必須エージェントのロール合計 > そのロールのmax
 *   8. 重複不可: 全候補ユニオン < プレイヤー数
 *
 * 注意: roleLimits.max はプレイヤー数と独立して保存される。UI 側で
 * Math.min(max, playerCount) にクランプして表示するが、ストアには
 * max > playerCount の値が残ることがある（プレイヤー削除時）。
 * DP ロジックは割り当て可能なプレイヤー数で自然に上限が効くため、
 * ここでの明示的なクランプは不要。
 *
 * 重要: このバリデーションが { valid: true } を返しても、候補の分布によっては
 * randomPick が実行不能と判断して TranslatableMessage を返すことがある
 * （チェック8は偽陰性が既知）。
 * 詳細なエラーは randomPick の DP が検出する。
 */
export function validateConstraints({
  players,
  partySettings,
  agents,
}: ValidateConstraintsParams): ValidationResult {
  const n = players.length
  const { allowDuplicates, roleLimits, agentConstraints } = partySettings

  // 1. ロール min > max
  for (const roleId of ROLE_IDS) {
    const { min, max } = roleLimits[roleId]
    if (min > max) {
      return {
        valid: false,
        error: {
          key: 'validation.roleMinExceedsMax',
          params: { role: roleId },
        },
      }
    }
  }

  // 2. Σmin > プレイヤー数
  const totalMin = ROLE_IDS.reduce((sum, r) => sum + roleLimits[r].min, 0)
  if (totalMin > n) {
    return {
      valid: false,
      error: {
        key: 'validation.totalMinExceedsPlayers',
        params: { totalMin, n },
      },
    }
  }

  // 3. 必須エージェント数 > プレイヤー数
  const requiredAgentIds = Object.entries(agentConstraints)
    .filter(([, constraint]) => constraint === 'required')
    .map(([id]) => id)

  if (requiredAgentIds.length > n) {
    return {
      valid: false,
      error: {
        key: 'validation.requiredExceedsPlayers',
        params: { count: requiredAgentIds.length, n },
      },
    }
  }

  // 4. Σmax < プレイヤー数
  const totalMax = ROLE_IDS.reduce((sum, r) => sum + roleLimits[r].max, 0)
  if (totalMax < n) {
    return {
      valid: false,
      error: {
        key: 'validation.totalMaxBelowPlayers',
        params: { totalMax, n },
      },
    }
  }

  // 5. 各プレイヤーの候補が0体
  const playerCandidates = players.map((player) =>
    getCandidates({
      agents,
      allowedRoles: player.settings.allowedRoles,
      excludedAgentIds: player.settings.excludedAgentIds,
      agentConstraints,
    }),
  )

  for (let i = 0; i < players.length; i++) {
    if (playerCandidates[i].length === 0) {
      // name: ストア保存値。空文字の場合は playerIndex を渡し、UI 側で
      // t('player.defaultName', { n: playerIndex + 1 }) に変換する。
      const name = players[i].settings.name
      const playerIndex = i
      if (players[i].settings.allowedRoles.size === 0) {
        return {
          valid: false,
          error: {
            key: 'validation.noRolesSelected',
            params: { name: name || '', playerIndex },
          },
        }
      }
      return {
        valid: false,
        error: {
          key: 'validation.noCandidates',
          params: { name: name || '', playerIndex },
        },
      }
    }
  }

  // 6. 必須エージェントが誰の候補にも含まれない
  const playerCandidateSets = playerCandidates.map((candidates) => {
    const ids = new Set<string>()
    for (const a of candidates) ids.add(a.id)
    return ids
  })
  // O(1) エージェントルックアップ用 Map（check 7 で使用）
  const agentById = AGENTS_BY_ID
  for (const agentId of requiredAgentIds) {
    const reachable = playerCandidateSets.some((set) => set.has(agentId))
    if (!reachable) {
      return {
        valid: false,
        error: {
          key: 'validation.requiredUnreachable',
          params: { agentId },
        },
      }
    }
  }

  // 7. 必須エージェントのロール合計 > そのロールのmax
  const requiredByRole: Partial<Record<RoleId, number>> = {}
  for (const agentId of requiredAgentIds) {
    const agent = agentById.get(agentId)
    if (agent) {
      requiredByRole[agent.roleId] = (requiredByRole[agent.roleId] ?? 0) + 1
    }
  }
  for (const roleId of ROLE_IDS) {
    const count = requiredByRole[roleId] ?? 0
    if (count > roleLimits[roleId].max) {
      return {
        valid: false,
        error: {
          key: 'validation.requiredExceedsRoleMax',
          params: { role: roleId, count, max: roleLimits[roleId].max },
        },
      }
    }
  }

  // 8. 重複不可: 全候補ユニオン < プレイヤー数
  if (!allowDuplicates) {
    const union = new Set<string>()
    for (const set of playerCandidateSets) {
      for (const id of set) union.add(id)
    }
    if (union.size < n) {
      return {
        valid: false,
        error: { key: 'validation.noDuplicatesInsufficientAgents' },
      }
    }
  }

  return { valid: true, candidates: playerCandidates }
}
