import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import InputToggles from '../../components/InputToggles';
import Segmented from '../../components/Segmented';
import { track } from '../../analytics';

const KINDS = {
  decoder2: { type: 'decoder', n: 2 },
  decoder3: { type: 'decoder', n: 3 },
  encoder4: { type: 'encoder', n: 2 },
  encoder8: { type: 'encoder', n: 3 },
};

function Lamp({ label, on }) {
  return (
    <div
      className={`flex h-14 flex-col items-center justify-center rounded-lg border-2 font-mono transition-colors duration-300 ${
        on ? 'border-signal bg-signal text-white' : 'border-line bg-white text-ink/60'
      }`}
    >
      <span className="text-xs">{label}</span>
      <span className="text-xl font-bold leading-none">{on ? 1 : 0}</span>
    </div>
  );
}

function Decoder({ n }) {
  const { t } = useTranslation();
  const lines = 2 ** n;
  const names = [...Array(n)].map((_, i) => `A${n - 1 - i}`);
  const [bits, setBits] = useState(Array(n).fill(0));
  const value = parseInt(bits.join(''), 2);
  const values = Object.fromEntries(names.map((nm, i) => [nm, bits[i]]));
  const toggle = (nm) => {
    const i = names.indexOf(nm);
    setBits((b) => b.map((x, k) => (k === i ? 1 - x : x)));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">{t('logic.encdec.decoderHint')}</p>
      <InputToggles names={names} values={values} onToggle={toggle} />
      <div className="grid grid-cols-4 gap-2">
        {[...Array(lines)].map((_, k) => <Lamp key={k} label={`D${k}`} on={k === value} />)}
      </div>
      <p className="font-mono text-sm font-bold">{t('logic.encdec.decoderResult', { bits: bits.join(''), n: value })}</p>
      <table className="w-full text-center font-mono text-sm">
        <thead>
          <tr className="text-ink/70">
            <th className="px-2 py-2 font-medium">{names.join(' ')}</th>
            <th className="border-l-2 border-line px-2 py-2 font-medium">{t('logic.encdec.outputLine')}</th>
          </tr>
        </thead>
        <tbody>
          {[...Array(lines)].map((_, k) => (
            <tr key={k} className={`border-t border-line ${k === value ? 'bg-signal/10 font-bold' : ''}`}>
              <td className="px-2 py-2">{k.toString(2).padStart(n, '0').split('').join(' ')}</td>
              <td className={`border-l-2 border-line px-2 py-2 ${k === value ? 'text-signal' : ''}`}>D{k}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Encoder({ n }) {
  const { t } = useTranslation();
  const lines = 2 ** n;
  const names = [...Array(lines)].map((_, k) => `I${k}`);
  const [sel, setSel] = useState(null);
  const value = sel ?? 0;
  const bits = value.toString(2).padStart(n, '0');
  const values = Object.fromEntries(names.map((nm, k) => [nm, k === sel ? 1 : 0]));
  const toggle = (nm) => {
    const k = parseInt(nm.slice(1), 10);
    setSel((s) => (s === k ? null : k));
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-ink/70">{t('logic.encdec.encoderHint')}</p>
      <InputToggles names={names} values={values} onToggle={toggle} />
      <div className={`grid gap-2 ${n === 2 ? 'grid-cols-2' : 'grid-cols-3'}`}>
        {[...bits].map((b, i) => <Lamp key={i} label={`Y${n - 1 - i}`} on={b === '1'} />)}
      </div>
      <p className="font-mono text-sm font-bold">
        {sel === null
          ? t('logic.encdec.noInput', { bits })
          : t('logic.encdec.encoderResult', { n: sel, bits })}
      </p>
      <table className="w-full text-center font-mono text-sm">
        <thead>
          <tr className="text-ink/70">
            <th className="px-2 py-2 font-medium">{t('logic.encdec.activeInput')}</th>
            <th className="border-l-2 border-line px-2 py-2 font-medium">
              {[...Array(n)].map((_, i) => `Y${n - 1 - i}`).join(' ')}
            </th>
          </tr>
        </thead>
        <tbody>
          {[...Array(lines)].map((_, k) => (
            <tr key={k} className={`border-t border-line ${k === sel ? 'bg-signal/10 font-bold' : ''}`}>
              <td className="px-2 py-2">I{k}</td>
              <td className={`border-l-2 border-line px-2 py-2 ${k === sel ? 'text-signal' : ''}`}>
                {k.toString(2).padStart(n, '0').split('').join(' ')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function EncoderDecoder() {
  const { t } = useTranslation();
  const [kind, setKind] = useState('decoder2');
  const cfg = KINDS[kind];

  const pick = (k) => {
    setKind(k);
    track('module_opened', { module_name: 'Logic Gates', topic: k });
  };

  return (
    <section className="space-y-4">
      <Segmented
        options={Object.keys(KINDS).map((k) => ({ value: k, label: t(`logic.encdec.${k}`) }))}
        value={kind} onChange={pick} label="Encoder or decoder"
      />
      <div className="rounded-lg border border-line bg-white p-4">
        {cfg.type === 'decoder'
          ? <Decoder key={kind} n={cfg.n} />
          : <Encoder key={kind} n={cfg.n} />}
      </div>
    </section>
  );
}