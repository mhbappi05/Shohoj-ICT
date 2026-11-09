import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import CodeBox from '../../components/CodeBox';
import ResultTable from './ResultTable';
import QueryVisual from './QueryVisual';
import { buildVisual } from '../../lib/sqlview';
import { track } from '../../analytics';

const EXAMPLES = [
  ['all', 'SELECT * FROM Students;'],
  ['columns', 'SELECT name, city\nFROM Students;'],
  ['where', 'SELECT name, age\nFROM Students\nWHERE age > 17;'],
  ['order', 'SELECT name, age\nFROM Students\nORDER BY age DESC;'],
  ['join', 'SELECT s.name, d.dept_name\nFROM Students s\nJOIN Departments d\n  ON s.dept_id = d.dept_id;'],
  ['group', 'SELECT dept_id, COUNT(*) AS total\nFROM Students\nGROUP BY dept_id;'],
  ['avg', 'SELECT subject, ROUND(AVG(marks), 1) AS average\nFROM Marks\nGROUP BY subject;'],
  ['update', "UPDATE Students\nSET city = 'Dhaka'\nWHERE student_id = 3;"],
  ['insert', "INSERT INTO Students\nVALUES (11, 'Rubina Khatun', 'F', 17, 2, 'Rajshahi');"],
  ['delete', 'DELETE FROM Marks\nWHERE mark_id = 23;'],
];

const KEYWORDS = [
  'SELECT', 'FROM', 'WHERE', 'ORDER BY', 'GROUP BY', 'HAVING', 'JOIN', 'ON', 'AND', 'OR', 'NOT',
  'LIKE', 'IN', 'BETWEEN', 'DISTINCT', 'LIMIT', 'AS', 'ASC', 'DESC',
  'UPDATE', 'SET', 'INSERT INTO', 'VALUES', 'DELETE FROM',
].map((k) => ({ label: k, text: `${k} ` }));
const FUNCTIONS = ['COUNT', 'SUM', 'AVG', 'MAX', 'MIN', 'ROUND'].map((f) => ({ label: `${f}()`, text: `${f}()`, back: 1 }));
const SYMBOLS = [
  ...['*', ',', '(', ')', '=', '>', '<', '%', ';', '.'].map((s) => ({ label: s, text: s })),
  { label: "' '", text: "''", back: 1 },
];
const STEP_ORDER = ['from', 'where', 'groupBy', 'having', 'select', 'orderBy', 'limit'];

export default function SqlPlayground({ db, schema, sql, setSql, onChanged, onReset }) {
  const { t } = useTranslation();
  const [results, setResults] = useState([]);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);
  const [visual, setVisual] = useState(null);

  const run = () => {
    const text = sql.trim();
    if (!text) return;
    try {
      const res = db.exec(text);
      const isSelect = /^\s*select\b/i.test(text);
      const modified = db.getRowsModified();
      setResults(res);
      setError(null);
      setVisual(isSelect ? buildVisual(db, text, schema) : null);
      if (res.length > 0) setMessage(null);
      else if (isSelect) setMessage(t('db.emptyResult'));
      else setMessage(modified > 0 ? t('db.rowsChanged', { n: modified }) : t('db.done'));
      if (!isSelect) onChanged(); // data or tables may have changed
      track('code_executed', { language_type: 'SQL', program_preset: text.split(/\s+/)[0].toUpperCase() });
    } catch (e) {
      setError((e && e.message) || String(e));
      setResults([]);
      setVisual(null);
      setMessage(null);
    }
  };

  const columnNames = [...new Set(schema.flatMap((s) => s.cols.map((c) => c.name)))];
  const keyRows = [
    { title: t('db.keywords'), items: [...KEYWORDS, ...FUNCTIONS] },
    { title: t('db.symbols'), items: SYMBOLS },
    {
      title: t('db.tablesCols'),
      items: [
        ...schema.map((s) => ({ label: s.name, text: `${s.name} ` })),
        ...columnNames.map((c) => ({ label: c, text: c })),
      ],
    },
  ];

  const parsed = visual && visual.parsed;
  const steps = parsed ? STEP_ORDER.filter((k) => parsed[k] !== undefined && parsed[k] !== '') : [];

  return (
    <section className="space-y-4">
      <div>
        <div className="mb-1 text-sm font-medium">{t('db.exampleTitle')}</div>
        <div className="no-scrollbar -mx-4 overflow-x-auto px-4">
          <div className="flex gap-2 whitespace-nowrap">
            {EXAMPLES.map(([id, code]) => (
              <button
                key={id}
                type="button"
                onClick={() => setSql(code)}
                className="min-h-[40px] rounded-full border border-ink/20 bg-white px-4 text-sm font-medium"
              >
                {t(`db.ex.${id}`)}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-3 rounded-lg border border-line bg-white p-4">
        <CodeBox value={sql} onChange={setSql} keyRows={keyRows} rows={6} label={t('db.editorLabel')} onRun={run} />
        <button type="button" onClick={run} className="h-12 w-full rounded-md bg-signal font-semibold text-white active:opacity-80">
          {t('db.run')}
        </button>
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs text-ink/60">{t('db.runHint')}</p>
          <button type="button" onClick={onReset}
            className="min-h-[40px] shrink-0 rounded-md border border-ink/20 bg-white px-3 text-sm font-medium">
            {t('db.reset')}
          </button>
        </div>
        <p className="text-xs text-ink/60">{t('db.resetNote')}</p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800" role="alert">
          <div className="font-semibold">{t('db.error')}</div>
          <div className="break-words font-mono">{error}</div>
        </div>
      )}
      {message && <p className="rounded-lg border border-line bg-white p-4 text-sm font-medium">{message}</p>}

      {results.map((r, i) => (
        <div key={i} className="rounded-lg border border-line bg-white p-4">
          <ResultTable columns={r.columns} values={r.values} />
        </div>
      ))}

      {visual && visual.table && <QueryVisual visual={visual} />}
      {visual && visual.joined && <p className="text-xs text-ink/60">{t('db.visual.joinNote')}</p>}

      {steps.length > 0 && (
        <div className="rounded-lg border border-line bg-white p-4">
          <h3 className="mb-2 font-semibold">{t('db.stepsTitle')}</h3>
          <ol className="space-y-2">
            {steps.map((k, i) => (
              <li key={k} className="flex gap-3">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-ink text-xs font-bold text-white">{i + 1}</span>
                <div className="min-w-0">
                  <div className="text-sm">{t(`db.step.${k}`)}</div>
                  <div className="break-words font-mono text-xs text-ink/70">{parsed[k]}</div>
                </div>
              </li>
            ))}
          </ol>
        </div>
      )}
    </section>
  );
}