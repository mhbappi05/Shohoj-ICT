import { useTranslation } from 'react-i18next';

const MAX = 200;

export default function ResultTable({ columns, values }) {
  const { t } = useTranslation();
  const rows = values.slice(0, MAX);
  return (
    <div className="space-y-2">
      <div className="text-sm text-ink/70">
        {t('db.rowsReturned', { n: values.length })}
        {values.length > MAX && ` (${t('db.shown', { n: MAX })})`}
      </div>
      <div className="overflow-x-auto rounded-md border border-line">
        <table className="min-w-full text-sm">
          <thead className="bg-paper">
            <tr>
              {columns.map((c, i) => (
                <th key={i} className="whitespace-nowrap px-3 py-2 text-left font-medium">{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-line">
                {r.map((v, k) => (
                  <td key={k} className="whitespace-nowrap px-3 py-1.5 font-mono">
                    {v === null ? <span className="italic text-ink/40">NULL</span> : String(v)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}