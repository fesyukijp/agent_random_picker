import { ROLE_IDS } from '../logic/types'
import type { Agent, Role, RoleId } from '../logic/types'

export const ROLES: readonly Role[] = [
  { id: 'duelist', name: 'デュエリスト' },
  { id: 'initiator', name: 'イニシエーター' },
  { id: 'controller', name: 'コントローラー' },
  { id: 'sentinel', name: 'センチネル' },
]

// ADR-011: Object.fromEntries は Record<string, V> に推論される TypeScript 制限のため
// as で narrowing が必要。型安全性は変数の型アノテーションが保証する。
export const ROLE_LABEL_MAP: Record<RoleId, string> = Object.fromEntries(
  ROLES.map((r): [RoleId, string] => [r.id, r.name]),
) as Record<RoleId, string>

const agent = (id: string, name: string, roleId: RoleId): Agent => ({
  id,
  name,
  roleId,
  imageUrl: `${import.meta.env.BASE_URL}agents/${id}.png`,
})

export const AGENTS: readonly Agent[] = [
  // Duelists (8)
  agent('jett', 'ジェット', 'duelist'),
  agent('phoenix', 'フェニックス', 'duelist'),
  agent('raze', 'レイズ', 'duelist'),
  agent('reyna', 'レイナ', 'duelist'),
  agent('yoru', 'ヨル', 'duelist'),
  agent('neon', 'ネオン', 'duelist'),
  agent('iso', 'アイソ', 'duelist'),
  agent('waylay', 'ウェイレイ', 'duelist'),

  // Initiators (7)
  agent('sova', 'ソーヴァ', 'initiator'),
  agent('breach', 'ブリーチ', 'initiator'),
  agent('skye', 'スカイ', 'initiator'),
  agent('kayo', 'KAY/O', 'initiator'),
  agent('fade', 'フェイド', 'initiator'),
  agent('gekko', 'ゲッコー', 'initiator'),
  agent('tejo', 'テホ', 'initiator'),

  // Controllers (7)
  agent('brimstone', 'ブリムストーン', 'controller'),
  agent('viper', 'ヴァイパー', 'controller'),
  agent('omen', 'オーメン', 'controller'),
  agent('astra', 'アストラ', 'controller'),
  agent('harbor', 'ハーバー', 'controller'),
  agent('clove', 'クローヴ', 'controller'),
  agent('miks', 'ミクス', 'controller'),

  // Sentinels (7)
  agent('sage', 'セージ', 'sentinel'),
  agent('cypher', 'サイファー', 'sentinel'),
  agent('killjoy', 'キルジョイ', 'sentinel'),
  agent('chamber', 'チェンバー', 'sentinel'),
  agent('deadlock', 'デッドロック', 'sentinel'),
  agent('vyse', 'ヴァイス', 'sentinel'),
  agent('veto', 'ヴィトー', 'sentinel'),
]

// ADR-011: ロール別エージェントマップ（レンダリングごとのfilterを避けるための事前計算）
// 型安全性は変数の型アノテーションが保証。as は Object.fromEntries の制限回避。
export const AGENTS_BY_ROLE: Record<RoleId, readonly Agent[]> =
  Object.fromEntries(
    ROLE_IDS.map((roleId): [RoleId, readonly Agent[]] => [
      roleId,
      AGENTS.filter((a) => a.roleId === roleId),
    ]),
  ) as Record<RoleId, readonly Agent[]>

// O(1) エージェントルックアップ用 Map（validator・randomPicker で共用）
// NOTE: allowedRoles / excludedAgentIds の Set フィールドは jsonStorage の
//       replacer/reviver に依存してシリアライズされる（playerStore.ts 参照）
export const AGENTS_BY_ID: ReadonlyMap<string, Agent> = new Map(
  AGENTS.map((a) => [a.id, a]),
)
