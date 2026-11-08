import { useTranslation } from 'react-i18next';
import { track } from '../analytics';

export default function LanguageToggle() {
  const { i18n } = useTranslation();
  const current = i18n.resolvedLanguage;

  const choose = (lng) => {
    if (lng === current) return;
    i18n.changeLanguage(lng);
    track('language_changed', { language: lng.toUpperCase() });
  };

  const base = 'px-3 py-1 text-sm font-medium transition-colors';
  return (
    <div className="inline-flex overflow-hidden rounded-md border border-ink/20" role="group" aria-label="Language">
      <button onClick={() => choose('en')} aria-pressed={current === 'en'}
        className={`${base} ${current === 'en' ? 'bg-ink text-white' : 'bg-white text-ink'}`}>EN</button>
      <button onClick={() => choose('bn')} aria-pressed={current === 'bn'}
        className={`${base} ${current === 'bn' ? 'bg-ink text-white' : 'bg-white text-ink'}`}>বাং</button>
    </div>
  );
}
