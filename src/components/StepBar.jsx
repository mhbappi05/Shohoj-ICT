import { useTranslation } from 'react-i18next';
import { ChevronLeft, ChevronRight, Pause, Play, RotateCcw, SkipForward } from 'lucide-react';

const btn =
  'flex h-12 items-center justify-center rounded-md border transition-colors disabled:opacity-40';

/** Sticky bottom bar so the controls stay under your thumb while you scroll. */
export default function StepBar({ stepLabel, canBack, canNext, playing, onBack, onNext, onPlay, onEnd, onReset }) {
  const { t } = useTranslation();
  return (
    <div className="sticky bottom-0 z-20 -mx-4 border-t border-line bg-white/95 px-4 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur">
      <div className="mb-1 text-center text-xs text-ink/60">{stepLabel}</div>
      <div className="flex gap-2">
        <button type="button" onClick={onBack} disabled={!canBack} aria-label={t('c.back')} className={`${btn} w-12 border-ink/20 bg-white`}>
          <ChevronLeft size={22} />
        </button>
        <button type="button" onClick={onNext} disabled={!canNext} className={`${btn} flex-1 gap-1 border-signal bg-signal text-base font-semibold text-white`}>
          {t('c.next')}
          <ChevronRight size={20} />
        </button>
        <button type="button" onClick={onPlay} disabled={!canNext && !playing} aria-label={playing ? t('c.pause') : t('c.play')} className={`${btn} w-12 border-ink/20 bg-white`}>
          {playing ? <Pause size={20} /> : <Play size={20} />}
        </button>
        <button type="button" onClick={onEnd} disabled={!canNext} aria-label={t('c.toEnd')} className={`${btn} w-12 border-ink/20 bg-white`}>
          <SkipForward size={20} />
        </button>
        <button type="button" onClick={onReset} aria-label={t('c.reset')} className={`${btn} w-12 border-ink/20 bg-white`}>
          <RotateCcw size={20} />
        </button>
      </div>
    </div>
  );
}