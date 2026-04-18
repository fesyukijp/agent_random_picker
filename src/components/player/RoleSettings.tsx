import { ROLES } from '../../data/agents'
import { usePlayerStore } from '../../stores/playerStore'
import type { RoleId } from '../../logic/types'
import { useTranslation } from '../../i18n/useTranslation'
import type { TranslationKey } from '../../i18n/locales/ja'

interface Props {
  playerId: string
  allowedRoles: Set<RoleId>
}

function RoleSettings({ playerId, allowedRoles }: Props) {
  const { t } = useTranslation()
  const toggleRole = usePlayerStore((s) => s.toggleRole)
  const setAllRoles = usePlayerStore((s) => s.setAllRoles)

  return (
    <div>
      <div className="flex gap-1 flex-wrap mb-2">
        {ROLES.map((role) => (
          <button
            key={role.id}
            type="button"
            data-testid={`role-toggle-${role.id}`}
            aria-pressed={allowedRoles.has(role.id)}
            onClick={() => toggleRole(playerId, role.id)}
            className={`px-2 py-1 text-xs rounded transition-colors uppercase border ${
              allowedRoles.has(role.id)
                ? 'border-accent text-accent bg-accent/20'
                : 'border-border text-text-secondary bg-transparent'
            }`}
          >
            {t(`roleName.${role.id}` as TranslationKey)}
          </button>
        ))}
      </div>
      {allowedRoles.size === 0 && (
        <p className="text-xs text-accent mb-2" role="alert">
          {t('role.selectAtLeastOne')}
        </p>
      )}
      <div className="flex gap-2">
        <button
          type="button"
          aria-label={t('role.allOnAriaLabel')}
          onClick={() => setAllRoles(playerId, true)}
          className="text-xs px-2 py-0.5 border border-border rounded text-text-muted hover:border-accent hover:text-accent transition-colors"
        >
          {t('role.allOn')}
        </button>
        <button
          type="button"
          aria-label={t('role.allOffAriaLabel')}
          onClick={() => setAllRoles(playerId, false)}
          className="text-xs px-2 py-0.5 border border-border rounded text-text-muted hover:border-accent hover:text-accent transition-colors"
        >
          {t('role.allOff')}
        </button>
      </div>
    </div>
  )
}

export { RoleSettings }
