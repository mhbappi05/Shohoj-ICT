import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Circuit from '../../components/Circuit';
import InputToggles from '../../components/InputToggles';
import Segmented from '../../components/Segmented';
import TruthTable from '../../components/TruthTable';
import { buildTable, activeRow, evalCircuit } from '../../lib/logic';
import { halfAdder, fullAdder } from '../../lib/circuits';
import { track } from '../../analytics';

export default function Adders() {
  const { t } = useTranslation();
  const [kind, setKind] = useState('half');
  const [vals, setVals] = useState({ A: 1, B: 1, Cin: 0 });

  const circuit = useMemo(() => (kind === 'half' ? halfAdder() : fullAdder()), [kind]);
  const table = useMemo(() => buildTable(circuit), [circuit]);
  const names = circuit.inputs.map((i) => i.id);
  const active = activeRow(names, vals);
  const toggle = (n) => setVals((v) => ({ ...v, [n]: v[n] ? 0 : 1 }));

  const { outVals } = evalCircuit(circuit, vals);
  const total = names.reduce((s, n) => s + (vals[n] ? 1 : 0), 0);
  const summary =
    kind === 'half'
      ? t('logic.adders.halfTotal', { a: vals.A ? 1 : 0, b: vals.B ? 1 : 0, value: total.toString(2), sum: outVals.Sum, carry: outVals.Carry })
      : t('logic.adders.fullTotal', { a: vals.A ? 1 : 0, b: vals.B ? 1 : 0, c: vals.Cin ? 1 : 0, value: total.toString(2), sum: outVals.Sum, carry: outVals.Cout });

  const pick = (k) => {
    setKind(k);
    track('module_opened', { module_name: 'Logic Gates', topic: k === 'half' ? 'Half Adder' : 'Full Adder' });
  };

  return (
    <section className="space-y-4">
      <Segmented
        options={[
          { value: 'half', label: t('logic.adders.half') },
          { value: 'full', label: t('logic.adders.full') },
        ]}
        value={kind} onChange={pick} label="Adder"
      />

      <p className="text-sm text-ink/80">{kind === 'half' ? t('logic.adders.halfNote') : t('logic.adders.fullNote')}</p>

      <div className="rounded-lg border border-line bg-white p-3 sm:p-4">
        <Circuit circuit={circuit} values={vals} label={t('logic.circuitLabel')} />
      </div>

      <div className="space-y-2">
        <p className="text-sm text-ink/70">{t('logic.tapHint')}</p>
        <InputToggles names={names} values={vals} onToggle={toggle} />
        <p className="font-mono text-sm font-bold">{summary}</p>
      </div>

      <div className="rounded-lg border border-line bg-white p-4">
        <h3 className="mb-2 font-semibold">{t('logic.truthTable')}</h3>
        <TruthTable {...table} active={active} />
      </div>
    </section>
  );
}