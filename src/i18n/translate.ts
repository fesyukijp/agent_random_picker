import type { TranslationKey } from './locales/ja'

/**
 * テンプレート文字列のパラメータを置換する純粋関数。
 *
 * - 既知のキー → 対応する翻訳文字列を返す
 * - 未知のキー → キー文字列をそのまま返す（フォールバック）
 * - params 指定時 → {{name}} プレースホルダーを値で置換
 * - params 未指定の場合 → プレースホルダーはそのまま残る
 */
export function translate(
  translations: Readonly<Record<TranslationKey, string>>,
  key: TranslationKey,
  params?: Record<string, string | number>,
): string {
  const template = translations[key]
  if (template === undefined) {
    if (import.meta.env.DEV) {
      console.warn(`[i18n] Missing translation key: "${key}"`)
    }
    return key
  }
  if (!params) return template
  return template.replace(/\{\{(\w+)\}\}/g, (match, name: string) => {
    const value = params[name]
    return value !== undefined ? String(value) : match
  })
}
