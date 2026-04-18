import type { Page } from '@playwright/test'

/**
 * E2E テスト用: DEV ビルドで window に公開されたストアの型定義。
 * page.evaluate() 内での型安全な操作を提供し、生の setState による型乖離を防ぐ。
 */
interface DevWindowStores {
  __stores__?: {
    usePlayerStore: {
      setState: (partial: Record<string, unknown>) => void
      getState: () => {
        players: Array<{
          id: string
          settings: {
            name: string
            allowedRoles: Set<string>
            excludedAgentIds: Set<string>
          }
        }>
        partySettings: {
          allowDuplicates: boolean
          agentConstraints: Record<string, string>
          roleLimits: Record<string, { min: number; max: number }>
        }
        setRoleLimit: (roleId: string, min: number, max: number) => void
      }
    }
    useResultStore: {
      setState: (partial: Record<string, unknown>) => void
      getState: () => Record<string, unknown>
    }
  }
  __agents__?: Array<{ id: string }>
}

/**
 * ロール人数制限を設定する。型安全なストアアクション経由で操作。
 */
export async function setRoleLimits(
  page: Page,
  limits: Record<string, { min: number; max: number }>,
): Promise<void> {
  await page.evaluate((limits) => {
    const w = window as unknown as DevWindowStores
    if (!w.__stores__) throw new Error('__stores__ not exposed')
    const { usePlayerStore } = w.__stores__
    const { setRoleLimit } = usePlayerStore.getState()
    for (const [roleId, { min, max }] of Object.entries(limits)) {
      setRoleLimit(roleId, min, max)
    }
  }, limits)
}

/**
 * 重複設定とプレイヤー除外を一括設定する（デッドロックテスト用）。
 */
export async function setDeadlockCondition(
  page: Page,
  allowedAgentId: string,
  allowDuplicates: boolean,
): Promise<void> {
  await page.evaluate(
    ({ allowedAgentId, allowDuplicates }) => {
      const w = window as unknown as DevWindowStores
      if (!w.__stores__) throw new Error('__stores__ not exposed')
      if (!w.__agents__) throw new Error('__agents__ not exposed')

      const { usePlayerStore } = w.__stores__
      const state = usePlayerStore.getState()
      const allAgentIds = w.__agents__.map((a) => a.id)
      const excludedIds = new Set(
        allAgentIds.filter((id) => id !== allowedAgentId),
      )

      usePlayerStore.setState({
        players: state.players.map((p) => ({
          ...p,
          settings: { ...p.settings, excludedAgentIds: excludedIds },
        })),
        partySettings: { ...state.partySettings, allowDuplicates },
      })
    },
    { allowedAgentId, allowDuplicates },
  )
}
