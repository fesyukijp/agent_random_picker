import { useMemo, useState, type FocusEvent } from 'react'
import { AGENTS_BY_ROLE, ROLES } from '../../data/agents'
import type { AgentConstraint, RoleId } from '../../logic/types'
import { usePlayerStore } from '../../stores/playerStore'
import { useShallow } from 'zustand/react/shallow'
import { ChevronIcon } from '../icons/ChevronIcon'
import { useTranslation } from '../../i18n/useTranslation'
import type { TranslationKey } from '../../i18n/locales/ja'

/**
 * ロール人数制限の数値入力。
 * Issue #2: 空文字中間状態を許容し、フォーカス時に全選択することで
 * 「既存値を消してから任意の値を入力する」という自然な操作を成立させる。
 *
 * - focused 中は draft 文字列を表示（空文字も可）
 * - onChange で有効な整数なら props の [min, max] にクランプして即 commit
 * - blur で draft を store の値に戻し、入力途中の不整合表示を消す
 */
interface NumberInputProps {
  readonly value: number
  readonly min: number
  readonly max: number
  readonly onCommit: (value: number) => void
  readonly id: string
  readonly 'data-testid': string
  readonly className?: string
}

function NumberInput({
  value,
  min,
  max,
  onCommit,
  id,
  'data-testid': testId,
  className,
}: NumberInputProps) {
  const [draft, setDraft] = useState(String(value))
  const [focused, setFocused] = useState(false)

  const displayValue = focused ? draft : String(value)

  const handleFocus = (e: FocusEvent<HTMLInputElement>) => {
    setDraft(String(value))
    setFocused(true)
    e.target.select()
  }

  return (
    <input
      type="number"
      id={id}
      data-testid={testId}
      value={displayValue}
      min={min}
      max={max}
      step="1"
      onFocus={handleFocus}
      onBlur={() => {
        setDraft(String(value))
        setFocused(false)
      }}
      onChange={(e) => {
        setDraft(e.target.value)
        if (e.target.value === '') return
        // Number() は "1e10"・"0x10" 等も受け付けるが、isInteger で弾く。
        // 科学表記や小数は UI 仕様として非対応。
        const n = Number(e.target.value)
        if (!Number.isInteger(n)) return
        onCommit(Math.max(min, Math.min(max, n)))
      }}
      className={className}
    />
  )
}

// 順序: 除外（ネガティブ）→ 対象（ニュートラル）→ 必須（ポジティブ）
// label はキー。コンポーネント内で t() で翻訳する。
const SEGMENT_KEYS: readonly {
  value: AgentConstraint
  labelKey: TranslationKey
}[] = [
  { value: 'banned', labelKey: 'party.constraintBanned' },
  { value: 'allowed', labelKey: 'party.constraintAllowed' },
  { value: 'required', labelKey: 'party.constraintRequired' },
]

interface Props {
  playerCount: number
}

function PartySettings({ playerCount }: Props) {
  const { t } = useTranslation()
  const allowDuplicates = usePlayerStore((s) => s.partySettings.allowDuplicates)
  const roleLimits = usePlayerStore((s) => s.partySettings.roleLimits)
  const agentConstraints = usePlayerStore(
    (s) => s.partySettings.agentConstraints,
  )
  const {
    setAllowDuplicates,
    setRoleLimit,
    setAgentConstraint,
    setRoleAgentConstraints,
    resetRoleLimits,
    resetAgentConstraints,
  } = usePlayerStore(
    useShallow((s) => ({
      setAllowDuplicates: s.setAllowDuplicates,
      setRoleLimit: s.setRoleLimit,
      setAgentConstraint: s.setAgentConstraint,
      setRoleAgentConstraints: s.setRoleAgentConstraints,
      resetRoleLimits: s.resetRoleLimits,
      resetAgentConstraints: s.resetAgentConstraints,
    })),
  )
  const [showRoleLimits, setShowRoleLimits] = useState(false)
  const [showAgentConstraints, setShowAgentConstraints] = useState(false)

  const isRoleLimitsDefault = ROLES.every(
    (role) =>
      roleLimits[role.id].min === 0 && roleLimits[role.id].max === playerCount,
  )
  const isAgentConstraintsDefault = Object.keys(agentConstraints).length === 0

  const roleConstraints = useMemo<
    Record<RoleId, AgentConstraint | null>
  >(() => {
    if (!showAgentConstraints) {
      return {
        duelist: null,
        initiator: null,
        controller: null,
        sentinel: null,
      }
    }
    const entries = ROLES.map((role) => {
      const roleAgents = AGENTS_BY_ROLE[role.id]
      if (roleAgents.length === 0) return [role.id, null] as const
      const firstConstraint = agentConstraints[roleAgents[0].id] ?? 'allowed'
      const constraint: AgentConstraint | null = roleAgents.every(
        (a) => (agentConstraints[a.id] ?? 'allowed') === firstConstraint,
      )
        ? firstConstraint
        : null
      return [role.id, constraint] as const
    })
    return Object.fromEntries(entries) as Record<RoleId, AgentConstraint | null>
  }, [agentConstraints, showAgentConstraints])

  return (
    <section
      data-testid="party-settings"
      className="bg-bg-surface rounded p-4 border border-border"
    >
      <h2 className="text-lg font-semibold text-text-primary mb-4 uppercase tracking-wider">
        {t('party.title')}
      </h2>

      <div className="flex items-center gap-3 mb-6">
        <input
          type="checkbox"
          id="allow-duplicates"
          data-testid="allow-duplicates-toggle"
          checked={allowDuplicates}
          onChange={(e) => setAllowDuplicates(e.target.checked)}
          className="w-4 h-4 accent-accent rounded"
        />
        <label
          htmlFor="allow-duplicates"
          className="text-sm text-text-secondary"
        >
          {t('party.allowDuplicates')}
        </label>
      </div>

      <div className="mb-2">
        <div className="flex items-center gap-2 mb-1">
          <button
            type="button"
            aria-expanded={showRoleLimits}
            aria-controls="role-limits-panel"
            onClick={() => setShowRoleLimits((prev) => !prev)}
            className="text-sm font-medium text-text-secondary flex items-center gap-1 flex-1 text-left hover:text-text-primary transition-colors uppercase"
          >
            <ChevronIcon open={showRoleLimits} />
            <span>{t('party.roleLimits')}</span>
          </button>
          <button
            type="button"
            data-testid="reset-role-limits"
            aria-label={t('party.roleLimitsResetAriaLabel')}
            onClick={resetRoleLimits}
            disabled={isRoleLimitsDefault}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-text-muted"
          >
            {t('party.reset')}
          </button>
        </div>
        {showRoleLimits && (
          <div id="role-limits-panel" className="mt-2 pl-2 mb-4">
            <div className="space-y-2">
              {ROLES.map((role) => {
                const limit = roleLimits[role.id]
                const roleName = t(`roleName.${role.id}` as TranslationKey)
                return (
                  <div
                    key={role.id}
                    data-testid={`role-limit-row-${role.id}`}
                    className="flex flex-col gap-1 sm:flex-row sm:items-center sm:gap-2 text-sm"
                  >
                    <span className="text-text-secondary sm:w-28">
                      {roleName}
                    </span>
                    <div className="flex items-center gap-2">
                      <label
                        htmlFor={`role-limit-${role.id}-min`}
                        className="whitespace-nowrap text-text-secondary"
                      >
                        {t('party.min')}
                      </label>
                      <NumberInput
                        id={`role-limit-${role.id}-min`}
                        data-testid={`role-limit-${role.id}-min`}
                        value={limit.min}
                        min={0}
                        max={limit.max}
                        onCommit={(v) => setRoleLimit(role.id, v, limit.max)}
                        className="w-14 border border-border rounded px-2 py-2 text-center bg-bg-elevated text-text-primary focus:outline-none focus:border-accent"
                      />
                      <label
                        htmlFor={`role-limit-${role.id}-max`}
                        className="whitespace-nowrap text-text-secondary"
                      >
                        {t('party.max')}
                      </label>
                      <NumberInput
                        id={`role-limit-${role.id}-max`}
                        data-testid={`role-limit-${role.id}-max`}
                        value={Math.min(limit.max, playerCount)}
                        min={limit.min}
                        max={playerCount}
                        onCommit={(v) => setRoleLimit(role.id, limit.min, v)}
                        className="w-14 border border-border rounded px-2 py-2 text-center bg-bg-elevated text-text-primary focus:outline-none focus:border-accent"
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>

      <div>
        <div className="flex items-center gap-2 mb-1">
          <button
            type="button"
            aria-expanded={showAgentConstraints}
            aria-controls="agent-constraints-panel"
            onClick={() => setShowAgentConstraints((prev) => !prev)}
            className="text-sm font-medium text-text-secondary flex items-center gap-1 flex-1 text-left hover:text-text-primary transition-colors uppercase"
          >
            <ChevronIcon open={showAgentConstraints} />
            <span>{t('party.agentConstraints')}</span>
          </button>
          <button
            type="button"
            data-testid="reset-agent-constraints"
            aria-label={t('party.agentConstraintsResetAriaLabel')}
            onClick={resetAgentConstraints}
            disabled={isAgentConstraintsDefault}
            className="text-xs text-text-muted hover:text-text-secondary transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-text-muted"
          >
            {t('party.reset')}
          </button>
        </div>
        {showAgentConstraints && (
          <div id="agent-constraints-panel" className="mt-2 pl-2">
            <p className="text-xs text-text-muted mb-3">
              {t('party.constraintDescription')}
            </p>

            <div className="space-y-4">
              {ROLES.map((role) => {
                const roleAgents = AGENTS_BY_ROLE[role.id]
                if (roleAgents.length === 0) return null
                const roleConstraint = roleConstraints[role.id]
                const roleName = t(`roleName.${role.id}` as TranslationKey)
                return (
                  <div
                    key={role.id}
                    data-testid={`agent-constraint-section-${role.id}`}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <p className="text-xs font-medium text-text-muted uppercase flex-1">
                        {roleName}
                      </p>
                      <div className="flex shrink-0 rounded overflow-hidden border border-border">
                        {SEGMENT_KEYS.map(({ value, labelKey }) => {
                          const label = t(labelKey)
                          return (
                            <button
                              key={value}
                              type="button"
                              data-testid={`role-agent-constraint-${role.id}-${value}`}
                              aria-pressed={
                                roleConstraint === null
                                  ? undefined
                                  : roleConstraint === value
                              }
                              aria-label={t('party.roleConstraintAriaLabel', {
                                role: roleName,
                                label,
                              })}
                              onClick={() =>
                                setRoleAgentConstraints(role.id, value)
                              }
                              className="px-2 py-0.5 text-xs font-medium transition-colors border-r border-border last:border-r-0 text-text-muted hover:text-text-secondary hover:bg-bg-elevated bg-bg-surface"
                            >
                              {label}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-1">
                      {AGENTS_BY_ROLE[role.id].map((agent) => {
                        const constraint =
                          agentConstraints[agent.id] ?? 'allowed'
                        const agentName = t(
                          `agentName.${agent.id}` as TranslationKey,
                        )
                        return (
                          <div
                            key={agent.id}
                            className="flex items-center gap-2 py-0.5"
                          >
                            <img
                              src={agent.imageUrl}
                              alt=""
                              aria-hidden="true"
                              loading="lazy"
                              className="w-6 h-6 rounded object-cover shrink-0"
                            />
                            <span className="flex-1 min-w-0 text-xs text-text-secondary truncate">
                              {agentName}
                            </span>
                            <div className="flex shrink-0 rounded overflow-hidden border border-border">
                              {SEGMENT_KEYS.map(({ value, labelKey }) => {
                                const label = t(labelKey)
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    data-testid={`agent-constraint-${agent.id}-${value}`}
                                    aria-pressed={constraint === value}
                                    aria-label={t(
                                      'party.agentConstraintAriaLabel',
                                      { agent: agentName, label },
                                    )}
                                    onClick={() =>
                                      setAgentConstraint(agent.id, value)
                                    }
                                    className={`px-2 py-0.5 text-xs font-medium transition-colors border-r border-border last:border-r-0 ${
                                      constraint === value
                                        ? value === 'required'
                                          ? 'bg-accent text-bg-primary'
                                          : value === 'banned'
                                            ? 'bg-text-muted/30 text-text-secondary'
                                            : 'bg-bg-elevated text-text-primary'
                                        : 'bg-bg-surface text-text-muted hover:text-text-secondary hover:bg-bg-elevated'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                )
                              })}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export { PartySettings }
