import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource/barlow-condensed/400.css'
import '@fontsource/barlow-condensed/600.css'
import '@fontsource/barlow-condensed/700.css'
import './index.css'
import { App } from './App.tsx'
import { ErrorBoundary } from './components/common/ErrorBoundary'
import { LanguageProvider } from './i18n/context'
import { initAnalytics } from './analytics'
import { AGENTS } from './data/agents'
import { usePlayerStore } from './stores/playerStore'
import { useResultStore } from './stores/resultStore'

initAnalytics()

if (import.meta.env.DEV) {
  // 静的インポート済みの参照を直接 window に公開（動的 import() は不要）
  // __stores__ は E2E テストで直接ストア操作するために使用（DEV ビルドのみ）
  const w = window as unknown as Record<string, unknown>
  w.__agents__ = AGENTS
  w.__stores__ = { usePlayerStore, useResultStore }
}

const rootElement = document.getElementById('root')
if (!rootElement) throw new Error('Root element not found')

createRoot(rootElement).render(
  <StrictMode>
    <ErrorBoundary>
      <LanguageProvider>
        <App />
      </LanguageProvider>
    </ErrorBoundary>
  </StrictMode>,
)
