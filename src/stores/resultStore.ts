import { create } from 'zustand'
import type { Agent, PartySettings, PickResult, Player } from '../logic/types'
import type { TranslatableMessage } from '../i18n/types'
import {
  randomPick,
  rerollPlayer as rerollPlayerLogic,
} from '../logic/randomPicker'
import { validateConstraints } from '../logic/validator'
import { ANALYTICS_EVENTS, trackEvent } from '../analytics'

/** TranslatableMessage かどうかを判定する型ガード */
function isTranslatableMessage(value: unknown): value is TranslatableMessage {
  return (
    !Array.isArray(value) &&
    typeof value === 'object' &&
    value !== null &&
    'key' in value &&
    typeof (value as TranslatableMessage).key === 'string'
  )
}

interface ResultStore {
  results: PickResult[] | null
  isLoading: boolean
  error: TranslatableMessage | null
  executePick: (
    players: readonly Player[],
    partySettings: PartySettings,
    allAgents: readonly Agent[],
  ) => void
  rerollPlayer: (
    targetPlayerId: string,
    players: readonly Player[],
    partySettings: PartySettings,
    allAgents: readonly Agent[],
  ) => void
  clearResults: () => void
}

export const useResultStore = create<ResultStore>((set, get) => ({
  results: null,
  isLoading: false,
  error: null,

  executePick: (players, partySettings, allAgents) => {
    if (get().isLoading) return
    set({ isLoading: true, error: null })
    try {
      const validation = validateConstraints({
        players,
        partySettings,
        agents: allAgents,
      })
      if (!validation.valid) {
        set({ results: null, error: validation.error, isLoading: false })
        return
      }
      // validateConstraints で算出済みの候補集合を再利用し二重計算を回避
      const result = randomPick({
        players,
        partySettings,
        allAgents,
        precomputedCandidates: validation.candidates,
      })
      if (isTranslatableMessage(result)) {
        set({ results: null, error: result, isLoading: false })
      } else {
        set({ results: result, error: null, isLoading: false })
        trackEvent(ANALYTICS_EVENTS.PICK_EXECUTED, {
          player_count: players.length,
        })
      }
    } catch (e) {
      if (import.meta.env.DEV) console.error('executePick caught:', e)
      set({
        results: null,
        error: { key: 'error.unexpected' },
        isLoading: false,
      })
    }
  },

  // rerollPlayer は同期処理のため isLoading を設定しない（executePick とは異なる）。
  // 連打防止は UI 側（ボタンの disabled 属性）で行う。
  rerollPlayer: (targetPlayerId, players, partySettings, allAgents) => {
    if (get().isLoading) return
    const currentResults = get().results
    if (!currentResults) {
      set({ error: { key: 'store.rerollRequiresResults' } })
      return
    }

    try {
      const result = rerollPlayerLogic({
        targetPlayerId,
        currentResults,
        players,
        partySettings,
        allAgents,
      })

      if (isTranslatableMessage(result)) {
        // 再抽選失敗時は元の results を維持しエラーメッセージのみ表示する設計。
        // UI では error バナーと既存の結果カードが共存する。
        // error は次の executePick (set({ error: null })) か clearResults でクリアされる。
        set({ error: result })
      } else {
        const updatedResults = currentResults.map((r) =>
          r.playerId === targetPlayerId ? result : r,
        )
        set({ results: updatedResults, error: null })
        trackEvent(ANALYTICS_EVENTS.REROLL_EXECUTED)
      }
    } catch (e) {
      // rerollPlayer は同期処理のため isLoading を操作しない
      if (import.meta.env.DEV) console.error('rerollPlayer caught:', e)
      set({ error: { key: 'error.unexpected' } })
    }
  },

  clearResults: () => set({ results: null, error: null }),
}))
