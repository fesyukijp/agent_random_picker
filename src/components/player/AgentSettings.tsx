import { memo } from 'react'
import { AGENTS_BY_ROLE, ROLES } from '../../data/agents'
import { usePlayerStore } from '../../stores/playerStore'
import type { RoleId } from '../../logic/types'
import { useTranslation } from '../../i18n/useTranslation'
import type { TranslationKey } from '../../i18n/locales/ja'

interface Props {
  playerId: string
  allowedRoles: Set<RoleId>
  excludedAgentIds: Set<string>
}

const AgentSettings = memo(function AgentSettings({
  playerId,
  allowedRoles,
  excludedAgentIds,
}: Props) {
  const { t } = useTranslation()
  // Zustand のアクション関数は参照安定のため、個別セレクタで十分（useShallow 不要）
  const toggleAgent = usePlayerStore((s) => s.toggleAgent)
  const setAllAgents = usePlayerStore((s) => s.setAllAgents)
  const toggleRole = usePlayerStore((s) => s.toggleRole)

  return (
    <div>
      {ROLES.map((role) => {
        const isRoleOn = allowedRoles.has(role.id)
        const roleName = t(`roleName.${role.id}` as TranslationKey)
        const roleAgents = AGENTS_BY_ROLE[role.id]
        return (
          <div key={role.id} className="mb-3">
            <button
              type="button"
              data-testid={`agent-section-role-${role.id}`}
              aria-pressed={isRoleOn}
              aria-label={
                isRoleOn
                  ? t('role.toggleOnAriaLabel', { role: roleName })
                  : t('role.toggleOffAriaLabel', { role: roleName })
              }
              onClick={() => toggleRole(playerId, role.id)}
              className={`text-xs font-semibold uppercase tracking-wider mb-1 px-1.5 py-0.5 rounded transition-colors ${
                isRoleOn
                  ? 'text-accent border border-accent/50 bg-accent/10'
                  : 'text-text-muted border border-border bg-transparent'
              }`}
            >
              {roleName}
            </button>
            <div
              className={`flex gap-1 flex-wrap ${isRoleOn ? '' : 'opacity-40'}`}
            >
              {roleAgents.map((agent) => {
                const isIncluded = !excludedAgentIds.has(agent.id)
                return (
                  <button
                    key={agent.id}
                    type="button"
                    data-testid={`agent-toggle-${agent.id}`}
                    aria-pressed={isIncluded}
                    onClick={() => toggleAgent(playerId, agent.id)}
                    className={`flex items-center gap-1 px-1.5 py-1 text-xs rounded transition-colors ${
                      isIncluded
                        ? 'bg-accent text-bg-primary'
                        : 'bg-bg-elevated text-text-secondary opacity-50'
                    }`}
                  >
                    <img
                      src={agent.imageUrl}
                      alt=""
                      aria-hidden="true"
                      loading="lazy"
                      className="w-4 h-4 rounded-sm object-cover shrink-0"
                    />
                    {t(`agentName.${agent.id}` as TranslationKey)}
                  </button>
                )
              })}
            </div>
          </div>
        )
      })}
      <div className="flex gap-2 mt-1">
        <button
          type="button"
          aria-label={t('agent.allOnAriaLabel')}
          onClick={() => setAllAgents(playerId, true)}
          className="text-xs px-2 py-0.5 border border-border rounded text-text-muted hover:border-accent hover:text-accent transition-colors"
        >
          {t('agent.allOn')}
        </button>
        <button
          type="button"
          aria-label={t('agent.allOffAriaLabel')}
          onClick={() => setAllAgents(playerId, false)}
          className="text-xs px-2 py-0.5 border border-border rounded text-text-muted hover:border-accent hover:text-accent transition-colors"
        >
          {t('agent.allOff')}
        </button>
      </div>
    </div>
  )
})

export { AgentSettings }
