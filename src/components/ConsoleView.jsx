import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

/** Terminal-style output. When the program waits for scanf, an input box appears. */
export default function ConsoleView({ out, waiting, onSubmit }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    if (waiting && ref.current) ref.current.focus();
  }, [waiting]);

  const send = () => {
    onSubmit(text);
    setText('');
  };

  return (
    <div className="space-y-2 rounded-lg border border-line bg-white p-4">
      <h3 className="font-semibold">{t('c.consoleTitle')}</h3>
      <div
        className="max-h-56 min-h-[88px] overflow-auto whitespace-pre-wrap break-words rounded-md bg-ink p-3 font-mono text-sm text-white"
        role="log"
        aria-live="polite"
      >
        {out}
        {waiting && <span className="animate-pulse">▌</span>}
      </div>
      {waiting && onSubmit && (
        <div className="flex gap-2">
          <input
            ref={ref}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
            placeholder={t('c.typeHere', { names: waiting.names })}
            className="min-w-0 flex-1 rounded-md border-2 border-signal bg-white px-3 py-3 font-mono text-base"
            autoCapitalize="off"
            autoCorrect="off"
            autoComplete="off"
            spellCheck={false}
          />
          <button type="button" onClick={send} className="h-12 shrink-0 rounded-md bg-signal px-4 font-semibold text-white">
            {t('c.send')}
          </button>
        </div>
      )}
    </div>
  );
}