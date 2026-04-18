type GtagCommand = 'js' | 'config' | 'event'

export const ANALYTICS_EVENTS = {
  PICK_EXECUTED: 'pick_executed',
  REROLL_EXECUTED: 'reroll_executed',
} as const

type AnalyticsEvent = (typeof ANALYTICS_EVENTS)[keyof typeof ANALYTICS_EVENTS]

declare global {
  interface Window {
    // GA4 は arguments オブジェクトを直接 push する仕様のため IArguments を許容
    dataLayer: Array<unknown | IArguments>
    // @internal — 直接呼び出し禁止。PII 送信防止のため必ず trackEvent() 経由で使用すること。
    gtag: (command: GtagCommand, ...args: unknown[]) => void
  }
}

// GA4 Measurement ID の正規表現（G-XXXXXXXXXX 形式）
const GA_ID_RE = /^G-[A-Z0-9]+$/

// モジュールスコープのフラグ。
// 注: このフラグは「初期化処理の開始」を示す。gtag.js スクリプトの
//     DOM 挿入は requestIdleCallback/setTimeout で非同期に行われるため、
//     initialized===true の時点でスクリプトのロードが完了している保証はない。
//     ただし window.gtag は dataLayer.push のラッパーとして同期的に定義済みのため
//     trackEvent の呼び出しは安全に行える。
let initialized = false

export function initAnalytics(): void {
  const measurementId = import.meta.env.VITE_GA_MEASUREMENT_ID
  if (!import.meta.env.PROD || !measurementId) return
  if (!GA_ID_RE.test(measurementId)) return

  if (!Array.isArray(window.dataLayer)) window.dataLayer = []
  // GA4 公式実装: arguments オブジェクトを直接 push する（配列でラップしない）
  // gtag.js がこの形式で dataLayer を読み取るため配列化は不可
  window.gtag = function gtag(this: void) {
    // eslint-disable-next-line prefer-rest-params
    window.dataLayer.push(arguments)
  }

  const gtagUrl = new URL('https://www.googletagmanager.com/gtag/js')
  gtagUrl.searchParams.set('id', measurementId)

  const script = document.createElement('script')
  script.async = true
  script.src = gtagUrl.href

  script.onerror = () => {
    console.warn('analytics: gtag.js のロードに失敗しました')
  }

  const insert = () => document.head.appendChild(script)
  if (typeof requestIdleCallback === 'function') {
    requestIdleCallback(insert)
  } else {
    setTimeout(insert, 0)
  }

  window.gtag('js', new Date())
  window.gtag('config', measurementId)
  initialized = true
}

interface PickExecutedParams {
  readonly player_count: number
}

// イベントごとにパラメータ型を厳密化し、PII の誤送信を型レベルで防ぐ。
// ANALYTICS_EVENTS 定数のリテラル型を参照し、新規イベント追加時の型同期を保証する。
export function trackEvent(
  eventName: typeof ANALYTICS_EVENTS.PICK_EXECUTED,
  params: PickExecutedParams,
): void
export function trackEvent(
  eventName: typeof ANALYTICS_EVENTS.REROLL_EXECUTED,
): void
export function trackEvent(
  eventName: AnalyticsEvent,
  params?: PickExecutedParams,
): void {
  if (!initialized) return
  window.gtag('event', eventName, params)
}
