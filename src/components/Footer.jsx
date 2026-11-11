import { useTranslation } from 'react-i18next';
import { Activity, ArrowUp, Lock } from 'lucide-react';
import { analyticsEnabled } from '../analytics';

const FEEDBACK_URL = import.meta.env.VITE_FEEDBACK_URL;

// "ICT" as the 8-bit ASCII codes a computer really stores
const BITS = [...'ICT'].map((ch) => ({ ch, bits: ch.charCodeAt(0).toString(2).padStart(8, '0') }));

const grid = {
  backgroundImage:
    'linear-gradient(to right, rgba(255,255,255,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.05) 1px, transparent 1px)',
  backgroundSize: '24px 24px',
};

function BitSign() {
  const { t } = useTranslation();
  return (
    <div className="mt-6 md:mt-0">
      <div className="flex gap-3" aria-hidden="true">
        {BITS.map(({ ch, bits }) => (
          <div key={ch} className="flex flex-col items-center gap-1">
            <div className="flex gap-[2px]">
              {[...bits].map((b, i) => (
                <span
                  key={i}
                  className={`h-2 w-2 rounded-[2px] md:h-2.5 md:w-2.5 ${b === '1' ? 'bg-signal' : 'border border-white/30'}`}
                />
              ))}
            </div>
            <span className="font-mono text-[10px] text-white/50">{ch}</span>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px] text-white/50">{t('footer.bitsNote')}</p>
    </div>
  );
}

export default function Footer({ modules, currentKey, onSelect }) {
  const { t } = useTranslation();
  const year = new Date().getFullYear();
  const top = () => window.scrollTo({ top: 0, behavior: 'smooth' });

  return (
    <footer className="mt-10 border-t-4 border-signal bg-ink text-white" style={grid}>
      <div className="mx-auto max-w-4xl px-4 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-10">
        {/* brand */}
        <div className="md:flex md:items-end md:justify-between md:gap-10">
          <div>
            <div className="text-2xl font-bold tracking-tight">{t('app.title')}</div>
            <p className="mt-2 max-w-sm text-sm leading-relaxed text-white/70">{t('footer.about')}</p>
          </div>
          <BitSign />
        </div>

        {/* chapters */}
        <nav className="mt-8" aria-label={t('footer.chapters')}>
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-widest text-white/50">{t('footer.chapters')}</h2>
          <ul className="grid grid-cols-2 gap-2 md:grid-cols-5">
            {modules.map((m, i) => {
              const index = String(i + 1).padStart(2, '0');
              const current = m.key === currentKey;
              const base = 'flex min-h-[56px] w-full items-center gap-3 rounded-lg border px-3 py-2 text-left';
              return (
                <li key={m.key}>
                  {m.ready ? (
                    <button
                      type="button"
                      onClick={() => { onSelect(m); top(); }}
                      aria-current={current ? 'page' : undefined}
                      className={`${base} transition-colors ${
                        current ? 'border-signal bg-signal/15' : 'border-white/15 bg-white/5 active:bg-white/15'
                      }`}
                    >
                      <span className={`font-mono text-xs ${current ? 'text-white' : 'text-signal'}`}>{index}</span>
                      <span className="text-sm leading-snug">{t(`nav.${m.key}`)}</span>
                    </button>
                  ) : (
                    <div className={`${base} border-dashed border-white/15 text-white/40`} aria-disabled="true">
                      <span className="font-mono text-xs">{index}</span>
                      <span className="text-sm leading-snug">
                        {t(`nav.${m.key}`)}
                        <span className="ml-1 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] uppercase">{t('nav.soon')}</span>
                      </span>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </nav>

        {/* small print */}
        <div className="mt-8 flex items-end justify-between gap-4 border-t border-white/10 pt-4">
          <div className="space-y-1.5 text-xs leading-relaxed text-white/60">
            <p className="flex items-start gap-2">
              <Lock size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
              {t('footer.private')}
            </p>
            {analyticsEnabled && (
              <p className="flex items-start gap-2">
                <Activity size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
                {t('footer.analytics')}
              </p>
            )}
            {FEEDBACK_URL && (
              <p>
                <a href={FEEDBACK_URL} target="_blank" rel="noopener noreferrer" className="font-medium text-white underline underline-offset-2">
                  {t('footer.feedback')}
                </a>
              </p>
            )}
            <p className="pt-1 text-white/50">{t('footer.rights', { year })}</p>
          </div>

          <button
            type="button"
            onClick={top}
            aria-label={t('footer.top')}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-signal text-white transition-opacity active:opacity-80"
          >
            <ArrowUp size={22} />
          </button>
        </div>
      </div>
    </footer>
  );
}