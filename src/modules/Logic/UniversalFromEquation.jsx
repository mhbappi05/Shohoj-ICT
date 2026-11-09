import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Circuit from '../../components/Circuit';
import ExpressionInput from '../../components/ExpressionInput';
import InputToggles from '../../components/InputToggles';
import Segmented from '../../components/Segmented';
import SimplifySteps from '../../components/SimplifySteps';
import TruthTable from '../../components/TruthTable';
import { parseExpression } from '../../lib/expression';
import { simplify, ppN, toBinary } from '../../lib/simplify';
import { buildUniversal, bestUniversal } from '../../lib/universal';
import { evalCircuit, buildTable, activeRow } from '../../lib/logic';
import { track } from '../../analytics';

export default function UniversalFromEquation() {
  const { t } = useTranslation();
  const [text, setText] = useState('A·B + A·B′ + C′');
  const [base, setBase] = useState('NAND');
  const [vals, setVals] = useState({});

  const parsed = useMemo(() => {
    try {
      return { ast: parseExpression(text) };
    } catch (e) {
      return { error: e && e.code ? e : { code: 'unknown' } };
    }
  }, [text]);

  const simp = useMemo(() => (parsed.ast ? simplify(parsed.ast) : null), [parsed.ast]);
  const built = useMemo(() => (simp ? bestUniversal(simp.forms, base) : null), [simp, base]);
  const plain = useMemo(() => (simp ? buildUniversal(toBinary(simp.orig), base) : null), [simp, base]);

  const circuit = built ? built.circuit : null;
  const table = useMemo(() => (circuit ? buildTable(circuit) : null), [circuit]);
  const names = circuit ? circuit.inputs.filter((i) => i.fixed === undefined).map((i) => i.id) : [];
  const values = Object.fromEntries(names.map((n) => [n, vals[n] ? 1 : 0]));
  const y = circuit ? evalCircuit(circuit, values).outVals.Y : null;
  const toggle = (n) => setVals((v) => ({ ...v, [n]: v[n] ? 0 : 1 }));

  const pickBase = (b) => {
    setBase(b);
    track('module_opened', { module_name: 'Logic Gates', topic: `Universal from equation: ${b}` });
  };

  return (
    <section className="space-y-4">
      <ExpressionInput id="expr-universal" value={text} onChange={setText} />

      {parsed.error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          {t(`logic.expr.errors.${parsed.error.code}`, { ch: parsed.error.ch, pos: parsed.error.pos })}
        </p>
      )}

      {simp && (
        <>
          <SimplifySteps simp={simp} />

          <div className="space-y-1">
            <div className="text-sm font-medium">{t('logic.uni.use')}</div>
            <Segmented
              options={['NAND', 'NOR'].map((g) => ({ value: g, label: g }))}
              value={base}
              onChange={pickBase}
              label="Gate family"
            />
          </div>

          <div className="rounded-lg border border-line bg-white p-4">
            <div className="text-sm text-ink/70">{t('logic.uni.form')}</div>
            <div className="break-words font-mono text-lg font-bold">Y = {ppN(built.node)}</div>
            {built.id === 'sop' && <p className="mt-1 text-sm text-ink/70">{t('logic.uni.formSop', { base })}</p>}
            {built.id === 'pos' && <p className="mt-1 text-sm text-ink/70">{t('logic.uni.formPos', { base })}</p>}
          </div>

          <div className="rounded-lg border border-line bg-white p-3 sm:p-4">
            <Circuit circuit={circuit} values={values} label={t('logic.circuitLabel')} />
            {circuit.width > 440 && <p className="mt-1 text-xs text-ink/60">{t('logic.expr.swipe')}</p>}
            <p className="mt-2 text-sm font-semibold">
              {built.gateCount === 0 ? t('logic.uni.noGates') : t('logic.uni.count', { n: built.gateCount, base })}
            </p>
            {plain.gateCount > built.gateCount && (
              <p className="text-sm text-signal">{t('logic.uni.without', { n: plain.gateCount })}</p>
            )}
            <p className="mt-2 text-xs text-ink/60">{t(`logic.uni.how.${base}`)}</p>
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
            <h3 className="mb-2 font-semibold">{t('logic.truthTable')}</h3>
            <TruthTable {...table} active={activeRow(names, values)} />
          </div>
        </>
      )}
    </section>
  );
}