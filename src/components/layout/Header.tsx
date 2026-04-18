import { useTranslation } from '../../i18n/useTranslation'

export function Header() {
  const { t, language, setLanguage } = useTranslation()
  return (
    <header
      aria-label={t('header.ariaLabel')}
      className="bg-bg-surface border-b border-border"
    >
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-text-primary uppercase tracking-wider">
            Agent Random Picker
          </h1>
          <p className="text-xs text-text-muted">{t('header.subtitle')}</p>
        </div>
        <button
          type="button"
          data-testid="language-toggle"
          aria-label={t('header.languageToggle')}
          onClick={() => setLanguage(language === 'ja' ? 'en' : 'ja')}
          className="px-2 py-1 text-xs border border-border rounded text-text-muted hover:border-accent hover:text-accent transition-colors uppercase tracking-wider"
        >
          {language === 'ja' ? 'EN' : 'JA'}
        </button>
      </div>
    </header>
  )
}
