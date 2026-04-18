import { ROLE_IDS } from './types'
import type {
  Agent,
  AgentConstraint,
  PartySettings,
  PickResult,
  Player,
  RoleId,
} from './types'
import type { TranslatableMessage } from '../i18n/types'

// ===== セキュアな乱数生成 =====

/**
 * crypto.getRandomValues() による暗号論的乱数を [0, 1) の範囲で返す。
 * Math.random()（xorshift128+）はシード逆算が理論上可能なため使用しない。
 */
function secureRandom(): number {
  const arr = new Uint32Array(1)
  crypto.getRandomValues(arr)
  return arr[0] / 0x100000000
}

// ===== getCandidates =====

interface GetCandidatesParams {
  agents: readonly Agent[]
  allowedRoles: Set<RoleId>
  excludedAgentIds: Set<string>
  agentConstraints: Record<string, AgentConstraint>
}

/**
 * プレイヤーの候補エージェント集合を算出する。
 *
 * フィルタリング順序:
 *   1. bannedエージェントを除外（agentConstraints）
 *   2. ロールフィルタ（allowedRoles）
 *   3. 個別除外（excludedAgentIds）
 */
export function getCandidates({
  agents,
  allowedRoles,
  excludedAgentIds,
  agentConstraints,
}: GetCandidatesParams): Agent[] {
  return agents.filter((agent) => {
    if (agentConstraints[agent.id] === 'banned') return false
    if (!allowedRoles.has(agent.roleId)) return false
    if (excludedAgentIds.has(agent.id)) return false
    return true
  })
}

// ===== randomPick =====

interface RandomPickParams {
  players: readonly Player[]
  partySettings: PartySettings
  allAgents: readonly Agent[]
  /** validateConstraints で算出済みの候補集合。指定時は getCandidates の再計算を省略する */
  precomputedCandidates?: Agent[][]
}

const ROLE_INDEX: Record<RoleId, number> = {
  duelist: 0,
  initiator: 1,
  controller: 2,
  sentinel: 3,
}

/**
 * 計数DP + 逐次選択による一様サンプリングでエージェントを割り当てる。
 *
 * フロー:
 *   1. 各プレイヤーの候補集合を事前算出
 *   2. 計数DP（メモ化）: 各状態からの実行可能割当て総数を算出
 *   3. 逐次選択: 計数結果に基づく重み付き選択で一様サンプリング
 *   4. 割当て不能なら Error を返す
 *
 * 注意: validateConstraints との循環依存を避けるため、実現可能性の
 * 検証は DP の count=0 によって暗黙的に行う。
 */
export function randomPick({
  players,
  partySettings,
  allAgents,
  precomputedCandidates,
}: RandomPickParams): PickResult[] | TranslatableMessage {
  const n = players.length
  // makeKey のビットパッキングは 4 ビット幅（最大値 15）を前提とする
  if (n > 15) {
    return { key: 'pick.tooManyPlayers', params: { n } }
  }
  const { allowDuplicates, roleLimits, agentConstraints } = partySettings

  // 各プレイヤーの候補集合（validateConstraints で算出済みなら再利用）
  const candidateSets: Agent[][] =
    precomputedCandidates ??
    players.map((player) =>
      getCandidates({
        agents: allAgents,
        allowedRoles: player.settings.allowedRoles,
        excludedAgentIds: player.settings.excludedAgentIds,
        agentConstraints,
      }),
    )

  // 必須エージェントIDの集合
  const requiredAgentIds = new Set<string>(
    Object.entries(agentConstraints)
      .filter(([, c]) => c === 'required')
      .map(([id]) => id),
  )

  // 計数DPのメモ化キャッシュ
  // COUNT_CAP: 精度の劣化が始まる前にキャップする上限（2^49 ≈ 5.6×10^14 < 1e15 < 2^53 の範囲で余裕を持たせた値）
  const COUNT_CAP = 1e15
  // MAX_MEMO_SIZE: メモキャッシュの上限（5 プレイヤー × 29 エージェントの実用的な状態空間を十分カバー）
  const MAX_MEMO_SIZE = 200_000
  const memo = new Map<string, number>()

  // ADR-013: エージェントID → ビット位置のマッピング。
  // BigInt を使用しているため、エージェント数の上限は存在しない。
  // 以前は number ビットマスク（符号付き32bit、最大31体）を使用していたが、
  // Valorant のエージェント追加ペース（年2-3体）で上限到達が近づいたため BigInt に移行した。
  const agentBitIndex = new Map<string, number>()
  {
    let bit = 0
    for (const set of candidateSets) {
      for (const agent of set) {
        if (!agentBitIndex.has(agent.id)) agentBitIndex.set(agent.id, bit++)
      }
    }
    for (const id of requiredAgentIds) {
      if (!agentBitIndex.has(id)) agentBitIndex.set(id, bit++)
    }
  }

  // agentBit / makeKey / countCompletions はクロージャ変数（agentBitIndex, candidateSets,
  // roleLimits, allowDuplicates, memo, n 等）に依存している。モジュールスコープに切り出すと
  // シグネチャが膨大になり可読性が低下するため、関数内に留める。
  // V8 は内部関数を最適化するため、現在のデータ規模では GC プレッシャーは問題にならない。

  /** エージェントIDをビットマスクの1ビットに変換する（O(1)）。 */
  function agentBit(id: string): bigint {
    const bit = agentBitIndex.get(id)
    // ADR-012: agentBitIndex に未登録 = ロジックバグ（プログラマーエラー）
    if (bit === undefined) throw new Error(`agentBit: unknown id "${id}"`)
    return 1n << BigInt(bit)
  }

  // 必須エージェント全体のビットマスク
  let requiredMaskFull = 0n
  for (const id of requiredAgentIds) requiredMaskFull |= agentBit(id)

  /**
   * 状態キーを生成する。
   * roleAssigned は 0–MAX_PLAYERS の範囲で 4 ビットずつパックし（最大値 15）、
   * Array.join() のオーバーヘッドを回避する。
   * 制約: MAX_PLAYERS <= 15（4 ビット幅）。超過するとキー衝突が発生する。
   * requiredRemainingMask と usedMask はビット整数なのでソート不要で O(1) 生成。
   */
  function makeKey(
    playerIdx: number,
    roleAssigned: readonly number[],
    requiredRemainingMask: bigint,
    usedMask: bigint,
  ): string {
    const roleKey =
      roleAssigned[0] |
      (roleAssigned[1] << 4) |
      (roleAssigned[2] << 8) |
      (roleAssigned[3] << 12)
    return `${playerIdx}|${roleKey}|${requiredRemainingMask}|${usedMask}`
  }

  /**
   * playerIdx 以降のプレイヤーへの有効な割当て総数を返す。
   *
   * requiredRemainingMask / usedMask は数値なので値渡し（変更不要）。
   * roleAssigned のみインプレース変更しバックトラックする（try/finally で保護）。
   */
  let memoCacheWarnEmitted = false

  function countCompletions(
    playerIdx: number,
    roleAssigned: number[],
    requiredRemainingMask: bigint,
    usedMask: bigint,
  ): number {
    if (playerIdx === n) {
      const allMinsOk = ROLE_IDS.every(
        (r, i) => roleAssigned[i] >= roleLimits[r].min,
      )
      return allMinsOk && requiredRemainingMask === 0n ? 1 : 0
    }

    const key = makeKey(
      playerIdx,
      roleAssigned,
      requiredRemainingMask,
      usedMask,
    )
    const cached = memo.get(key)
    if (cached !== undefined) return cached

    let total = 0
    for (const agent of candidateSets[playerIdx]) {
      const bit = agentBit(agent.id)
      if (!allowDuplicates && (usedMask & bit) !== 0n) continue
      const ri = ROLE_INDEX[agent.roleId]
      if (roleAssigned[ri] >= roleLimits[agent.roleId].max) continue

      roleAssigned[ri]++
      try {
        total = Math.min(
          total +
            countCompletions(
              playerIdx + 1,
              roleAssigned,
              requiredRemainingMask & ~bit,
              allowDuplicates ? usedMask : usedMask | bit,
            ),
          COUNT_CAP,
        )
      } finally {
        roleAssigned[ri]--
      }
    }

    if (memo.size < MAX_MEMO_SIZE) {
      memo.set(key, total)
    } else if (!memoCacheWarnEmitted) {
      memoCacheWarnEmitted = true
      if (import.meta.env.DEV) {
        console.warn(
          `randomPick: DPメモキャッシュが上限（${MAX_MEMO_SIZE}）に達しました。以降のキャッシュは無効化されます。`,
        )
      }
    }
    return total
  }

  // 逐次選択
  const results: PickResult[] = []
  const roleAssigned = [0, 0, 0, 0]
  let requiredRemainingMask = requiredMaskFull
  let usedMask = 0n

  for (let i = 0; i < n; i++) {
    const validCandidates: Agent[] = []
    const counts: number[] = []
    let totalCount = 0

    for (const agent of candidateSets[i]) {
      const bit = agentBit(agent.id)
      if (!allowDuplicates && (usedMask & bit) !== 0n) continue
      const ri = ROLE_INDEX[agent.roleId]
      if (roleAssigned[ri] >= roleLimits[agent.roleId].max) continue

      // countCompletions と同様にインプレース変更 + try/finally でコピーを省く
      roleAssigned[ri]++
      let count: number
      try {
        count = countCompletions(
          i + 1,
          roleAssigned,
          requiredRemainingMask & ~bit,
          allowDuplicates ? usedMask : usedMask | bit,
        )
      } finally {
        roleAssigned[ri]--
      }

      if (count > 0) {
        validCandidates.push(agent)
        counts.push(count)
        totalCount = Math.min(totalCount + count, COUNT_CAP)
      }
    }

    if (totalCount === 0) {
      return { key: 'pick.noValidCombination' }
    }

    // 計数比例サンプリング
    // 注: COUNT_CAP 適用により totalCount < Σcounts[j] となるケースでは、
    // ループ完了後も r > 0 が残り最後の候補がフォールバック選択される。
    // この偏りは COUNT_CAP（1e15）付近の超大規模状態空間でのみ発現し、
    // 現実のゲームデータ（29エージェント × 5プレイヤー）では到達しない。
    let r = secureRandom() * totalCount
    let selectedAgent = validCandidates[validCandidates.length - 1]
    for (let j = 0; j < validCandidates.length; j++) {
      r -= counts[j]
      if (r <= 0) {
        selectedAgent = validCandidates[j]
        break
      }
    }

    results.push({ playerId: players[i].id, agent: selectedAgent })

    const selectedBit = agentBit(selectedAgent.id)
    roleAssigned[ROLE_INDEX[selectedAgent.roleId]]++
    requiredRemainingMask &= ~selectedBit
    if (!allowDuplicates) usedMask |= selectedBit
  }

  return results
}

// ===== rerollPlayer =====

interface RerollPlayerParams {
  targetPlayerId: string
  currentResults: readonly PickResult[]
  players: readonly Player[]
  partySettings: PartySettings
  allAgents: readonly Agent[]
  /** 対象プレイヤーの事前計算済み候補。指定時は getCandidates の再計算を省略する */
  precomputedTargetCandidates?: Agent[]
}

/**
 * 対象プレイヤーのエージェントを再抽選する。
 *
 * 他プレイヤーの結果は固定し、対象プレイヤーのみ再割り当てを行う。
 * 前提: currentResults には全プレイヤー分の結果が含まれていること
 *       （初回抽選完了後にのみ呼び出す）。
 *
 * フロー:
 *   1. 他プレイヤーの確定結果から使用済みエージェント・ロール配分を算出
 *   2. 未充足の必須エージェントを特定
 *   3. 対象プレイヤーの候補集合を取得
 *   4. 重複不可・ロール上限/下限・必須充足の各制約で絞り込み
 *   5. 有効候補から一様ランダム選択
 *
 * 必須充足に関する注意:
 *   対象プレイヤーが割り当てられるエージェントは1体のみのため、
 *   他プレイヤーで未充足の必須エージェントが複数存在する場合は
 *   常に Error を返す。
 */
export function rerollPlayer({
  targetPlayerId,
  currentResults,
  players,
  partySettings,
  allAgents,
  precomputedTargetCandidates,
}: RerollPlayerParams): PickResult | TranslatableMessage {
  const { allowDuplicates, roleLimits, agentConstraints } = partySettings

  const targetPlayer = players.find((p) => p.id === targetPlayerId)
  if (!targetPlayer) {
    return { key: 'reroll.playerNotFound' }
  }

  // 前提条件: currentResults に全プレイヤーの結果が含まれていること（長さ + ID 網羅性）
  if (currentResults.length < players.length) {
    return { key: 'reroll.noResults' }
  }
  const resultPlayerIds = new Set(currentResults.map((r) => r.playerId))
  if (!players.every((p) => resultPlayerIds.has(p.id))) {
    return { key: 'reroll.incompleteResults' }
  }

  // 他プレイヤーの確定結果
  const fixedResults = currentResults.filter(
    (r) => r.playerId !== targetPlayerId,
  )
  const fixedAgentIds = new Set(fixedResults.map((r) => r.agent.id))

  // ADR-011: Object.fromEntries の型制限による as（ROLE_IDS が RoleId[] であることが静的に保証済み）
  const fixedRoleAssigned = Object.fromEntries(
    ROLE_IDS.map((r) => [r, 0]),
  ) as Record<RoleId, number>
  for (const r of fixedResults) {
    fixedRoleAssigned[r.agent.roleId]++
  }

  // 必須エージェントの集合
  const requiredAgentIds = new Set<string>(
    Object.entries(agentConstraints)
      .filter(([, c]) => c === 'required')
      .map(([id]) => id),
  )

  // まだ未充足の必須エージェント（対象プレイヤーが充足しなければならない）
  const requiredUnsatisfied = new Set(
    [...requiredAgentIds].filter((id) => !fixedAgentIds.has(id)),
  )

  // 対象プレイヤーの候補エージェントを取得（事前計算済みなら再利用）
  const candidates =
    precomputedTargetCandidates ??
    getCandidates({
      agents: allAgents,
      allowedRoles: targetPlayer.settings.allowedRoles,
      excludedAgentIds: targetPlayer.settings.excludedAgentIds,
      agentConstraints,
    })

  // 有効な候補を絞り込む
  // 注: rerollPlayer は対象プレイヤー1人のみを割り当てるため、「将来プレイヤーへの
  //     実現可能性」を DP で評価する必要はない。以下のチェックが単一割り当てに
  //     対して完全な条件を網羅している。
  // allMinsOk 保証: チェック (a)+(b) が全ロールの min 充足を保証する。
  //   (a) 選択ロール: fixedRoleAssigned[roleId] + 1 >= min
  //   (b) 他ロール: fixedRoleAssigned[r] >= min（全 r ≠ roleId）
  //   → 全ロール min ≥ assigned が成立する。
  const validCandidates: Agent[] = []
  for (const candidate of candidates) {
    // 重複不可: 他プレイヤーが使用中のエージェントは除外
    if (!allowDuplicates && fixedAgentIds.has(candidate.id)) continue

    // ロール上限チェック
    if (fixedRoleAssigned[candidate.roleId] >= roleLimits[candidate.roleId].max)
      continue

    // ロール下限チェック:
    //   (a) 対象プレイヤーがこのロールを取った後、そのロールの下限を充足できるか
    const roleAfter = fixedRoleAssigned[candidate.roleId] + 1
    if (roleAfter < roleLimits[candidate.roleId].min) continue
    //   (b) 対象プレイヤーが取らない他のロールは固定済み配分のみで下限を充足できるか
    //       （対象プレイヤーは1体しか割り当てられないため、他ロールの不足を補えない）
    //   注: (a)+(b) は各ロールの min 条件のみを保証する。
    //   合計の充足（Σmin ≤ n）は validateConstraints が保証する前提。
    if (
      ROLE_IDS.some(
        (r) =>
          r !== candidate.roleId && fixedRoleAssigned[r] < roleLimits[r].min,
      )
    )
      continue

    // 必須エージェント充足チェック: 選択後に未充足の必須エージェントが残らないこと
    // O(1) 判定: コピーなしで充足可能性を確認
    if (
      requiredUnsatisfied.size > 1 ||
      (requiredUnsatisfied.size === 1 && !requiredUnsatisfied.has(candidate.id))
    )
      continue

    validCandidates.push(candidate)
  }

  if (validCandidates.length === 0) {
    return { key: 'pick.noValidCombination' }
  }

  // 一様ランダム選択
  const selected =
    validCandidates[Math.floor(secureRandom() * validCandidates.length)]
  return { playerId: targetPlayerId, agent: selected }
}
