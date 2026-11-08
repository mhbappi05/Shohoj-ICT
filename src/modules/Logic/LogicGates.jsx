import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Circuit from '../../components/Circuit';
import InputToggles from '../../components/InputToggles';
import Segmented from '../../components/Segmented';
import TruthTable from '../../components/TruthTable';
import { GATES, EXPR, evalCircuit, buildTable, activeRow } from '../../lib/logic';
import { singleGate } from '../../lib/circuits';
import { track } from '../../analytics';

export default function LogicGates() {
  const { t } = useTranslation();
  const [type, setType] = useState('AND');
  const [vals, setVals] = useState({ A: 1, B: 0 });

  const circuit = useMemo(() => singleGate(type), [type]);
  const table = useMemo(() => buildTable(circuit), [circuit]);
  const names = circuit.inputs.map((i) => i.id);
  const active = activeRow(names, vals);
  const toggle = (n) => setVals((v) => ({ ...v, [n]: v[n] ? 0 : 1 }));

  const pick = (g) => {
    setType(g);
    track('module_opened', { module_name: 'Logic Gates', topic: g });
  };

  return (
    <section className="space-y-4">
      <Segmented
        options={GATES.map((g) => ({ value: g, label: g }))}
        value={type}
        onChange={pick}
        label="Gate"
      />

      <div className="rounded-lg border border-line bg-white p-4">
        <p className="text-sm text-ink/80">{t(`logic.desc.${type}`)}</p>
        <p className="mt-1 font-mono text-base font-bold">{EXPR[type]}</p>
      </div>

      <div className="rounded-lg border border-line bg-white p-3 sm:p-4">
        <Circuit circuit={circuit} values={vals} label={t('logic.circuitLabel')} />
      </div>

      <div className="space-y-2">
        <p className="text-sm text-ink/70">{t('logic.tapHint')}</p>
        <InputToggles names={names} values={vals} onToggle={toggle} />
      </div>

      <div className="rounded-lg border border-line bg-white p-4">
        <h3 className="mb-2 font-semibold">{t('logic.truthTable')}</h3>
        <TruthTable {...table} active={active} />
      </div>
    </section>
  );
}