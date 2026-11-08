import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import BitRow from '../../components/BitRow';
import SignedInput from '../../components/SignedInput';
import { arithmetic } from '../../lib/numberSystems';
import { track } from '../../analytics';

const btn =
  'min-h-[40px] rounded-md border border-ink/20 bg-white px-3 py-2 text-sm font-medium transition-colors hover:bg-ink hover:text-white disabled:opacity-40 disabled:hover:bg-white disabled:hover:text-ink';

function parse(raw, bits, t) {
  const s = raw.trim();
  if (!/^-?\d+$/.test(s)) return { err: t('twos.notInteger') };
  const v = BigInt(s);
  const p = 2n ** BigInt(bits - 1);
  if (v < -p || v > p - 1n) {
    return { err: t('twos.outOfRange', { bits, min: (-p).toString(), max: (p - 1n).toString() }) };
  }
  return { value: v };
}

export default function BinaryArithmetic({ bits, op }) {
  const { t } = useTranslation();
  const isSub = op === 'sub';
  const [rawA, setRawA] = useState('25');
  const [rawB, setRawB] = useState(isSub ? '45' : '19');
  const [step, setStep] = useState(0);
  const [playing, setPlaying] = useState(false);

  const pa = parse(rawA, bits, t);
  const pb = parse(rawB, bits, t);
  const ok = pa.value !== undefined && pb.value !== undefined;
  const d = useMemo(() => (ok ? arithmetic(pa.value, pb.value, bits, op) : null), [rawA, rawB, bits, op]);

  const pre = isSub ? 2 : 0;
  const total = pre + bits;

  useEffect(() => { setStep(0); setPlaying(false); }, [rawA, rawB, bits]);

  useEffect(() => {
    if (!playing) return;
    if (step >= total) { setPlaying(false); return; }
    const id = setTimeout(() => setStep((s) => s + 1), 900);
    return () => clearTimeout(id);
  }, [playing, step, total]);

  const stop = (fn) => () => { setPlaying(false); fn(); };
  const play = () => {
    if (step >= total) setStep(0);
    setPlaying(true);
    track('code_executed', {
      language_type: isSub ? 'Binary_Subtraction' : 'Binary_Addition',
      program_preset: `${bits}-bit`,
    });
  };

  const n = bits;
  const r = Math.max(0, step - pre); // columns of the final addition already done
  const hiddenResult = (i) => !(n - 1 - i < r);
  const maskedCarries = d && d.sum.carryIn.map((c, i) => (n - 1 - i <= r ? c : 0));
  const activeIdx = r >= 1 ? n - r : -1;

  let note = null;
  if (d && r >= 1) {
    const i = n - r;
    const a = d.aBits[i];
    const b = d.operand[i];
    const c = d.sum.carryIn[i];
    const tot = a + b + c;
    note = t('arith.column', { a, b, c, total: tot, bit: tot % 2, carry: tot >> 1 });
  }

  const opSign = isSub ? '−' : '+';

  return (
    <section className="space-y-5">
      <div className="grid gap-4 rounded-lg border border-line bg-white p-4 sm:grid-cols-2 sm:p-5">
        <SignedInput label={t('arith.a')} value={rawA} onChange={setRawA} error={pa.err} />
        <SignedInput label={t('arith.b')} value={rawB} onChange={setRawB} error={pb.err} />
      </div>

      {d && (
        <div className="space-y-5 rounded-lg border border-line bg-white p-4 sm:p-5">
          <p className="text-sm text-ink/70">{isSub ? t('arith.subIntro') : t('arith.addIntro')}</p>

          <div className="flex flex-wrap items-center gap-2">
            <button className={btn} disabled={step === 0} onClick={stop(() => setStep((s) => Math.max(0, s - 1)))}>{t('twos.back')}</button>
            <button className={btn} disabled={step >= total} onClick={stop(() => setStep((s) => Math.min(total, s + 1)))}>{t('twos.next')}</button>
            <button className={btn} onClick={() => (playing ? setPlaying(false) : play())}>{playing ? t('twos.pause') : t('twos.play')}</button>
            <button className={btn} onClick={stop(() => setStep(total))}>{t('arith.showAll')}</button>
            <button className={btn} onClick={stop(() => setStep(0))}>{t('twos.reset')}</button>
          </div>

          <div className="font-mono text-lg font-bold">
            {pa.value.toString()} {opSign} {pb.value < 0n ? `(${pb.value})` : pb.value.toString()}
          </div>

          {isSub && (
            <div className="space-y-1">
              <h3 className="font-semibold">{t('arith.makeNeg')}</h3>
              <div className="overflow-x-auto pb-2">
                <div className="inline-block min-w-full space-y-1">
                  <BitRow bare showWeights={false} label="B" bits={d.bBits} />
                  {step >= 1 && (
                    <BitRow bare showWeights={false} label={t('arith.rowFlip')} bits={d.inv}
                      flipped={d.inv.map(() => true)} carries={step >= 2 ? d.neg.carryIn : null} />
                  )}
                  {step >= 2 && <BitRow bare showWeights={false} label="+1" bits={d.one} />}
                  {step >= 2 && <BitRow bare label="−B" bits={d.neg.result} signed />}
                </div>
              </div>
              <p className="text-sm text-ink/70">
                {step === 0 ? '' : step === 1 ? t('arith.flipB') : t('arith.negB')}
              </p>
            </div>
          )}

          {step >= pre && (
            <div className="space-y-1">
              <h3 className="font-semibold">{isSub ? t('arith.sumSub') : t('arith.sumAdd')}</h3>
              <div className="overflow-x-auto pb-2">
                <div className="inline-block min-w-full space-y-1">
                  <BitRow bare showWeights={false} label="A" bits={d.aBits} carries={maskedCarries} active={activeIdx} />
                  <BitRow bare showWeights={false} label={isSub ? '−B' : 'B'} bits={d.operand} active={activeIdx} />
                  <BitRow bare label={t('arith.rowResult')} bits={d.sum.result}
                    hidden={d.sum.result.map((_, i) => hiddenResult(i))} active={activeIdx} signed />
                </div>
              </div>
              {note && <p className="break-words font-mono text-sm">{note}</p>}
            </div>
          )}

          {step >= total && (
            <div className="space-y-1 border-t border-line pt-4 text-sm">
              <p>{t('arith.carryOut', { c: d.sum.carryOut })}</p>
              <p className="break-all font-mono text-base font-bold">
                {d.sum.result.join('')} = {d.resultValue.toString()}
              </p>
              <p className={d.overflow ? 'font-medium text-red-700' : 'text-signal'}>
                {d.overflow
                  ? t('arith.overflow', { value: d.trueValue.toString(), bits })
                  : t('arith.noOverflow', { bits })}
              </p>
            </div>
          )}
        </div>
      )}
    </section>
  );
}