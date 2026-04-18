import { useContext } from 'react'
import { LanguageContext } from './languageContext'

/**
 * 現在のロケールに基づく翻訳関数を返す。
 * LanguageProvider の内側でのみ使用可能。
 *
 * @example
 * const { t, language, setLanguage } = useTranslation()
 * t('ui.pickButton')               // → 'ランダムピック！'
 * t('player.defaultName', { n: 1 }) // → 'プレイヤー1'
 */
export function useTranslation() {
  const ctx = useContext(LanguageContext)
  if (!ctx) {
    throw new Error('useTranslation must be used within LanguageProvider')
  }
  return ctx
}
