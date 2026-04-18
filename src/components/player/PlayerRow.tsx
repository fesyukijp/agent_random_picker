import { memo, useState, useMemo } from 'react'
import { usePlayerStore } from '../../stores/playerStore'
import { AGENTS, ROLES } from '../../data/agents'
import type { PickResult, Player } from '../../logic/types'
import { getDisplayName } from '../../logic/playerUtils'
import { ChevronIcon } from '../icons/ChevronIcon'
import { RoleSettings } from './RoleSettings'
import { AgentSettings } from './AgentSettings'
import { useTranslation } from '../../i18n/useTranslation'
import type { TranslationKey } from '../../i18n/locales/ja'

export type RowMode = 'setup' | 'pending' | 'revealing' | 'confirmed'

// モジュールスコープ定数: レンダリングごとのオブジェクト生成を避ける
const ROW_CLASS: Record<RowMode, string> = {
  setup: '',
  pending:
    'bg-bg-primary border border-border/30 border-l-[3px] border-l-transparent rounded p-2 sm:p-4 flex items-center gap-2 sm:gap-4',
  revealing:
    'bg-bg-elevated border border-transparent border-l-[3px] border-l-accent rounded p-2 sm:p-4 flex items-center gap-2 sm:gap-4',
  confirmed:
    'bg-bg-surface border border-border rounded p-2 sm:p-4 flex items-center gap-2 sm:gap-4',
}

const NAME_CLASS: Record<RowMode, string> = {
  setup: '',
  pending: 'text-text-muted font-medium text-xs sm:text-sm',
  revealing: 'text-text-primary font-bold text-lg',
  confirmed: 'text-text-secondary font-medium text-xs sm:text-sm',
}

interface Props {
  player: Player
  index: number
  showDeleteButton: boolean
  mode: RowMode
  result: PickResult | null
  onReroll?: (playerId: string) => void
}

function PlayerRow({
  player,
  index,
  showDeleteButton,
  mode,
  result,
  onReroll,
}: Props) {
  const { t } = useTranslation()
  // セレクターをオブジェクトリテラルで返すと毎回新参照が生成され memo が無効化されるため分割する
  const removePlayer = usePlayerStore((s) => s.removePlayer)
  const updatePlayerName = usePlayerStore((s) => s.updatePlayerName)
  const [showRoleSettings, setShowRoleSettings] = useState(false)
  const [showAgentSettings, setShowAgentSettings] = useState(false)

  const defaultName = t('player.defaultName', { n: index + 1 })
  const displayName = getDisplayName(player, index, t)

  const totalRoles = ROLES.length
  const enabledRoles = player.settings.allowedRoles.size
  const showRoleBadge = enabledRoles < totalRoles

  const totalAgents = AGENTS.length
  const enabledAgents = useMemo(
    () =>
      AGENTS.filter(
        (a) =>
          player.settings.allowedRoles.has(a.roleId) &&
          !player.settings.excludedAgentIds.has(a.id),
      ).length,
    [player.settings.allowedRoles, player.settings.excludedAgentIds],
  )
  const showAgentBadge = enabledAgents < totalAgents

  if (mode === 'setup') {
    return (
      <div
        data-testid="player-card"
        className="bg-bg-surface rounded p-4 border border-border"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="font-medium text-text-primary">{displayName}</span>
          {showDeleteButton && (
            <button
              type="button"
              aria-label={t('player.deleteAriaLabel')}
              onClick={() => removePlayer(player.id)}
              className="text-text-muted hover:text-accent transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              ✕
            </button>
          )}
        </div>
        <input
          type="text"
          aria-label={t('player.nameAriaLabel', { name: defaultName })}
          value={player.settings.name}
          onChange={(e) => updatePlayerName(player.id, e.target.value)}
          placeholder={defaultName}
          maxLength={20}
          className="w-full border border-border rounded px-2 py-1 text-sm text-text-primary bg-bg-elevated mb-3 focus:outline-none focus:border-accent"
        />

        <div className="mb-2">
          <button
            type="button"
            aria-label={t('player.roleSettings')}
            aria-expanded={showRoleSettings}
            aria-controls={`role-settings-${player.id}`}
            onClick={() => setShowRoleSettings(!showRoleSettings)}
            className="text-sm font-medium text-text-secondary flex items-center gap-1 w-full text-left mb-1 hover:text-text-primary transition-colors"
          >
            <ChevronIcon open={showRoleSettings} />
            <span>{t('player.roleSettings')}</span>
            {showRoleBadge && (
              <span
                data-testid="role-settings-badge"
                className="text-xs text-text-muted"
              >
                （{enabledRoles}/{totalRoles}）
              </span>
            )}
          </button>
          {showRoleSettings && (
            <div id={`role-settings-${player.id}`} className="mt-2 pl-2">
              <RoleSettings
                playerId={player.id}
                allowedRoles={player.settings.allowedRoles}
              />
            </div>
          )}
        </div>

        <div>
          <button
            type="button"
            aria-label={t('player.agentSettings')}
            aria-expanded={showAgentSettings}
            aria-controls={`agent-settings-${player.id}`}
            onClick={() => setShowAgentSettings(!showAgentSettings)}
            className="text-sm font-medium text-text-secondary flex items-center gap-1 w-full text-left mb-1 hover:text-text-primary transition-colors"
          >
            <ChevronIcon open={showAgentSettings} />
            <span>{t('player.agentSettings')}</span>
            {showAgentBadge && (
              <span
                data-testid="agent-settings-badge"
                className="text-xs text-text-muted"
              >
                （{enabledAgents}/{totalAgents}）
              </span>
            )}
          </button>
          {showAgentSettings && (
            <div id={`agent-settings-${player.id}`} className="mt-2 pl-2">
              <AgentSettings
                playerId={player.id}
                allowedRoles={player.settings.allowedRoles}
                excludedAgentIds={player.settings.excludedAgentIds}
              />
            </div>
          )}
        </div>

        <div
          data-testid="result-placeholder"
          className="mt-4 flex flex-col justify-center items-center gap-1 h-20 opacity-50"
        >
          <span className="text-3xl text-text-muted select-none">?</span>
          <span className="text-xs text-text-muted">
            {t('player.notPicked')}
          </span>
        </div>
      </div>
    )
  }

  // Non-setup modes: pending / revealing / confirmed
  return (
    <div data-testid="player-card">
      <div
        data-testid="result-item"
        data-status={mode}
        className={ROW_CLASS[mode]}
      >
        <span className={`${NAME_CLASS[mode]} w-20 sm:w-28 shrink-0 truncate`}>
          {displayName}
        </span>

        <div className="w-10 h-10 sm:w-12 sm:h-12 shrink-0">
          {(mode === 'revealing' || mode === 'confirmed') && result && (
            <img
              data-testid="result-agent-image"
              src={result.agent.imageUrl}
              alt={t(`agentName.${result.agent.id}` as TranslationKey)}
              className="w-10 h-10 sm:w-12 sm:h-12 object-cover rounded bg-bg-elevated"
            />
          )}
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          {mode === 'pending' && result && (
            <>
              <div data-testid={`result-agent-${result.agent.id}`}>
                <span className="text-text-muted select-none">──────</span>
              </div>
              <span
                data-testid={`result-role-${result.agent.roleId}`}
                className="invisible text-sm uppercase"
              >
                {t(`roleName.${result.agent.roleId}` as TranslationKey)}
              </span>
            </>
          )}

          {(mode === 'revealing' || mode === 'confirmed') && result && (
            <div className="flex flex-col min-w-0">
              <div data-testid={`result-agent-${result.agent.id}`}>
                <span
                  data-testid="result-agent-name"
                  className="font-bold uppercase tracking-wider text-text-primary text-base sm:text-xl truncate block"
                  style={
                    mode === 'revealing'
                      ? { animation: 'slide-in 150ms ease-out 100ms both' }
                      : undefined
                  }
                >
                  {t(`agentName.${result.agent.id}` as TranslationKey)}
                </span>
              </div>
              <span
                data-testid="result-agent-role"
                className="text-xs sm:text-sm text-text-secondary uppercase"
              >
                <span data-testid={`result-role-${result.agent.roleId}`}>
                  {t(`roleName.${result.agent.roleId}` as TranslationKey)}
                </span>
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {mode === 'revealing' && (
            <span
              className="text-accent font-bold text-xl hidden sm:inline"
              style={{ animation: 'icon-flash 100ms 250ms both', opacity: 0 }}
              aria-hidden="true"
            >
              ◈
            </span>
          )}
          {mode === 'confirmed' && (
            <>
              <span
                className="text-accent font-bold text-xl hidden sm:inline"
                aria-hidden="true"
              >
                ◈
              </span>
              {onReroll && (
                <button
                  type="button"
                  data-testid="reroll-button"
                  onClick={() => onReroll(player.id)}
                  className="px-3 py-1 text-xs border border-accent rounded text-accent hover:bg-accent hover:text-bg-primary transition-colors uppercase tracking-wider"
                >
                  {t('player.reroll')}
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

const MemoPlayerRow = memo(PlayerRow)
export { MemoPlayerRow as PlayerRow }
