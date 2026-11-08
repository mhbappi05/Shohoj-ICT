/**
 * One row of bit boxes (MSB first), optionally with a left label column,
 * carries above, and position weights below. Sizes shrink on phones.
 */
export default function BitRow({
  bits,
  label,
  flipped = [],
  changed = [],
  hidden = [],
  carries = null,
  active = -1,
  signed = false,
  showWeights = true,
  bare = false,
}) {
  const n = bits.length;
  const row = (
    <div className="flex items-start">
      {label !== undefined && (
        <div className="w-12 shrink-0 pr-2 text-right text-xs font-medium text-ink/70 sm:w-16 sm:text-sm">
          {carries && <div className="h-5" />}
          <div className="flex h-9 items-center justify-end sm:h-10">{label}</div>
        </div>
      )}
      <div className="inline-flex gap-0.5 sm:gap-1">
        {bits.map((b, i) => {
          const pos = n - 1 - i;
          const tone = hidden[i]
            ? 'border-dashed border-line bg-transparent text-transparent'
            : flipped[i]
            ? 'border-flip bg-flip/20 text-ink'
            : changed[i] || b === 1
            ? 'border-signal bg-signal text-white'
            : 'border-line bg-white text-wire';
          return (
            <div key={i} className={`flex flex-col items-center ${pos % 4 === 3 && i !== 0 ? 'ml-1.5 sm:ml-2' : ''}`}>
              {carries && (
                <div className="h-5 font-mono text-xs font-bold text-flip">
                  {carries[i] === 1 ? '1' : ''}
                </div>
              )}
              <div
                className={`flex h-9 w-6 items-center justify-center rounded border-2 font-mono text-base font-bold transition-colors duration-500 sm:h-10 sm:w-9 sm:text-lg ${tone} ${
                  active === i ? 'ring-2 ring-ink ring-offset-1' : ''
                }`}
              >
                {b}
              </div>
              {showWeights && (
                <div className="mt-1 font-mono text-[9px] text-ink/60 sm:text-[10px]">
                  {signed && pos === n - 1 ? '−' : ''}2<sup>{pos}</sup>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
  return bare ? row : <div className="overflow-x-auto pb-2">{row}</div>;
}