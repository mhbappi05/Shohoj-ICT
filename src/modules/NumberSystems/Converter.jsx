import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { BASES, isValid, toDecimal, fromDecimal, positionalBreakdown, divisionSteps } from '../../lib/numberSystems';
import { track } from '../../analytics';

const field = 'rounded-md border border-ink/20 bg-white px-3 py-2.5 text-base focus:border-signal';

export default function Converter() {
  const { t } = useTranslation();
  const [input, setInput] = useState('1011');
  const [from, setFrom] = useState(2);
  const [to, setTo] = useState(10);

  const clean = input.trim().toUpperCase();
  const valid = isValid(clean, from);
  const dec = valid ? toDecimal(clean, from) : null;
  const result = valid ? fromDecimal(dec, to) : '';
  const rows = valid ? positionalBreakdown(clean, from) : [];
  const divs = valid && to !== 10 ? divisionSteps(dec, to) : [];

  const changeBase = (setter) => (e) => {
    setter(Number(e.target.value));
    track('module_opened', { module_name: 'Number Systems', topic: 'Base Converter' });
  };

  const baseSelect = (value, onChange, label) => (
    <label className="flex flex-col gap-1 text-sm font-medium">
      {label}
      <select className={field} value={value} onChange={onChange}>
        {BASES.map((b) => <option key={b} value={b}>{t(`converter.base${b}`)}</option>)}
      </select>
    </label>
  );

  return (
    <section className="space-y-6">
      <div className="grid grid-cols-2 gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-3 sm:p-5">
        <label className="col-span-2 flex flex-col gap-1 text-sm font-medium sm:col-span-1">
          {t('converter.value')}
          <input
            className={`${field} font-mono`}
            value={input}
            maxLength={32}
            onChange={(e) => setInput(e.target.value)}
            spellCheck={false}
            autoCapitalize="characters"
          />
        </label>
        {baseSelect(from, changeBase(setFrom), t('converter.from'))}
        {baseSelect(to, changeBase(setTo), t('converter.to'))}
        {!valid && (
            <p className="col-span-2 text-sm text-red-700 sm:col-span-3" role="alert">
            {t('converter.invalid', { base: from })}
          </p>
        )}
      </div>

      {valid && (
        <>
          <div className="rounded-lg border-2 border-signal bg-white p-4 sm:p-5">
            <div className="text-sm font-medium text-ink/70">{t('converter.result')}</div>
            <div className="mt-1 break-all font-mono text-2xl font-bold sm:text-3xl">
              {result}<sub className="ml-1 text-base text-ink/60">{to}</sub>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-white p-4 sm:p-5">
            <h3 className="mb-3 font-semibold">{t('converter.positional')}</h3>
            <div className="overflow-x-auto">
              <table className="min-w-full text-center font-mono text-sm">
                <tbody>
                  <tr>
                    <th className="pr-4 text-left font-sans font-medium text-ink/70">{t('converter.digit')}</th>
                    {rows.map((r) => <td key={r.pos} className="px-3 py-1 text-lg font-bold">{r.char}</td>)}
                  </tr>
                  <tr>
                    <th className="pr-4 text-left font-sans font-medium text-ink/70">{t('converter.weight')}</th>
                    {rows.map((r) => <td key={r.pos} className="px-3 py-1">{from}<sup>{r.pos}</sup> = {r.weight.toString()}</td>)}
                  </tr>
                  <tr>
                    <th className="pr-4 text-left font-sans font-medium text-ink/70">{t('converter.product')}</th>
                    {rows.map((r) => <td key={r.pos} className="px-3 py-1 text-signal">{r.value.toString()}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
            <p className="mt-3 font-mono text-sm">
              {t('converter.sum')}: {rows.map((r) => r.value.toString()).join(' + ')} = <b>{dec.toString()}</b>
            </p>
          </div>

          {divs.length > 0 && (
            <div className="rounded-lg border border-line bg-white p-4 sm:p-5">
              <h3 className="mb-3 font-semibold">{t('converter.division', { base: to })}</h3>
              <table className="font-mono text-sm">
                <thead className="font-sans text-ink/70">
                  <tr>
                    <th className="px-3 py-1 text-left font-medium">{t('converter.dividend')}</th>
                    <th className="px-3 py-1 text-left font-medium">{t('converter.quotient')}</th>
                    <th className="px-3 py-1 text-left font-medium">{t('converter.remainder')}</th>
                  </tr>
                </thead>
                <tbody>
                  {divs.map((s, i) => (
                    <tr key={i}>
                      <td className="px-3 py-1">{s.dividend.toString()} ÷ {to}</td>
                      <td className="px-3 py-1">{s.quotient.toString()}</td>
                      <td className="px-3 py-1 font-bold text-signal">{fromDecimal(s.remainder, to)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-3 text-sm text-ink/70">{t('converter.readUp')}</p>
            </div>
          )}
        </>
      )}
    </section>
  );
}
