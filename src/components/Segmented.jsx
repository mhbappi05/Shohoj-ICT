/** Segmented control that scrolls sideways on narrow screens. */
export default function Segmented({ options, value, onChange, label }) {
    return (
      <div className="no-scrollbar -mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={label}>
        <div className="inline-flex min-w-full overflow-hidden rounded-md border border-ink/20 bg-white sm:min-w-0">
          {options.map((o) => (
            <button
              key={o.value}
              type="button"
              onClick={() => onChange(o.value)}
              aria-pressed={value === o.value}
              className={`min-h-[44px] flex-1 whitespace-nowrap px-4 text-sm font-medium transition-colors ${
                value === o.value ? 'bg-ink text-white' : 'bg-white text-ink'
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
    );
  }