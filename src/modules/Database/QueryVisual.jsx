import { useTranslation } from 'react-i18next';

export default function QueryVisual({ visual }) {
  const { t } = useTranslation();
  const { columns, rows, selectCols, whereCols, matchIds } = visual;
  const filtered = matchIds !== null;

  return (
    <div className="space-y-2 rounded-lg border border-line bg-white p-4">
      <h3 className="font-semibold">{t('db.visual.title', { table: visual.table })}</h3>
      <p className="text-xs text-ink/70">{t('db.visual.hint')}</p>
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-sm bg-signal" />{t('db.visual.legendSelect')}</span>
        <span className="flex items-center gap-1"><i className="inline-block h-3 w-3 rounded-sm bg-flip/40" />{t('db.visual.legendWhere')}</span>
        {filtered && <span className="flex items-center gap-1"><b className="text-signal">✓</b>{t('db.visual.legendRow')}</span>}
      </div>

      <div className="overflow-x-auto rounded-md border border-line">
        <table className="min-w-full text-sm">
          <thead>
            <tr>
              {filtered && <th className="w-8 bg-paper" />}
              {columns.map((c) => {
                const inSelect = selectCols.has(c);
                const inWhere = whereCols.has(c);
                const tone = inSelect ? 'bg-signal text-white' : inWhere ? 'bg-flip/30' : 'bg-paper text-ink/60';
                return (
                  <th
                    key={c}
                    className={`whitespace-nowrap px-3 py-2 text-left font-medium ${tone} ${
                      inSelect && inWhere ? 'underline decoration-flip decoration-2 underline-offset-4' : ''
                    }`}
                  >
                    {c}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const ok = !filtered || matchIds.has(r[0]);
              return (
                <tr key={r[0]} className={`border-t border-line ${ok ? '' : 'opacity-40'}`}>
                  {filtered && <td className="px-2 text-center font-bold text-signal">{ok ? '✓' : ''}</td>}
                  {columns.map((c, k) => (
                    <td
                      key={c}
                      className={`whitespace-nowrap px-3 py-1.5 font-mono ${ok && selectCols.has(c) ? 'bg-signal/10 font-medium' : ''}`}
                    >
                      {r[k + 1] === null ? <span className="italic text-ink/40">NULL</span> : String(r[k + 1])}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}