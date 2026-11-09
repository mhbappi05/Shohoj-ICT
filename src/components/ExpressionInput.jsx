import { useRef } from 'react';
import { useTranslation } from 'react-i18next';

const EXAMPLES = [
  'A·B + A·B′ + C',
  '(A + B)·(A + C)',
  'A·B + A′·C + B·C',
  'A + A′·B',
  '((A + B)′ + C)′',
  'A ⊕ B',
];
const KEYS = ['A', 'B', 'C', 'D', '(', ')', '·', '+', '′', '⊕'];

const keyBtn =
  'h-11 rounded-md border border-ink/20 bg-white font-mono text-lg font-medium active:bg-ink active:text-white';

/** Text field + on-screen keys (phone keyboards lack · ′ ⊕) + example chips. */
export default function ExpressionInput({ value, onChange, id = 'expr' }) {
  const { t } = useTranslation();
  const inputRef = useRef(null);

  // Edit at the cursor without closing the phone keyboard
  const edit = (fn) => {
    const el = inputRef.current;
    const a = el ? el.selectionStart : value.length;
    const b = el ? el.selectionEnd : value.length;
    const { value: next, caret } = fn(value, a, b);
    onChange(next);
    requestAnimationFrame(() => {
      if (el) { el.focus(); el.setSelectionRange(caret, caret); }
    });
  };
  const insert = (s) => edit((v, a, b) => ({ value: v.slice(0, a) + s + v.slice(b), caret: a + s.length }));
  const backspace = () =>
    edit((v, a, b) =>
      a !== b ? { value: v.slice(0, a) + v.slice(b), caret: a }
      : a > 0 ? { value: v.slice(0, a - 1) + v.slice(a), caret: a - 1 }
      : { value: v, caret: 0 }
    );
  const keep = (e) => e.preventDefault(); // stops a button from stealing focus

  return (
    <div className="space-y-3 rounded-lg border border-line bg-white p-4">
      <label htmlFor={id} className="text-sm font-medium">{t('logic.expr.label')}</label>
      <div className="flex items-center gap-2">
        <span className="font-mono text-lg font-bold">Y =</span>
        <input
          id={id}
          ref={inputRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="min-w-0 flex-1 rounded-md border border-ink/20 bg-white px-3 py-3 font-mono text-lg focus:border-signal"
          autoCapitalize="characters"
          autoCorrect="off"
          autoComplete="off"
          spellCheck={false}
          inputMode="text"
          placeholder="A·B + C′"
        />
      </div>

      <p className="text-xs text-ink/60">{t('logic.expr.keysHint')}</p>
      <div className="grid grid-cols-6 gap-2">
        {KEYS.map((k) => (
          <button key={k} type="button" className={keyBtn} onMouseDown={keep} onClick={() => insert(k)}>{k}</button>
        ))}
        <button type="button" className={keyBtn} onMouseDown={keep} onClick={backspace} aria-label={t('logic.expr.delete')}>⌫</button>
        <button type="button" className={`${keyBtn} font-sans text-sm`} onMouseDown={keep} onClick={() => onChange('')}>{t('logic.expr.clear')}</button>
      </div>

      <div>
        <div className="mb-1 text-sm font-medium">{t('logic.expr.examples')}</div>
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
          <div className="flex gap-2 whitespace-nowrap">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => onChange(ex)}
                className="min-h-[40px] rounded-full border border-ink/20 bg-white px-4 font-mono text-sm"
              >
                {ex}
              </button>
            ))}
          </div>
        </div>
      </div>

      <details className="text-sm">
        <summary className="cursor-pointer font-medium">{t('logic.expr.syntax.title')}</summary>
        <ul className="mt-2 space-y-1 text-ink/80">
          {['and', 'or', 'not', 'xor', 'brackets', 'consts', 'rules'].map((k) => (
            <li key={k}>{t(`logic.expr.syntax.${k}`)}</li>
          ))}
        </ul>
      </details>
    </div>
  );
}