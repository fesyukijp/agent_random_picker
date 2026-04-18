import { useState, useCallback, useEffect } from 'react'
import type { ReactNode } from 'react'
import type { Language, TranslateFunction } from './types'
import type { TranslationKey } from './locales/ja'
import { ja } from './locales/ja'
import { en } from './locales/en'
import { translate } from './translate'
import { LanguageContext } from './languageContext'
import { LANGUAGE_STORAGE_KEY } from './constants'

function isLanguage(v: string | null): v is Language {
  return v === 'ja' || v === 'en'
}

const locales: Readonly<
  Record<Language, Readonly<Record<TranslationKey, string>>>
> = { ja, en }

function detectLanguage(): Language {
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (isLanguage(stored)) return stored
  } catch {
    // localStorage が使えない環境（プライベートブラウジング等）ではフォールバック
  }
  const browserLang =
    typeof navigator !== 'undefined'
      ? (navigator.language?.toLowerCase() ?? '')
      : ''
  return browserLang.startsWith('ja') ? 'ja' : 'en'
}

interface ProviderProps {
  children: ReactNode
  /** テスト・SSR 用: 初期言語を外部から指定 */
  initialLanguage?: Language
}

export function LanguageProvider({ children, initialLanguage }: ProviderProps) {
  const [language, setLanguageState] = useState<Language>(
    () => initialLanguage ?? detectLanguage(),
  )

  const setLanguage = useCallback((lang: Language) => {
    setLanguageState(lang)
    try {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lang)
    } catch {
      // localStorage が使えない環境では無視
    }
  }, [])

  // html lang 属性を同期
  useEffect(() => {
    document.documentElement.lang = language
  }, [language])

  const t: TranslateFunction = useCallback(
    (key: TranslationKey, params?: Record<string, string | number>) =>
      translate(locales[language], key, params),
    [language],
  )

  return (
    <LanguageContext value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext>
  )
}
