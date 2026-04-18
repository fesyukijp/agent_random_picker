import type { Player } from './types'
import type { TranslateFunction } from '../i18n/types'

/**
 * プレイヤーの表示名を返す。
 * 名前が未設定の場合は翻訳済みデフォルト名（「プレイヤー1」等）を返す。
 *
 * t が渡されない場合は日本語フォールバック（ロジック層でのテスト互換）。
 */
export function getDisplayName(
  player: Player,
  index: number,
  t?: TranslateFunction,
): string {
  if (player.settings.name) return player.settings.name
  if (t) return t('player.defaultName', { n: index + 1 })
  return `プレイヤー${index + 1}`
}
