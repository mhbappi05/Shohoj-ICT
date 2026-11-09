import { useRef } from 'react';

/**
 * Textarea with rows of tap-to-insert keys. keyRows = [{ title, items: [{ label, text, back? }] }]
 * `back` moves the caret left of the end of the inserted text (to sit inside a tag pair).
 */
export default function CodeBox({ value, onChange, keyRows = [], rows = 8, label, onRun, onKey }) {
  const ref = useRef(null);

  const insert = (item) => {
    const el = ref.current;
    const a = el ? el.selectionStart : value.length;
    const b = el ? el.selectionEnd : value.length;
    onChange(value.slice(0, a) + item.text + value.slice(b));
    const caret = a + item.text.length - (item.back || 0);
    requestAnimationFrame(() => {
      if (el) { el.focus(); el.setSelectionRange(caret, caret); }
    });
    if (onKey) onKey(item);
  };

  const keep = (e) => e.preventDefault(); // buttons must not steal focus (keeps the keyboard open)

  return (
    <div className="space-y-3">
      <textarea
        ref={ref}
        value={value}
        rows={rows}
        aria-label={label}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (onRun && e.key === 'Enter' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); onRun(); }
        }}
        className="block w-full resize-y rounded-md border border-ink/20 bg-white p-3 font-mono text-base leading-relaxed focus:border-signal"
        spellCheck={false}
        autoCapitalize="off"
        autoCorrect="off"
        autoComplete="off"
      />
      {keyRows.map((row, i) => (
        <div key={i}>
          {row.title && <div className="mb-1 text-xs font-medium text-ink/60">{row.title}</div>}
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
            <div className="flex gap-2 whitespace-nowrap">
              {row.items.map((it, k) => (
                <button
                  key={`${it.label}-${k}`}
                  type="button"
                  onMouseDown={keep}
                  onClick={() => insert(it)}
                  className="min-h-[40px] shrink-0 rounded-md border border-ink/20 bg-white px-3 font-mono text-sm active:bg-ink active:text-white"
                >
                  {it.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}