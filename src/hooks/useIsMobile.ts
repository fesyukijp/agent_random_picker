import { useEffect, useState } from 'react'

const MOBILE_QUERY = '(max-width: 639px)'

// モジュールスコープで MQL を1回だけ生成（ブラウザ環境のみ）
// jsdom など matchMedia 未実装の環境にも対応するため typeof チェックを追加
const mql =
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(MOBILE_QUERY)
    : null

/**
 * ウィンドウ幅が 640px 未満���どうかを返す。
 * SSR / テスト環境（window 未定義）では false を初期値とする。
 * 将来 SSR 対応する場合は useEffect 内で初期値を補正するパターンを採用すること。
 *
 * matchMedia の change イベントを使用することで:
 * - 幅/高さ両方に反応する resize イベントより効率的（閾値をまたぐ変化のみ発火）
 * - debounce 不要
 *
 * モジュールスコープで MQL インスタンスを保持し、複数のフック呼び出しで共有する。
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => mql?.matches ?? false)
  useEffect(() => {
    if (!mql) return
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mql.addEventListener('change', handler)
    return () => mql.removeEventListener('change', handler)
  }, [])
  return isMobile
}
