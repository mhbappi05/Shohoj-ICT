import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BitRow from '../../components/BitRow';
import SignedInput from '../../components/SignedInput';
import { twosComplementSteps } from '../../lib/numberSystems';
import { track } from '../../analytics';

const btn =
  'min-h-[40px] rounded-md border border-ink/20 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-ink';

export default function TwosComplement({ bits }) {
  const { t } = useTranslation();
  const [raw, setRaw] = useState('-45');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const isInt = /^-?\d+$/.test(raw.trim());
  const value = isInt ? BigInt(raw.trim()) : null;
  const data = useMemo(() => (isInt ? twosComplementSteps(value, bits) : null), [raw, bits]);
  const last = data && data.negative ? 2 : 0;

  useEffect(() => { setStep(0); setPlaying(false); }, [raw, bits]);

  useEffect(() => {
    if (!playing) return;
    if (step >= last) { setPlaying(false); return; }
    const id = setTimeout(() => setStep((s) => s + 1), 1400);
    return () => clearTimeout(id);
  }, [playing, step, last]);

  const play = () => {
    if (step >= last) setStep(0);
    setPlaying(true);
    track('code_executed', { language_type: 'Twos_Complement', program_preset: `${bits}-bit` });
  };

  const pow = 2n ** BigInt(bits - 1);
  const range = { bits, min: (-pow).toString(), max: (pow - 1n).toString() };
  const error = !isInt ? t('twos.notInteger') : !data ? t('twos.outOfRange', range) : null;

  return (
    <section className="space-y-5">
      <div className="max-w-sm rounded-lg border border-line bg-white p-4 sm:p-5">
        <SignedInput label={t('twos.value')} value={raw} onChange={setRaw} error={error} />
      </div>

      {data && (
        <div className="space-y-4 rounded-lg border border-line bg-white p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2">
            <button className={btn} onClick={() => { setPlaying(false); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0}>{t('twos.back')}</button>
            <button className={btn} onClick={() => { setPlaying(false); setStep((s) => Math.min(last, s + 1)); }} disabled={step >= last}>{t('twos.next')}</button>
            {last > 0 && (
              <button className={btn} onClick={() => (playing ? setPlaying(false) : play())}>
                {playing ? t('twos.pause') : t('twos.play')}
              </button>
            )}
            <button className={btn} onClick={() => { setPlaying(false); setStep(0); }}>{t('twos.reset')}</button>
          </div>

          <div>
            <h3 className="font-semibold">{t('twos.step1')}</h3>
            <p className="text-sm text-ink/70">
              {data.negative ? t('twos.step1Neg', { n: raw.trim() }) : t('twos.step1Pos', { n: raw.trim() })}
            </p>
            <BitRow bits={data.direct} />
          </div>

          {data.negative && step >= 1 && (
            <div>
              <h3 className="font-semibold">{t('twos.step2')}</h3>
              <p className="text-sm text-ink/70">{t('twos.step2Body')}</p>
              <BitRow bits={data.inverted} flipped={data.flipped} />
            </div>
          )}

          {data.negative && step >= 2 && (
            <div>
              <h3 className="font-semibold">{t('twos.step3')}</h3>
              <p className="text-sm text-ink/70">{t('twos.step3Body')}</p>
              <BitRow bits={data.result} changed={data.changed} carries={data.carryIn} signed />
              <p className="mt-1 break-all font-mono text-sm">{data.result.join('')} = {value.toString()}</p>
              <p className="text-sm text-ink/70">{t('twos.check', { w: pow.toString() })}</p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}