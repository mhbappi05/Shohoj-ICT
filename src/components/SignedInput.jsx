import { useId } from 'react';
import { useTranslation } from 'react-i18next';

/** Integer input with a ± button, because phone number pads often have no minus key. */
export default function SignedInput({ label, value, onChange, error }) {
  const { t } = useTranslation();
  const id = useId();

  const toggle = () => {
    const v = value.trim();
    onChange(v.startsWith('-') ? v.slice(1) : '-' + v);
  };

  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-sm font-medium">{label}</label>
      <div className="flex gap-2">
        <input
          id={id}
          className="min-w-0 flex-1 rounded-md border border-ink/20 bg-white px-3 py-2.5 font-mono text-base focus:border-signal"
          value={value}
          inputMode="numeric"
          maxLength={8}
          onChange={(e) => onChange(e.target.value)}
        />
        <button
          type="button"
          onClick={toggle}
          aria-label={t('arith.toggleSign')}
          className="h-11 w-11 shrink-0 rounded-md border border-ink/20 bg-white text-lg font-bold hover:bg-ink hover:text-white"
        >
          ±
        </button>
      </div>
      {error && <span className="text-sm text-red-700" role="alert">{error}</span>}
    </div>
  );
}