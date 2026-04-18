import type { PickResult, Player } from './types'
import { getDisplayName } from './playerUtils'
import type { TranslateFunction } from '../i18n/types'
import type { TranslationKey } from '../i18n/locales/ja'

// X では URL が t.co で ~23 文字に短縮される（スペース 1 文字含む）
export const X_CHAR_LIMIT = 280
export const X_URL_COST = 24

// X の重み付き文字カウント: CJK・全角・補助文字は 2 ウェイト、それ以外は 1 ウェイト
// https://developer.twitter.com/en/docs/counting-characters
function isWeightTwo(cp: number): boolean {
  return (
    (cp >= 0x1100 && cp <= 0x115f) ||
    (cp >= 0x2e80 && cp <= 0x303f) ||
    (cp >= 0x3040 && cp <= 0x33ff) ||
    (cp >= 0x3400 && cp <= 0x4dbf) ||
    (cp >= 0x4e00 && cp <= 0x9fff) ||
    (cp >= 0xa960 && cp <= 0xa97f) ||
    (cp >= 0xac00 && cp <= 0xd7ff) ||
    (cp >= 0xf900 && cp <= 0xfaff) ||
    (cp >= 0xfe10 && cp <= 0xfe1f) ||
    (cp >= 0xfe30 && cp <= 0xfe4f) ||
    (cp >= 0xff01 && cp <= 0xff60) ||
    (cp >= 0xffe0 && cp <= 0xffe6) ||
    cp > 0xffff
  )
}

export function getXWeightedLength(text: string): number {
  let weight = 0
  for (const char of text) {
    weight += isWeightTwo(char.codePointAt(0) ?? 0) ? 2 : 1
  }
  return weight
}

/**
 * テキストを重み付き文字数予算に収める。予算内ならそのまま返し、超過分は '…' で切り詰める。
 * 1パスでカウントと切り詰めを同時に行う。
 */
function fitToWeightedBudget(text: string, budget: number): string {
  // '…' (U+2026) は weight 1 なので 1 ウェイト分を確保
  const truncateLimit = budget - 1
  let weight = 0
  let charIndex = 0
  let needsTruncate = false
  for (const char of text) {
    const charWeight = isWeightTwo(char.codePointAt(0) ?? 0) ? 2 : 1
    if (weight + charWeight > truncateLimit) {
      needsTruncate = true
      break
    }
    weight += charWeight
    charIndex += char.length // サロゲートペアは length === 2
  }
  if (!needsTruncate) return text
  return text.slice(0, charIndex) + '…'
}

// VITE_APP_URL として許可するホスト名。CI/CD 環境変数汚染によるフィッシング URL 生成を防ぐ。
// localhost / 127.0.0.1 は開発環境のみ許可。本番ビルドでは除外しフィッシングリスクを排除する。
const ALLOWED_APP_URL_HOSTS = new Set(
  import.meta.env.PROD
    ? ['fesyukijp.github.io']
    : ['fesyukijp.github.io', 'localhost', '127.0.0.1'],
)

function getAppUrl(): string {
  // VITE_APP_URL が設定されていればそれを優先する（本番デプロイ環境での上書き用）
  // スキーマと allowlist ホスト名の両方を検証し、フィッシング URL の混入を防ぐ
  const envUrl = import.meta.env.VITE_APP_URL
  if (envUrl) {
    try {
      const parsed = new URL(envUrl)
      if (
        /^https?:$/.test(parsed.protocol) &&
        ALLOWED_APP_URL_HOSTS.has(parsed.hostname)
      ) {
        return envUrl
      }
    } catch {
      // 無効な URL は無視してフォールバック
    }
  }
  // ブラウザ専用アプリだがテスト環境（Node）では window が未定義のため安全にフォールバック
  // BASE_URL は末尾スラッシュを含む場合がある（例: '/agent-picker/'）。
  // origin と結合すると '//'' の二重スラッシュになるため除去する。
  return typeof window !== 'undefined'
    ? (window.location.origin + import.meta.env.BASE_URL).replace(/\/$/, '')
    : '/'
}

/**
 * エージェント名を翻訳し、未知キーの場合は agent.name にフォールバックする。
 * translate() は未知キーをキー文字列そのまま返すため、
 * プレフィックスチェックでフォールバック判定を行う。
 */
function translateAgentName(
  agentId: string,
  fallbackName: string,
  t: TranslateFunction,
): string {
  const key = `agentName.${agentId}` as TranslationKey
  const translated = t(key)
  // translate() は未知キーをキー文字列で返すため、プレフィックスが残っていればフォールバック
  return translated.startsWith('agentName.') ? fallbackName : translated
}

export function buildXShareUrl(
  players: readonly Player[],
  results: readonly PickResult[] | null,
  resultMap?: ReadonlyMap<string, PickResult>,
  t?: TranslateFunction,
): string | null {
  if (!results) return null

  const map = resultMap ?? new Map(results.map((r) => [r.playerId, r]))
  const unknownAgent = t ? t('share.unknownAgent') : '？'
  const lines = players.map((player, index) => {
    const name = getDisplayName(player, index, t)
    const result = map.get(player.id)
    const agentName = result
      ? t
        ? translateAgentName(result.agent.id, result.agent.name, t)
        : result.agent.name
      : unknownAgent
    return `・${name}: ${agentName}`
  })

  const textBudget = X_CHAR_LIMIT - X_URL_COST
  const header = t
    ? t('share.header')
    : '今日のVALORANTエージェントはこれで決まり！🎲'
  const hashtags = t ? t('share.hashtags') : '#VALORANT #ヴァロラント'
  const fullText = [header, ...lines, '', hashtags].join('\n')

  const shareText = fitToWeightedBudget(fullText, textBudget)

  return `https://x.com/intent/tweet?text=${encodeURIComponent(shareText)}&url=${encodeURIComponent(getAppUrl())}`
}
