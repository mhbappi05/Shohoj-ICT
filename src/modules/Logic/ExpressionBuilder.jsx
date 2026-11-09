import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Circuit from '../../components/Circuit';
import ExpressionInput from '../../components/ExpressionInput';
import InputToggles from '../../components/InputToggles';
import Segmented from '../../components/Segmented';
import SimplifySteps from '../../components/SimplifySteps';
import TruthTable from '../../components/TruthTable';
import { parseExpression, circuitFromAst } from '../../lib/expression';
import { simplify, ppN } from '../../lib/simplify';
import { evalCircuit, buildTable, activeRow } from '../../lib/logic';
import { track } from '../../analytics';

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
  const [text, setText] = useState('A·B + A·B′ + C');
  const [merge, setMerge] = useState(true);
  const [view, setView] = useState('simplified');
  const [vals, setVals] = useState({});

  const parsed = useMemo(() => {
    try {
      return { ast: parseExpression(text) };
    } catch (e) {
      return { error: e && e.code ? e : { code: 'unknown' } };
    }
  }, [text]);

  const simp = useMemo(() => (parsed.ast ? simplify(parsed.ast) : null), [parsed.ast]);

  // Draw the simplified circuit when there is one (the user can switch back)
  const shownAst = simp ? (simp.changed && view === 'simplified' ? simp.finalBinary : parsed.ast) : null;
  const circuit = useMemo(() => (shownAst ? circuitFromAst(shownAst, { merge }) : null), [shownAst, merge]);
  const table = useMemo(() => (circuit ? buildTable(circuit) : null), [circuit]);

  const names = circuit ? circuit.inputs.filter((i) => i.fixed === undefined).map((i) => i.id) : [];
  const values = Object.fromEntries(names.map((n) => [n, vals[n] ? 1 : 0]));
  const result = circuit ? evalCircuit(circuit, values) : null;
  const rootId = circuit ? circuit.outputs[0].from : null;
  const y = result ? result.outVals.Y : null;
  const toggle = (n) => setVals((v) => ({ ...v, [n]: v[n] ? 0 : 1 }));

  // Anonymous usage tracking, only after the user stops typing
  useEffect(() => {
    if (!simp) return undefined;
    const id = setTimeout(
      () => track('code_executed', { language_type: 'Boolean_Expression', program_preset: ppN(simp.orig) }),
      1500
    );
    return () => clearTimeout(id);
  }, [simp]);

  return (
    <section className="space-y-4">
      <ExpressionInput value={text} onChange={setText} />

      {parsed.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {t(`logic.expr.errors.${parsed.error.code}`, { ch: parsed.error.ch, pos: parsed.error.pos })}
        </p>
      )}

      {simp && (
        <>
          <div className="rounded-lg border border-line bg-white p-4">
            <div className="text-sm text-ink/70">{t('logic.expr.readAs')}</div>
            <div className="break-words font-mono text-lg font-bold">Y = {ppN(simp.orig)}</div>
          </div>

          <SimplifySteps simp={simp} />

          {simp.changed && (
            <Segmented
              options={[
                { value: 'simplified', label: t('logic.simplify.viewSimplified') },
                { value: 'original', label: t('logic.simplify.viewOriginal') },
              ]}
              value={view}
              onChange={setView}
              label="Circuit"
            />
          )}

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
                <li className="font-bold">Y = {ppN(simp.changed && view === 'simplified' ? simp.final : simp.orig)} = {y}</li>
              ) : (
                circuit.gates.map((g) => {
                  const v = g.in.map((i) => result.nodeVals[i]);
                  return (
                    <li key={g.id} className={`break-words ${g.id === rootId ? 'font-bold text-signal' : ''}`}>
                      {g.expr} = {gateBody(g, v)} = {result.nodeVals[g.id]}
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