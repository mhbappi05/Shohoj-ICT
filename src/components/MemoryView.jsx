import { useTranslation } from 'react-i18next';

const TYPE_NAME = {
  char: 'char', uchar: 'unsigned char', short: 'short', ushort: 'unsigned short',
  int: 'int', uint: 'unsigned int', long: 'long', ulong: 'unsigned long', float: 'float', double: 'double',
};

function Cell({ c }) {
  const tone = c.u
    ? 'border-dashed border-line bg-white text-ink/40'
    : c.changed
    ? 'border-flip bg-flip/25 text-ink'
    : 'border-ink/30 bg-white text-ink';
  return (
    <div className={`flex min-w-[2.5rem] flex-col items-center justify-center rounded border-2 px-1.5 py-1 font-mono transition-colors duration-500 ${tone}`}>
      <span className="text-sm font-bold leading-tight">{c.t}</span>
      {c.s !== undefined && <span className="text-[9px] leading-none text-ink/50">{c.s}</span>}
    </div>
  );
}

function Cells({ v }) {
  if (v.dims.length === 2) {
    const [R, C] = v.dims;
    return (
      <div className="overflow-x-auto pb-1">
        <div className="inline-block">
          <div className="flex gap-1 pl-6">
            {[...Array(C)].map((_, j) => <div key={j} className="min-w-[2.5rem] text-center text-[10px] text-ink/50">{j}</div>)}
          </div>
          {[...Array(R)].map((_, i) => (
            <div key={i} className="mt-1 flex items-center gap-1">
              <span className="w-5 text-right text-[10px] text-ink/50">{i}</span>
              {[...Array(C)].map((__, j) => <Cell key={j} c={v.cells[i * C + j]} />)}
            </div>
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="overflow-x-auto pb-1">
      <div className="inline-flex gap-1">
        {v.cells.map((c, i) => (
          <div key={i} className="flex flex-col items-center">
            <Cell c={c} />
            <span className="text-[10px] text-ink/50">{v.dims.length ? i : ''}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** The variables in memory: name, type, address and live values. */
export default function MemoryView({ vars, warnings = [] }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-3 rounded-lg border border-line bg-white p-4">
      <h3 className="font-semibold">{t('c.memoryTitle')}</h3>
      {warnings.length > 0 && (
        <p className="rounded-md bg-flip/20 p-2 text-sm">{t('c.warnUninit', { names: warnings.join(', ') })}</p>
      )}
      {vars.length === 0 ? (
        <p className="text-sm text-ink/60">{t('c.noVars')}</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {vars.map((v, k) => {
            const isArray = v.dims.length > 0;
            return (
              <div key={`${v.name}-${k}`} className={`rounded-md border border-line bg-paper p-2 ${isArray ? 'w-full' : 'min-w-[7.5rem] flex-1'}`}>
                <div className="mb-1 flex flex-wrap items-baseline gap-x-2">
                  <span className="font-mono font-bold">{v.name}{isArray ? v.dims.map((d) => `[${d}]`).join('') : ''}</span>
                  <span className="text-xs text-ink/60">{TYPE_NAME[v.ty]} · {t('c.bytes', { n: v.size * v.cells.length })}</span>
                  <span className="ml-auto font-mono text-[10px] text-ink/50">{v.addr}</span>
                </div>
                <Cells v={v} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}