import { useTranslation } from 'react-i18next';
import { ArrowUp } from 'lucide-react';
import { analyticsEnabled } from '../analytics';

const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL;

export default function Footer({ modules, currentKey, onSelect }) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="mt-8 border-t border-line bg-white pb-[max(1.5rem,env(safe-area-inset-bottom))]">
      <div className="mx-auto max-w-4xl space-y-6 px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-lg font-bold">{t('app.title')}</div>
            <p className="mt-1 max-w-sm text-sm text-ink/70">{t('footer.about')}</p>
          </div>
          <button
            type="button"
            onClick={top}
            aria-label={t('footer.top')}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-ink/20 bg-white active:bg-ink active:text-white"
          >
            <ArrowUp size={20} />
          </button>
        </div>

        <nav aria-label={t('footer.chapters')}>
          <div className="mb-1 text-sm font-semibold">{t('footer.chapters')}</div>
          <ul className="grid grid-cols-2 gap-x-4 sm:grid-cols-3">
            {modules.map((m) => (
              <li key={m.key}>
                {m.ready ? (
                  <button
                    type="button"
                    onClick={() => { onSelect(m); top(); }}
                    aria-current={m.key === currentKey ? 'page' : undefined}
                    className={`min-h-[44px] w-full text-left text-sm ${m.key === currentKey ? 'font-semibold text-signal' : 'text-ink/80'}`}
                  >
                    {t(`nav.${m.key}`)}
                  </button>
                ) : (
                  <span className="flex min-h-[44px] items-center text-sm text-ink/40">
                    {t(`nav.${m.key}`)} · {t('nav.soon')}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="space-y-1 border-t border-line pt-4 text-xs text-ink/60">
          <p>{t('footer.private')}</p>
          {analyticsEnabled && <p>{t('footer.analytics')}</p>}
          {FEEDBACK_URL && (
            <p>
              <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-signal underline">
                {t('footer.feedback')}
              </a>
            </p>
          )}
          <p className="pt-2">{t('footer.rights', { year })}</p>
        </div>
      </div>
    </footer>
  );
}