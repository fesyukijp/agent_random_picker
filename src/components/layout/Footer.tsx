import { useTranslation } from '../../i18n/useTranslation'

// ページロード時（モジュール初期化時）に1回だけ評価される。
// 同一タブを年をまたいで開き続けた場合は古い年が表示されるが、リロードで更新される。
const CURRENT_YEAR = new Date().getFullYear()

export function Footer() {
  const { t } = useTranslation()
  const currentYear = CURRENT_YEAR
  return (
    <footer
      aria-label={t('footer.ariaLabel')}
      className="bg-bg-surface border-t border-border"
    >
      <div className="max-w-7xl mx-auto px-4 py-4 flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <span className="text-xs text-text-muted">
          {t('footer.copyright', { year: currentYear })}
        </span>
        <div className="flex items-center gap-4 text-xs text-text-muted">
          <a
            href="https://github.com/fesyukijp/agent_random_picker/issues"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('footer.bugReportAriaLabel')}
            className="hover:text-text-primary transition-colors"
          >
            {t('footer.bugReport')}
          </a>
          <a
            href="https://x.com/fesyukijp"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={t('footer.twitterAriaLabel')}
            className="hover:text-text-primary transition-colors"
          >
            {t('footer.twitter')}
          </a>
        </div>
      </div>
    </footer>
  )
}
