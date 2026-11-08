import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Circuit from '../../components/Circuit';
import InputToggles from '../../components/InputToggles';
import TruthTable from '../../components/TruthTable';
import { parseExpression, circuitFromAst, pp } from '../../lib/expression';
import { evalCircuit, buildTable, activeRow } from '../../lib/logic';
import { track } from '../../analytics';

const EXAMPLES = ['A·B + C′', '(A + B)·C′', 'A ⊕ B', '(A·B)′', 'A·B + A′·C', 'A·B + B·C + A·C'];
const KEYS = ['A', 'B', 'C', 'D', '(', ')', '·', '+', '′', '⊕'];

const keyBtn =
  'h-11 rounded-md border border-ink/20 bg-white font-mono text-lg font-medium active:bg-ink active:text-white';

/** The calculation for one gate with the current input values substituted. */
function gateBody(g, v) {
  switch (g.type) {
    case 'AND': return `${v[0]} · ${v[1]}`;
    case 'OR': return `${v[0]} + ${v[1]}`;
    case 'XOR': return `${v[0]} ⊕ ${v[1]}`;
    case 'NAND': return `(${v[0]} · ${v[1]})′`;
    case 'NOR': return `(${v[0]} + ${v[1]})′`;
    case 'XNOR': return `(${v[0]} ⊕ ${v[1]})′`;
    default: return `${v[0]}′`;
  }
}

export default function ExpressionBuilder() {
  const { t } = useTranslation();
  const [text, setText] = useState('A·B + C′');
  const [merge, setMerge] = useState(true);
  const [vals, setVals] = useState({});
  const inputRef = useRef(null);

  const parsed = useMemo(() => {
    try {
      const ast = parseExpression(text);
      return { ast, circuit: circuitFromAst(ast, { merge }), pretty: pp(ast) };
    } catch (e) {
      return { error: e && e.code ? e : { code: 'unknown' } };
    }
  }, [text, merge]);

  const circuit = parsed.circuit;
  const table = useMemo(() => (circuit ? buildTable(circuit) : null), [circuit]);
  const names = circuit ? circuit.inputs.filter((i) => i.fixed === undefined).map((i) => i.id) : [];
  const values = Object.fromEntries(names.map((n) => [n, vals[n] ? 1 : 0]));
  const evalResult = circuit ? evalCircuit(circuit, values) : null;

  // Anonymous usage tracking, only after the user stops typing
  useEffect(() => {
    if (!circuit) return undefined;
    const id = setTimeout(
      () => track('code_executed', { language_type: 'Boolean_Expression', program_preset: parsed.pretty }),
      1500
    );
    return () => clearTimeout(id);
  }, [parsed.pretty]);

  // Insert at the cursor without closing the phone keyboard
  const edit = (fn) => {
    const el = inputRef.current;
    const a = el ? el.selectionStart : text.length;
    const b = el ? el.selectionEnd : text.length;
    const { value, caret } = fn(text, a, b);
    setText(value);
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
  const keep = (e) => e.preventDefault(); // stops the button from stealing focus
  const toggle = (n) => setVals((v) => ({ ...v, [n]: v[n] ? 0 : 1 }));

  const rootId = circuit ? circuit.outputs[0].from : null;
  const y = evalResult ? evalResult.outVals.Y : null;

  return (
    <section className="space-y-4">
      {/* Input */}
      <div className="space-y-3 rounded-lg border border-line bg-white p-4">
        <label htmlFor="expr" className="text-sm font-medium">{t('logic.expr.label')}</label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-lg font-bold">Y =</span>
          <input
            id="expr"
            ref={inputRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
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
          <button type="button" className={`${keyBtn} font-sans text-sm`} onMouseDown={keep} onClick={() => setText('')}>{t('logic.expr.clear')}</button>
        </div>

        <div>
          <div className="mb-1 text-sm font-medium">{t('logic.expr.examples')}</div>
          <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
            <div className="flex gap-2 whitespace-nowrap">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => setText(ex)}
                  className="min-h-[40px] rounded-full border border-ink/20 bg-white px-4 font-mono text-sm"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <details className="rounded-lg border border-line bg-white p-4 text-sm">
        <summary className="cursor-pointer font-medium">{t('logic.expr.syntax.title')}</summary>
        <ul className="mt-2 space-y-1 text-ink/80">
          {['and', 'or', 'not', 'xor', 'brackets', 'consts', 'rules'].map((k) => (
            <li key={k}>{t(`logic.expr.syntax.${k}`)}</li>
          ))}
        </ul>
      </details>

      {parsed.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {t(`logic.expr.errors.${parsed.error.code}`, { ch: parsed.error.ch, pos: parsed.error.pos })}
        </p>
      )}

      {circuit && (
        <>
          <div className="rounded-lg border border-line bg-white p-4">
            <div className="text-sm text-ink/70">{t('logic.expr.readAs')}</div>
            <div className="break-words font-mono text-lg font-bold">Y = {parsed.pretty}</div>
          </div>

          <div className="rounded-lg border border-line bg-white p-3 sm:p-4">
            <Circuit circuit={circuit} values={values} label={t('logic.circuitLabel')} />
            {circuit.width > 440 && <p className="mt-1 text-xs text-ink/60">{t('logic.expr.swipe')}</p>}
            <label className="mt-3 flex min-h-[44px] items-center gap-3 text-sm">
              <input type="checkbox" className="h-5 w-5 accent-signal" checked={merge} onChange={(e) => setMerge(e.target.checked)} />
              {t('logic.expr.merge')}
            </label>
            <p className="text-xs text-ink/60">{t('logic.expr.chainNote')}</p>
          </div>

          {names.length > 0 && (
            <div className="space-y-2">
              <p className="text-sm text-ink/70">{t('logic.tapHint')}</p>
              <InputToggles names={names} values={values} onToggle={toggle} />
            </div>
          )}
          <p className="font-mono text-sm font-bold">
            {names.length
              ? t('logic.expr.result', { inputs: names.map((n) => `${n} = ${values[n]}`).join(', '), y })
              : t('logic.expr.noInputs')}
          </p>

          <div className="rounded-lg border border-line bg-white p-4">
            <h3 className="mb-2 font-semibold">{t('logic.expr.steps')}</h3>
            <ol className="space-y-1.5 font-mono text-sm">
              {circuit.gates.length === 0 ? (
                <li className="font-bold">Y = {parsed.pretty} = {y}</li>
              ) : (
                circuit.gates.map((g) => {
                  const v = g.in.map((i) => evalResult.nodeVals[i]);
                  return (
                    <li key={g.id} className={`break-words ${g.id === rootId ? 'font-bold text-signal' : ''}`}>
                      {g.expr} = {gateBody(g, v)} = {evalResult.nodeVals[g.id]}
                    </li>
                  );
                })
              )}
            </ol>
          </div>

          <div className="rounded-lg border border-line bg-white p-4">
            <h3 className="mb-2 font-semibold">{t('logic.truthTable')}</h3>
            <TruthTable {...table} active={activeRow(names, values)} />
          </div>
        </>
      )}
    </section>
  );
}