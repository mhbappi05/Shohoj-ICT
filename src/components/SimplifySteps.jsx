import { useTranslation } from 'react-i18next';
import { ppN, cost } from '../lib/simplify';

const FORMULA = {
  doubleNeg: "(X′)′ = X",
  constNot: '0′ = 1,  1′ = 0',
  deMorgan: '(X·Y)′ = X′ + Y′,  (X + Y)′ = X′·Y′',
  identity: 'X·1 = X,  X + 0 = X',
  null: 'X·0 = 0,  X + 1 = 1',
  idempotent: 'X·X = X,  X + X = X',
  complement: 'X·X′ = 0,  X + X′ = 1',
  absorption: 'X + X·Y = X,  X·(X + Y) = X',
  redundancy: 'X + X′·Y = X + Y,  X·(X′ + Y) = X·Y',
  distributive: 'X·(Y + Z) = X·Y + X·Z',
  combining: 'X·Y + X·Y′ = X',
  consensus: 'X·Y + X′·Z + Y·Z = X·Y + X′·Z',
  xor: 'X ⊕ X = 0,  X ⊕ X′ = 1,  X ⊕ 0 = X,  X ⊕ 1 = X′',
};

/** Shows how the expression was simplified, one named law per step. */
export default function SimplifySteps({ simp }) {
  const { t } = useTranslation();
  const before = cost(simp.orig).lits;
  const after = cost(simp.final).lits;

  return (
    <div className="rounded-lg border border-line bg-white p-4">
      <h3 className="mb-2 font-semibold">{t('logic.simplify.title')}</h3>

      {!simp.changed ? (
        <>
          <p className="break-words font-mono text-base font-bold">Y = {ppN(simp.orig)}</p>
          <p className="mt-1 text-sm text-signal">{t('logic.simplify.already')}</p>
        </>
      ) : (
        <>
          <ol className="space-y-3">
            <li>
              <div className="text-sm text-ink/70">{t('logic.simplify.given')}</div>
              <div className="break-words font-mono text-sm">Y = {ppN(simp.orig)}</div>
            </li>
            {simp.steps.map((s, i) => (
              <li key={i} className="border-l-2 border-signal pl-3">
                <div className="text-sm font-medium">{t(`logic.laws.${s.law}`)}</div>
                {FORMULA[s.law] && <div className="font-mono text-xs text-ink/60">{FORMULA[s.law]}</div>}
                <div className="break-words font-mono text-sm">Y = {ppN(s.node)}</div>
              </li>
            ))}
          </ol>
          <div className="mt-3 rounded-md bg-signal/10 p-3">
            <div className="text-sm text-ink/70">{t('logic.simplify.final')}</div>
            <div className="break-words font-mono text-lg font-bold">Y = {ppN(simp.final)}</div>
            <div className="mt-1 text-xs text-ink/70">{t('logic.simplify.saved', { from: before, to: after })}</div>
          </div>
        </>
      )}
    </div>
  );
}