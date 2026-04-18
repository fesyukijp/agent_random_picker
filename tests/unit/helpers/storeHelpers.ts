import type { Player } from '../../../src/logic/types'
import { usePlayerStore } from '../../../src/stores/playerStore'

// Zustand persist API の型（境界キャスト: Zustand は persist を公開型で提供していない）
type StoreWithPersist = typeof usePlayerStore & {
  persist: {
    rehydrate: () => Promise<void> | void
    clearStorage: () => void
    hasHydrated: () => boolean
  }
}

// 交差型へのキャスト（unknown 迂回不要: StoreWithPersist は typeof usePlayerStore の拡張）
export const storeWithPersist = usePlayerStore as StoreWithPersist

/** 各テストの beforeEach でストアと localStorage を完全リセットする */
export function resetStore(): void {
  usePlayerStore.setState(usePlayerStore.getInitialState(), true)
  storeWithPersist.persist.clearStorage()
  localStorage.clear()
}

/** playerStore から指定 ID のプレイヤーを取得。見つからなければ即座にテスト失敗する */
export function getPlayer(playerId: string): Player {
  const player = usePlayerStore
    .getState()
    .players.find((p) => p.id === playerId)
  if (!player) throw new Error(`Player "${playerId}" not found in store`)
  return player
}
