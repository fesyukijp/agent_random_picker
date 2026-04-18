import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { ROLE_IDS } from '../logic/types'
import type {
  AgentConstraint,
  PartySettings,
  Player,
  RoleId,
} from '../logic/types'
import { AGENTS, AGENTS_BY_ID, AGENTS_BY_ROLE } from '../data/agents'
import { useResultStore } from './resultStore'

const ALL_ROLES: ReadonlySet<RoleId> = new Set(ROLE_IDS)
export const MAX_PLAYERS = 5
const MAX_NAME_LENGTH = 20

// UUID v4 形式の検証（localStorage 改ざん耐性: 不正な id を検出して再生成する）
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

// C0/C1 制御文字、改行、Unicode 方向制御文字を除去する共通サニタイズ関数。
// updatePlayerName・migrateV0・normalizeV1State の全経路で使用し、
// localStorage 改ざんによる Bidi スプーフィングや改行注入を防ぐ。
const CONTROL_CHAR_RE =
  // eslint-disable-next-line no-control-regex
  /[\u0000-\u001f\u007f\u200e\u200f\u202a-\u202e\u2066-\u2069]/g

function sanitizeName(raw: unknown): string {
  return typeof raw === 'string'
    ? raw.replace(CONTROL_CHAR_RE, '').slice(0, MAX_NAME_LENGTH)
    : ''
}

function createDefaultPlayer(): Player {
  return {
    id: crypto.randomUUID(),
    settings: {
      name: '',
      allowedRoles: new Set(ALL_ROLES),
      excludedAgentIds: new Set(),
    },
  }
}

// resetAll 用の固定初期値（max=MAX_PLAYERS）。
// resetRoleLimits はプレイヤー数から動的計算するため非対称だが、
// resetAll は「工場出荷状態」として常に max=5 を使うことを意図的設計とする。
const DEFAULT_ROLE_LIMITS: PartySettings['roleLimits'] = {
  duelist: { min: 0, max: MAX_PLAYERS },
  initiator: { min: 0, max: MAX_PLAYERS },
  controller: { min: 0, max: MAX_PLAYERS },
  sentinel: { min: 0, max: MAX_PLAYERS },
}

interface PlayerStore {
  players: Player[]
  partySettings: PartySettings
  addPlayer: () => void
  removePlayer: (playerId: string) => void
  updatePlayerName: (playerId: string, name: string) => void
  toggleRole: (playerId: string, roleId: RoleId) => void
  setAllRoles: (playerId: string, enabled: boolean) => void
  toggleAgent: (playerId: string, agentId: string) => void
  setAllAgents: (playerId: string, enabled: boolean) => void
  setAllowDuplicates: (value: boolean) => void
  setRoleLimit: (roleId: RoleId, min: number, max: number) => void
  cycleAgentConstraint: (agentId: string) => void
  setAgentConstraint: (agentId: string, constraint: AgentConstraint) => void
  setRoleAgentConstraints: (roleId: RoleId, constraint: AgentConstraint) => void
  resetRoleLimits: () => void
  resetAgentConstraints: () => void
  resetAll: () => void
}

const VALID_AGENT_IDS: ReadonlySet<string> = new Set(AGENTS.map((a) => a.id))

// ===== localStorage バリデーションヘルパー =====

const VALID_CONSTRAINTS: ReadonlySet<string> = new Set<AgentConstraint>([
  'required',
  'banned',
  'allowed',
])

/**
 * agentConstraints のキー（agentId）と値（constraint）を検証し、
 * 不正なエントリを除去して返す。
 */
function normalizeAgentConstraints(
  raw: unknown,
): Record<string, AgentConstraint> {
  if (typeof raw !== 'object' || raw === null) return {}
  const obj = raw as Record<string, unknown>
  const result: Record<string, AgentConstraint> = {}
  for (const [key, value] of Object.entries(obj)) {
    // prototype chain guard: __proto__ / constructor 等のプロトタイプキーを除外
    if (!Object.hasOwn(obj, key)) continue
    if (
      VALID_AGENT_IDS.has(key) &&
      typeof value === 'string' &&
      VALID_CONSTRAINTS.has(value)
    ) {
      result[key] = value as AgentConstraint
    }
  }
  return result
}

/**
 * roleLimits の各フィールドを検証し、Infinity/NaN/負数などの
 * 不正値を MAX_PLAYERS にクランプして返す。
 */
function normalizeRoleLimits(raw: unknown): PartySettings['roleLimits'] {
  if (typeof raw !== 'object' || raw === null) {
    return { ...DEFAULT_ROLE_LIMITS }
  }
  const rawRecord = raw as Record<string, unknown>
  return Object.fromEntries(
    ROLE_IDS.map((r) => {
      const entry = rawRecord[r]
      if (typeof entry !== 'object' || entry === null) {
        return [r, { min: 0, max: MAX_PLAYERS }]
      }
      const { min: rawMin, max: rawMax } = entry as Record<string, unknown>
      const min =
        typeof rawMin === 'number' && Number.isFinite(rawMin)
          ? Math.max(0, Math.min(Math.floor(rawMin), MAX_PLAYERS))
          : 0
      const max =
        typeof rawMax === 'number' && Number.isFinite(rawMax)
          ? Math.max(min, Math.min(Math.floor(rawMax), MAX_PLAYERS))
          : MAX_PLAYERS
      return [r, { min, max }]
    }),
  ) as PartySettings['roleLimits']
}

// Set型のシリアライズ/デシリアライズ用カスタムストレージ
type SetWrapper = { __type: 'Set'; values: unknown[] }

function isSetWrapper(value: unknown): value is SetWrapper {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return obj['__type'] === 'Set' && Array.isArray(obj['values'])
}

const jsonStorage = createJSONStorage<PlayerStore>(() => localStorage, {
  replacer: (_key, value) => {
    if (value instanceof Set) {
      return { __type: 'Set', values: Array.from(value) } satisfies SetWrapper
    }
    return value
  },
  // key を使ってフィールド別にバリデーションを行い、不正値を除去する
  reviver: (key, value) => {
    if (isSetWrapper(value)) {
      if (key === 'allowedRoles') {
        return new Set(
          value.values.filter((v): v is RoleId => ALL_ROLES.has(v as RoleId)),
        )
      }
      if (key === 'excludedAgentIds') {
        return new Set(
          value.values.filter(
            (v): v is string => typeof v === 'string' && VALID_AGENT_IDS.has(v),
          ),
        )
      }
      return new Set(
        value.values.filter((v): v is string => typeof v === 'string'),
      )
    }
    return value
  },
})

// version=0 → version=1 マイグレーション（Set が配列として保存されていた形式）
type V0PlayerSettings = {
  name: unknown
  allowedRoles: unknown[]
  excludedAgentIds: unknown[]
}
type V0Player = { id: string; settings: V0PlayerSettings }
// MED-1: agentConstraints は v0 データに存在しない可能性があるためオプション
type V0State = {
  players: V0Player[]
  partySettings: Omit<PartySettings, 'agentConstraints'> & {
    agentConstraints?: Record<string, AgentConstraint>
  }
}

// HIGH-1: 返り値型をデータ部分のみに絞り、メソッド欠落のキャストを境界に限定
type PlayerState = Pick<PlayerStore, 'players' | 'partySettings'>

function migrateV0(raw: V0State): PlayerState {
  // players が配列でない場合（localStorage 改ざんなど）は空配列にフォールバック
  const rawPlayers = Array.isArray(raw.players) ? raw.players : []
  const migratedPlayers = rawPlayers.map((p) => {
    // p.settings が null/undefined の場合（localStorage 改ざん耐性）はデフォルト値を使用
    const settings =
      typeof p.settings === 'object' && p.settings !== null
        ? p.settings
        : { name: '', allowedRoles: [], excludedAgentIds: [] }
    return {
      id:
        typeof p.id === 'string' && UUID_RE.test(p.id)
          ? p.id
          : crypto.randomUUID(),
      settings: {
        name: sanitizeName(settings.name),
        allowedRoles: new Set(
          Array.isArray(settings.allowedRoles)
            ? settings.allowedRoles.filter((r): r is RoleId =>
                ALL_ROLES.has(r as RoleId),
              )
            : [],
        ),
        excludedAgentIds: new Set(
          Array.isArray(settings.excludedAgentIds)
            ? settings.excludedAgentIds.filter(
                (id): id is string =>
                  typeof id === 'string' && VALID_AGENT_IDS.has(id),
              )
            : [],
        ),
      },
    }
  })
  return {
    // 0 件の場合は Zustand のマージに依存せず明示的にデフォルト生成
    players:
      migratedPlayers.length > 0 ? migratedPlayers : [createDefaultPlayer()],
    partySettings: {
      allowDuplicates:
        typeof raw.partySettings.allowDuplicates === 'boolean'
          ? raw.partySettings.allowDuplicates
          : false,
      roleLimits: normalizeRoleLimits(raw.partySettings.roleLimits),
      agentConstraints: normalizeAgentConstraints(
        raw.partySettings.agentConstraints,
      ),
    },
  }
}

/**
 * v1 以降の localStorage データを正規化する。
 * reviver によって Set 型は復元済みだが、agentConstraints・roleLimits・
 * name 長・players 配列数は未検証のため、ここで全て正規化する。
 */
function normalizeV1State(raw: PlayerState): PlayerState {
  const seen = new Set<string>()
  const players = raw.players
    .slice(0, MAX_PLAYERS)
    .map((p) => {
      // p.settings が null/undefined の場合（localStorage 改ざん耐性）はデフォルト値を使用
      const settings =
        typeof p.settings === 'object' && p.settings !== null
          ? p.settings
          : ({} as Player['settings'])
      return {
        ...p,
        // id が不正値（非文字列・空文字・非 UUID 形式）の場合は新規 UUID を割り当て
        id:
          typeof p.id === 'string' && UUID_RE.test(p.id)
            ? p.id
            : crypto.randomUUID(),
        settings: {
          ...settings,
          name: sanitizeName(settings.name),
          // allowedRoles・excludedAgentIds は reviver 経由で検証済み
        },
      }
    })
    // 重複 ID を除去（localStorage 改ざん耐性）
    .filter((p) => {
      if (seen.has(p.id)) return false
      seen.add(p.id)
      return true
    })
  return {
    players: players.length > 0 ? players : [createDefaultPlayer()],
    partySettings: {
      allowDuplicates:
        typeof raw.partySettings.allowDuplicates === 'boolean'
          ? raw.partySettings.allowDuplicates
          : false,
      roleLimits: normalizeRoleLimits(raw.partySettings.roleLimits),
      agentConstraints: normalizeAgentConstraints(
        raw.partySettings.agentConstraints,
      ),
    },
  }
}

export const usePlayerStore = create<PlayerStore>()(
  persist(
    (set) => ({
      players: [createDefaultPlayer()],
      partySettings: {
        allowDuplicates: false,
        roleLimits: { ...DEFAULT_ROLE_LIMITS },
        agentConstraints: {},
      },

      addPlayer: () =>
        set((state) => {
          if (state.players.length >= MAX_PLAYERS) return state
          return { players: [...state.players, createDefaultPlayer()] }
        }),

      removePlayer: (playerId) =>
        set((state) => {
          if (state.players.length <= 1) return state
          return { players: state.players.filter((p) => p.id !== playerId) }
        }),

      updatePlayerName: (playerId, name) =>
        set((state) => ({
          players: state.players.map((p) => {
            if (p.id !== playerId) return p
            const truncated = sanitizeName(name)
            if (p.settings.name === truncated) return p
            return {
              ...p,
              // スプレッドは浅いコピーなので allowedRoles/excludedAgentIds の
              // Set 参照は維持され、PlayerRow の useMemo は再計算されない
              settings: { ...p.settings, name: truncated },
            }
          }),
        })),

      toggleRole: (playerId, roleId) =>
        set((state) => ({
          players: state.players.map((p) => {
            if (p.id !== playerId) return p
            const newRoles = new Set(p.settings.allowedRoles)
            if (newRoles.has(roleId)) {
              newRoles.delete(roleId)
              // ロールをOFFにする際、そのロールの全エージェントを除外する
              const newExcluded = new Set(p.settings.excludedAgentIds)
              for (const agent of AGENTS_BY_ROLE[roleId]) {
                newExcluded.add(agent.id)
              }
              return {
                ...p,
                settings: {
                  ...p.settings,
                  allowedRoles: newRoles,
                  excludedAgentIds: newExcluded,
                },
              }
            } else {
              newRoles.add(roleId)
              // ロールをONに戻す際、そのロールの全エージェントの除外を解除する（OFF時の逆操作）。
              // setAllRoles(false) → toggleRole(ON) で候補が0件になる問題を防ぐ。
              // トレードオフ: OFF前に手動除外していたエージェントもON時に復元される。
              // 現在のデータモデルでは「手動除外」と「ロールOFF由来の除外」を区別できないため、
              // 対称設計（OFF=全除外, ON=全復元）を採用。→ ST-PLAYER-008d で挙動を固定。
              const newExcluded = new Set(p.settings.excludedAgentIds)
              for (const agent of AGENTS_BY_ROLE[roleId]) {
                newExcluded.delete(agent.id)
              }
              return {
                ...p,
                settings: {
                  ...p.settings,
                  allowedRoles: newRoles,
                  excludedAgentIds: newExcluded,
                },
              }
            }
          }),
        })),

      setAllRoles: (playerId, enabled) =>
        set((state) => {
          const idx = state.players.findIndex((p) => p.id === playerId)
          if (idx === -1) return state
          const p = state.players[idx]
          const updated = enabled
            ? // 全ロールON: エージェント除外も全解除して toggleRole との整合を保つ
              {
                ...p,
                settings: {
                  ...p.settings,
                  allowedRoles: new Set(ALL_ROLES),
                  excludedAgentIds: new Set<string>(),
                },
              }
            : // 全ロールOFF: toggleRole と同様に全エージェントを除外する
              {
                ...p,
                settings: {
                  ...p.settings,
                  allowedRoles: new Set<RoleId>(),
                  excludedAgentIds: new Set(VALID_AGENT_IDS),
                },
              }
          const players = state.players.slice()
          players[idx] = updated
          return { players }
        }),

      toggleAgent: (playerId, agentId) =>
        set((state) => ({
          players: state.players.map((p) => {
            if (p.id !== playerId) return p
            const newExcluded = new Set(p.settings.excludedAgentIds)
            if (newExcluded.has(agentId)) {
              // エージェントをONにする
              newExcluded.delete(agentId)
              // ロールがOFFの場合、親ロールを自動でONにする
              const agent = AGENTS_BY_ID.get(agentId)
              if (!agent) return p
              if (!p.settings.allowedRoles.has(agent.roleId)) {
                const newRoles = new Set(p.settings.allowedRoles)
                newRoles.add(agent.roleId)
                return {
                  ...p,
                  settings: {
                    ...p.settings,
                    allowedRoles: newRoles,
                    excludedAgentIds: newExcluded,
                  },
                }
              }
            } else {
              newExcluded.add(agentId)
            }
            return {
              ...p,
              settings: { ...p.settings, excludedAgentIds: newExcluded },
            }
          }),
        })),

      setAllAgents: (playerId, enabled) =>
        set((state) => {
          const idx = state.players.findIndex((p) => p.id === playerId)
          if (idx === -1) return state
          const p = state.players[idx]
          const updated = enabled
            ? {
                ...p,
                settings: {
                  ...p.settings,
                  excludedAgentIds: new Set<string>(),
                  allowedRoles: new Set(ALL_ROLES),
                },
              }
            : // setAllRoles(false) と動作を揃え、allowedRoles も空にする
              {
                ...p,
                settings: {
                  ...p.settings,
                  allowedRoles: new Set<RoleId>(),
                  excludedAgentIds: new Set(VALID_AGENT_IDS),
                },
              }
          const players = state.players.slice()
          players[idx] = updated
          return { players }
        }),

      setAllowDuplicates: (value) =>
        set((state) => ({
          partySettings: { ...state.partySettings, allowDuplicates: value },
        })),

      setRoleLimit: (roleId, min, max) =>
        set((state) => {
          // Infinity/NaN を弾き、小数を整数化して MAX_PLAYERS でクランプ
          const clampedMin = Number.isFinite(min)
            ? Math.max(0, Math.floor(min))
            : 0
          const clampedMax = Number.isFinite(max)
            ? Math.max(clampedMin, Math.min(Math.floor(max), MAX_PLAYERS))
            : MAX_PLAYERS
          return {
            partySettings: {
              ...state.partySettings,
              roleLimits: {
                ...state.partySettings.roleLimits,
                [roleId]: { min: clampedMin, max: clampedMax },
              },
            },
          }
        }),

      cycleAgentConstraint: (agentId) =>
        set((state) => {
          const current: AgentConstraint =
            state.partySettings.agentConstraints[agentId] ?? 'allowed'
          const next: AgentConstraint =
            current === 'allowed'
              ? 'required'
              : current === 'required'
                ? 'banned'
                : 'allowed'
          const newConstraints = { ...state.partySettings.agentConstraints }
          if (next === 'allowed') {
            delete newConstraints[agentId]
          } else {
            newConstraints[agentId] = next
          }
          return {
            partySettings: {
              ...state.partySettings,
              agentConstraints: newConstraints,
            },
          }
        }),

      setAgentConstraint: (agentId, constraint) =>
        set((state) => {
          const newConstraints = { ...state.partySettings.agentConstraints }
          if (constraint === 'allowed') {
            delete newConstraints[agentId]
          } else {
            newConstraints[agentId] = constraint
          }
          return {
            partySettings: {
              ...state.partySettings,
              agentConstraints: newConstraints,
            },
          }
        }),

      setRoleAgentConstraints: (roleId, constraint) =>
        set((state) => {
          const newConstraints = { ...state.partySettings.agentConstraints }
          for (const agent of AGENTS_BY_ROLE[roleId]) {
            if (constraint === 'allowed') {
              delete newConstraints[agent.id]
            } else {
              newConstraints[agent.id] = constraint
            }
          }
          return {
            partySettings: {
              ...state.partySettings,
              agentConstraints: newConstraints,
            },
          }
        }),

      resetRoleLimits: () =>
        set((state) => {
          const playerCount = state.players.length
          return {
            partySettings: {
              ...state.partySettings,
              roleLimits: {
                duelist: { min: 0, max: playerCount },
                initiator: { min: 0, max: playerCount },
                controller: { min: 0, max: playerCount },
                sentinel: { min: 0, max: playerCount },
              },
            },
          }
        }),

      resetAgentConstraints: () =>
        set((state) => ({
          partySettings: {
            ...state.partySettings,
            agentConstraints: {},
          },
        })),

      resetAll: () =>
        set({
          players: [createDefaultPlayer()],
          partySettings: {
            allowDuplicates: false,
            roleLimits: { ...DEFAULT_ROLE_LIMITS },
            agentConstraints: {},
          },
        }),
    }),
    {
      name: 'agent-picker-players',
      version: 1,
      storage: jsonStorage,
      migrate: (persistedState, version) => {
        // Zustand v5 の persist.migrate は PlayerStore（メソッド含む）を返り値型として
        // 要求するが、実際にはデータ部分を初期ストア値とマージするため、メソッドは不要。
        // migrateV0/normalizeV1State は PlayerState（データのみ）を返すため、
        // Zustand の内部マージに依存した単一キャストで PlayerStore に変換する。
        // 注意: Zustand のメジャーアップデート時にマージ挙動の変更がないか確認すること。
        if (version === 0) {
          return migrateV0(persistedState as V0State) as PlayerStore
        }
        // v1+ も normalizeV1State で正規化（localStorage 改ざん耐性）
        return normalizeV1State(persistedState as PlayerState) as PlayerStore
      },
    },
  ),
)

// プレイヤー数変化時に結果をクリアする（モジュールスコープで1回だけ登録）。
// App.tsx のコンポーネントライフサイクルに依存せず、StrictMode の二重登録も回避する。
// NOTE: 全ストア変更で発火するが、コスト（整数比較1回）は無視できるため
// subscribeWithSelector への移行は不要。
usePlayerStore.subscribe((state, prev) => {
  if (state.players.length !== prev.players.length) {
    useResultStore.getState().clearResults()
  }
})
