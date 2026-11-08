const COLS = { 1: 'grid-cols-1 max-w-[8rem]', 2: 'grid-cols-2', 3: 'grid-cols-3' };

/** Big tap targets for switching inputs between 0 and 1. */
export default function InputToggles({ names, values, onToggle }) {
  return (
    <div className={`grid gap-3 ${COLS[names.length] || 'grid-cols-4'}`}>
      {names.map((n) => {
        const on = !!values[n];
        return (
          <button
            key={n}
            type="button"
            onClick={() => onToggle(n)}
            aria-pressed={on}
            className={`flex h-16 flex-col items-center justify-center rounded-lg border-2 font-mono transition-colors active:scale-95 ${
              on ? 'border-signal bg-signal text-white' : 'border-line bg-white text-ink'
            }`}
          >
            <span className="font-sans text-sm font-medium">{n}</span>
            <span className="text-2xl font-bold leading-none">{on ? 1 : 0}</span>
          </button>
        );
      })}
    </div>
  );
}