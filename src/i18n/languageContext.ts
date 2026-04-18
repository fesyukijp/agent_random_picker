import { createContext } from 'react'
import type { Language, TranslateFunction } from './types'

export interface LanguageContextValue {
  language: Language
  setLanguage: (lang: Language) => void
  t: TranslateFunction
}

export const LanguageContext = createContext<LanguageContextValue | null>(null)
