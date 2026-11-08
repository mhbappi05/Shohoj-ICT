import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Circuit from '../../components/Circuit';
import InputToggles from '../../components/InputToggles';
import Segmented from '../../components/Segmented';
import TruthTable from '../../components/TruthTable';
import { buildTable, activeRow, gateEval } from '../../lib/logic';
import { universal } from '../../lib/circuits';
import { track } from '../../analytics';

export default function UniversalGates() {
  const { t } = useTranslation();
  const [base, setBase] = useState('NAND');
  const [target, setTarget] = useState('AND');
  const [vals, setVals] = useState({ A: 1, B: 1 });

  const circuit = useMemo(() => universal(base, target), [base, target]);
  const table = useMemo(() => buildTable(circuit), [circuit]);
  const names = circuit.inputs.map((i) => i.id);
  const active = activeRow(names, vals);
  const toggle = (n) => setVals((v) => ({ ...v, [n]: v[n] ? 0 : 1 }));
  const matches = table.rows.every((r) => r.outs[0] === gateEval(target, r.ins));

  const change = (setter, key) => (v) => {
    setter(v);
    track('module_opened', { module_name: 'Logic Gates', topic: `Universal ${key}: ${v}` });
  };

  return (
    <section className="space-y-4">
      <p className="text-sm text-ink/80">{t('logic.universal.intro')}</p>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <div className="text-sm font-medium">{t('logic.universal.base')}</div>
          <Segmented
            options={['NAND', 'NOR'].map((g) => ({ value: g, label: g }))}
            value={base} onChange={change(setBase, 'base')} label="Base gate"
          />
        </div>
        <div className="space-y-1">
          <div className="text-sm font-medium">{t('logic.universal.target')}</div>
          <Segmented
            options={['NOT', 'AND', 'OR'].map((g) => ({ value: g, label: g }))}
            value={target} onChange={change(setTarget, 'target')} label="Target gate"
          />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-white p-3 sm:p-4">
        <Circuit circuit={circuit} values={vals} label={t('logic.circuitLabel')} />
        <p className="mt-2 text-sm text-ink/80">{t(`logic.universal.how.${base}_${target}`)}</p>
      </div>

      <div className="space-y-2">
        <p className="text-sm text-ink/70">{t('logic.tapHint')}</p>
        <InputToggles names={names} values={vals} onToggle={toggle} />
      </div>

      <div className="rounded-lg border border-line bg-white p-4">
        <h3 className="mb-2 font-semibold">{t('logic.truthTable')}</h3>
        <TruthTable {...table} active={active} />
        {matches && <p className="mt-3 text-sm text-signal">{t('logic.universal.matches', { gate: target })}</p>}
      </div>
    </section>
  );
}