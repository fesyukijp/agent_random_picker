import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'
import { ja } from '../../i18n/locales/ja'
import { en } from '../../i18n/locales/en'
import { translate } from '../../i18n/translate'
import { LANGUAGE_STORAGE_KEY } from '../../i18n/constants'

// ErrorBoundary は LanguageProvider の外側に配置されるため useTranslation が使えない。
// localStorage から言語を直接読み取り、translate() を直接呼ぶ。
function getErrorTranslate() {
  let lang: 'ja' | 'en' = 'en'
  try {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    if (stored === 'ja' || stored === 'en') lang = stored
    else if (
      typeof navigator !== 'undefined' &&
      navigator.language?.toLowerCase().startsWith('ja')
    )
      lang = 'ja'
  } catch {
    // フォールバック
  }
  const locale = lang === 'ja' ? ja : en
  return (key: Parameters<typeof translate>[1]) => translate(locale, key)
}

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error('ErrorBoundary caught:', error, info.componentStack)
    }
  }

  render() {
    if (this.state.error) {
      const t = getErrorTranslate()
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg-primary p-4">
          <div className="max-w-md text-center">
            <h1 className="text-xl font-bold text-text-primary mb-2">
              {t('error.unexpected')}
            </h1>
            <p className="text-sm text-text-secondary mb-4">
              {import.meta.env.DEV
                ? this.state.error.message
                : t('error.unexpectedDescription')}
            </p>
            <button
              type="button"
              onClick={() => {
                window.location.reload()
              }}
              className="px-6 py-2 bg-accent hover:bg-accent-hover text-bg-primary font-bold rounded transition-colors"
            >
              {t('error.reload')}
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}
