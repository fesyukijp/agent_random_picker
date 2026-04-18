import { useEffect, useRef, useCallback, useState, useMemo, memo } from 'react'
import { AGENTS } from './data/agents'
import { Header } from './components/layout/Header'
import { Footer } from './components/layout/Footer'
import { PlayerRow } from './components/player/PlayerRow'
import type { RowMode } from './components/player/PlayerRow'
import { PartySettings } from './components/settings/PartySettings'
import { usePlayerStore, MAX_PLAYERS } from './stores/playerStore'
import { useResultStore } from './stores/resultStore'
import { useShallow } from 'zustand/react/shallow'
import { buildXShareUrl } from './logic/share'
import { getDisplayName } from './logic/playerUtils'
import { XIcon } from './components/icons/XIcon'
import { useIsMobile } from './hooks/useIsMobile'
import { useTranslation } from './i18n/useTranslation'

import type { TranslatableMessage, TranslateFunction } from './i18n/types'
import type { TranslationKey } from './i18n/locales/ja'

/**
 * ロジック層が返す TranslatableMessage のパラメータを UI 表示用に解決する。
 * - role パラメータ (roleId) → ロケール名に変換
 * - validation.requiredUnreachable の name (agentId) → ロケール名に変換
 * - 空の name + playerIndex → デフォルトプレイヤー名に変換
 */
function resolveErrorMessage(
  error: TranslatableMessage,
  t: TranslateFunction,
): string {
  const params = { ...error.params }

  // role ID → ロケール名（validation.roleMinExceedsMax, requiredExceedsRoleMax）
  if (typeof params.role === 'string') {
    params.role = t(`roleName.${params.role}` as TranslationKey)
  }

  // agent ID → ロケール名（validation.requiredUnreachable）
  if (typeof params.agentId === 'string') {
    params.agentId = t(`agentName.${params.agentId}` as TranslationKey)
  }

  // 空プレイヤー名 → デフォルト名（validation.noRolesSelected, noCandidates）
  if (params.name === '' && typeof params.playerIndex === 'number') {
    params.name = t('player.defaultName', { n: params.playerIndex + 1 })
  }

  return t(error.key, params)
}

// コンポーネント外の純粋関数: useCallback 不要 + ネスト三項禁止ルール（rules/typescript.md）回避。
// インライン化（useCallback 削除→三項ネスト）と再抽出のループが発生した経緯あり。この形が最終解。
function getRowMode(revealIndex: number, index: number): RowMode {
  if (revealIndex < 0) return 'pending'
  if (index < revealIndex) return 'confirmed'
  if (index === revealIndex) return 'revealing'
  return 'pending'
}

interface PickButtonProps {
  onClick: () => void
  disabled: boolean
  label: string
}

const PickButton = memo(function PickButton({
  onClick,
  disabled,
  label,
}: PickButtonProps) {
  return (
    <button
      type="button"
      data-testid="pick-button"
      onClick={onClick}
      disabled={disabled}
      aria-busy={disabled}
      className="w-full sm:w-auto px-8 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-bg-primary font-bold rounded text-lg transition-colors uppercase tracking-wider"
    >
      {label}
    </button>
  )
})

function App() {
  const { t } = useTranslation()
  // partySettings や agentConstraints の変更で再レンダーされないよう個別セレクタを使用
  const players = usePlayerStore(useShallow((s) => s.players))
  const addPlayer = usePlayerStore((s) => s.addPlayer)
  const results = useResultStore((s) => s.results)
  const error = useResultStore((s) => s.error)
  const isLoading = useResultStore((s) => s.isLoading)
  const executePick = useResultStore((s) => s.executePick)
  const rerollPlayer = useResultStore((s) => s.rerollPlayer)
  const clearResults = useResultStore((s) => s.clearResults)

  const isMobile = useIsMobile()
  const [selectedPlayerIndex, setSelectedPlayerIndex] = useState(0)

  const [revealIndex, setRevealIndex] = useState(-1)
  const shouldAnimateRef = useRef(false)
  // アニメーションタイマー ID を保持し、新規ピック時にキャンセルする
  const revealTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )

  // プレイヤー数変化時の結果クリアは playerStore.ts のモジュールスコープ subscribe で処理。

  // 結果クリア時に revealIndex / shouldAnimateRef / タイマーも同時リセットするハンドラ。
  // storage イベントと back ボタンの両方で使用する。
  const handleClearResults = useCallback(() => {
    clearTimeout(revealTimerRef.current)
    clearResults()
    setRevealIndex(-1)
    shouldAnimateRef.current = false
  }, [clearResults])

  // 他タブでの playerStore 変更を検知し結果をクリアする。
  // rehydrate は Zustand persist が内部で処理するため、ここでは結果の整合性のみ担保する。
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'agent-picker-players') {
        handleClearResults()
      }
    }
    window.addEventListener('storage', handleStorage)
    return () => window.removeEventListener('storage', handleStorage)
  }, [handleClearResults])

  // 全体ピック実行後のみアニメーション開始
  // shouldAnimateRef のリセットをタイマーコールバック内に配置し、
  // React StrictMode の mount→unmount→remount でアニメーションがスキップされるのを防ぐ。
  useEffect(() => {
    if (!results || !shouldAnimateRef.current) return
    revealTimerRef.current = setTimeout(() => {
      shouldAnimateRef.current = false
      setRevealIndex(0)
    }, 50)
    return () => clearTimeout(revealTimerRef.current)
  }, [results])

  // 500ms 間隔で次のプレイヤーを発表
  const resultsLength = results?.length ?? 0
  useEffect(() => {
    if (revealIndex < 0 || resultsLength === 0 || revealIndex >= resultsLength)
      return
    revealTimerRef.current = setTimeout(
      () => setRevealIndex((prev) => prev + 1),
      500,
    )
    return () => clearTimeout(revealTimerRef.current)
  }, [revealIndex, resultsLength])

  const allRevealed = results !== null && revealIndex >= results.length

  // 発表モードでの O(1) 結果ルックアップ用 Map（revealIndex 更新のたびに線形探索しないように）
  const resultByPlayerId = useMemo(
    () => new Map(results?.map((r) => [r.playerId, r]) ?? []),
    [results],
  )

  // resultByPlayerId は results から派生するため依存として冗長だが、
  // exhaustive-deps が要求するため含めている（再計算タイミングは同一）。
  const xShareUrl = useMemo(() => {
    if (!allRevealed || !results) return null
    return buildXShareUrl(players, results, resultByPlayerId, t)
  }, [allRevealed, results, players, resultByPlayerId, t])

  // usePlayerStore.getState() で取得する理由:
  // players/partySettings を useCallback の依存配列に含めると設定変更のたびにコールバックが
  // 再生成されて PickButton が不要な再レンダーを起こす。Zustand の getState() は
  // サブスクリプションを持たず常に最新値を返すため、stale closure を回避しつつ
  // React の依存追跡を意図的にバイパスできる。
  const handlePick = useCallback(() => {
    // MEDIUM-1 修正: 進行中のアニメーションタイマーをキャンセルしてから新規ピック開始
    clearTimeout(revealTimerRef.current)
    shouldAnimateRef.current = true
    setRevealIndex(-1)
    const { players: currentPlayers, partySettings } = usePlayerStore.getState()
    executePick(currentPlayers, partySettings, AGENTS)
  }, [executePick])

  const handleReroll = useCallback(
    (playerId: string) => {
      // handlePick と同様に getState() で stale closure を回避する
      const { players: currentPlayers, partySettings: currentPartySettings } =
        usePlayerStore.getState()
      rerollPlayer(playerId, currentPlayers, currentPartySettings, AGENTS)
    },
    [rerollPlayer],
  )

  const showDeleteButton = players.length > 1
  const isSetup = results === null

  const gridClass =
    players.length === 1
      ? 'grid gap-4 grid-cols-1 max-w-sm mx-auto w-full'
      : players.length === 2
        ? 'grid gap-4 grid-cols-2 max-w-2xl mx-auto w-full'
        : 'flex flex-wrap gap-4 justify-center'

  // 3人以上時の各カード幅（gap-4 = 1rem 前提: sm 2列, lg 3列）
  const playerCardClass =
    players.length >= 3
      ? 'w-full sm:w-[calc(50%-0.5rem)] lg:w-[calc(33.333%-0.667rem)]'
      : undefined

  const effectiveSelectedIndex = Math.min(
    selectedPlayerIndex,
    players.length - 1,
  )

  return (
    <div className="min-h-screen flex flex-col bg-bg-primary">
      <Header />
      <main
        className={`max-w-7xl w-full mx-auto px-4 py-6 flex-1${isMobile && isSetup ? ' pb-32' : ''}`}
      >
        {error && (
          <div
            role="alert"
            data-testid="pick-error"
            className="mb-4 p-3 bg-bg-surface border border-border-accent rounded text-accent text-sm"
          >
            {resolveErrorMessage(error, t)}
          </div>
        )}

        {/* ===== セットアップモード ===== */}
        {isSetup && (
          <>
            {isMobile ? (
              /* ── モバイル: 概要カード横並び + 選択詳細 ── */
              <>
                {/* 全プレイヤー概要カード（横スクロール） */}
                <div className="flex gap-2 overflow-x-auto pb-2 mb-4 hide-scrollbar">
                  {players.map((player, index) => {
                    const isSelected = index === effectiveSelectedIndex
                    const name = getDisplayName(player, index, t)
                    return (
                      <button
                        key={player.id}
                        type="button"
                        data-testid="player-overview-card"
                        onClick={() => setSelectedPlayerIndex(index)}
                        className={`flex-shrink-0 w-[5.5rem] p-2 rounded border text-xs text-center transition-colors ${
                          isSelected
                            ? 'border-accent text-text-primary bg-bg-surface'
                            : 'border-border text-text-muted bg-bg-surface hover:border-accent/50'
                        }`}
                      >
                        <div className="truncate font-medium">{name}</div>
                        <div className="mt-1 text-text-muted text-[10px]">
                          {isSelected
                            ? t('ui.mobileConfiguring')
                            : t('ui.mobileTap')}
                        </div>
                      </button>
                    )
                  })}
                  {players.length < MAX_PLAYERS && (
                    <button
                      type="button"
                      aria-label={t('ui.addPlayer')}
                      onClick={addPlayer}
                      className="flex-shrink-0 w-20 p-2 rounded border-2 border-dashed border-border text-text-muted hover:border-accent hover:text-accent transition-colors text-xl"
                    >
                      {t('ui.addPlayerSymbol')}
                    </button>
                  )}
                </div>

                {/* 選択中プレイヤーの詳細設定 */}
                <PlayerRow
                  key={players[effectiveSelectedIndex].id}
                  player={players[effectiveSelectedIndex]}
                  index={effectiveSelectedIndex}
                  showDeleteButton={showDeleteButton}
                  mode="setup"
                  result={null}
                />

                {/* 全体設定（2人以上） */}
                {players.length >= 2 && (
                  <div className="mt-6">
                    <PartySettings playerCount={players.length} />
                  </div>
                )}
              </>
            ) : (
              /* ── デスクトップ: グリッドレイアウト ── */
              <>
                <div className={gridClass}>
                  {players.map((player, index) => (
                    <div key={player.id} className={playerCardClass}>
                      <PlayerRow
                        player={player}
                        index={index}
                        showDeleteButton={showDeleteButton}
                        mode="setup"
                        result={null}
                      />
                    </div>
                  ))}
                  {players.length < MAX_PLAYERS && (
                    <div className={playerCardClass}>
                      <button
                        type="button"
                        aria-label={t('ui.addPlayer')}
                        onClick={addPlayer}
                        className="w-full h-full min-h-[120px] border-2 border-dashed border-border rounded text-text-muted hover:border-accent hover:text-accent transition-colors flex flex-col items-center justify-center gap-1"
                      >
                        <span className="text-2xl">
                          {t('ui.addPlayerSymbol')}
                        </span>
                        <span className="text-sm">{t('ui.addPlayer')}</span>
                      </button>
                    </div>
                  )}
                </div>
                {players.length >= 2 && (
                  <div className="mt-6">
                    <PartySettings playerCount={players.length} />
                  </div>
                )}
              </>
            )}

            {/* ピックボタン: モバイルは固定フッター、デスクトップは通常フロー */}
            {isMobile ? (
              <div className="fixed bottom-0 left-0 right-0 bg-bg-primary border-t border-border px-4 py-3 z-10">
                <PickButton
                  onClick={handlePick}
                  disabled={isLoading}
                  label={t('ui.pickButton')}
                />
              </div>
            ) : (
              <div className="flex justify-center mt-6">
                <PickButton
                  onClick={handlePick}
                  disabled={isLoading}
                  label={t('ui.pickButton')}
                />
              </div>
            )}
          </>
        )}

        {/* ===== 発表モード（共通） ===== */}
        {!isSetup && (
          <div className="space-y-2 max-w-2xl mx-auto w-full">
            {players.map((player, index) => {
              const mode = getRowMode(revealIndex, index)
              const result = resultByPlayerId.get(player.id) ?? null
              return (
                <PlayerRow
                  key={player.id}
                  player={player}
                  index={index}
                  showDeleteButton={false}
                  mode={mode}
                  result={result}
                  onReroll={allRevealed ? handleReroll : undefined}
                />
              )
            })}

            {allRevealed && (
              <div
                className="flex flex-col items-center gap-3 mt-4"
                style={{ animation: 'fade-in 150ms ease-out' }}
              >
                <button
                  type="button"
                  data-testid="reroll-all-button"
                  onClick={handlePick}
                  disabled={isLoading}
                  aria-busy={isLoading}
                  className="px-8 py-3 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-bg-primary font-bold rounded text-lg transition-colors uppercase tracking-wider"
                >
                  {t('ui.repickButton')}
                </button>
                {xShareUrl && (
                  <a
                    href={xShareUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={t('share.xAriaLabel')}
                    data-testid="x-share-button"
                    className="flex items-center gap-2 px-6 py-2 bg-black hover:bg-neutral-800 text-white font-bold rounded text-base transition-colors"
                  >
                    <XIcon />
                    {t('ui.shareButton')}
                  </a>
                )}
                <button
                  type="button"
                  data-testid="back-to-setup-button"
                  onClick={handleClearResults}
                  className="text-sm text-text-secondary hover:text-text-primary transition-colors"
                >
                  {t('ui.backButton')}
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      <Footer />
    </div>
  )
}

export { App }
