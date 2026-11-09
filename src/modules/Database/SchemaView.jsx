import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import Segmented from '../../components/Segmented';
import ResultTable from './ResultTable';

const W = 240, HEAD = 30, ROWH = 24, PAD = 16, GAP = 34;
const INK = '#10202F';

// referenced tables go first (top), tables that point at them below
function depthMap(schema) {
  const by = Object.fromEntries(schema.map((t) => [t.name.toLowerCase(), t]));
  const memo = {};
  const d = (t, seen = new Set()) => {
    const k = t.name.toLowerCase();
    if (memo[k] !== undefined) return memo[k];
    if (seen.has(k)) return 0;
    seen.add(k);
    const targets = t.fks.map((f) => by[f.table.toLowerCase()]).filter((x) => x && x !== t);
    memo[k] = targets.length ? 1 + Math.max(...targets.map((x) => d(x, seen))) : 0;
    return memo[k];
  };
  schema.forEach((t) => d(t));
  return memo;
}

function layoutSchema(schema) {
  const depth = depthMap(schema);
  const order = [...schema].sort((a, b) => depth[a.name.toLowerCase()] - depth[b.name.toLowerCase()]);
  let y = PAD;
  const boxes = {};
  order.forEach((t) => {
    const h = HEAD + t.cols.length * ROWH + 6;
    boxes[t.name.toLowerCase()] = { t, x: PAD, y, h };
    y += h + GAP;
  });
  const links = [];
  schema.forEach((t) =>
    t.fks.forEach((f) => {
      const from = boxes[t.name.toLowerCase()];
      const to = boxes[f.table.toLowerCase()];
      if (!to) return;
      const fi = t.cols.findIndex((c) => c.name === f.from);
      const ti = to.t.cols.findIndex((c) => c.name === f.to);
      if (fi < 0 || ti < 0) return;
      links.push({
        y1: from.y + HEAD + fi * ROWH + ROWH / 2,
        y2: to.y + HEAD + ti * ROWH + ROWH / 2,
      });
    })
  );
  links.forEach((l, i) => { l.off = 24 + i * 10; });
  const maxOff = links.length ? Math.max(...links.map((l) => l.off)) : 0;
  return {
    boxes: Object.values(boxes),
    links,
    width: PAD + W + maxOff + PAD + 8,
    height: Math.max(y - GAP + PAD, 60),
  };
}

function Badge({ x, y, text, fill }) {
  return (
    <g>
      <rect x={x} y={y - 9} width="24" height="15" rx="3" fill={fill} />
      <text x={x + 12} y={y + 2} textAnchor="middle" fontSize="9" fontWeight="700" fill="#fff">{text}</text>
    </g>
  );
}

export default function SchemaView({ db, schema, version }) {
  const { t } = useTranslation();
  const [sel, setSel] = useState(null);
  const g = useMemo(() => layoutSchema(schema), [schema]);

  const names = schema.map((s) => s.name);
  const current = names.includes(sel) ? sel : names[0];
  const data = useMemo(() => {
    if (!current) return null;
    try {
      const r = db.exec(`SELECT * FROM "${current}" LIMIT 100`);
      return r[0] || { columns: [], values: [] };
    } catch { return null; }
  }, [db, current, version]);

  return (
    <section className="space-y-4">
      <div className="rounded-lg border border-line bg-white p-3 sm:p-4">
        <h3 className="mb-2 font-semibold">{t('db.schema.title')}</h3>
        <svg
          viewBox={`0 0 ${g.width} ${g.height}`}
          className="mx-auto block w-full"
          style={{ maxWidth: g.width * 1.6 }}
          role="img"
          aria-label={t('db.schema.title')}
        >
          <defs>
            <marker id="fk-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto">
              <path d="M0 0L10 5L0 10z" fill={INK} />
            </marker>
          </defs>

          {g.links.map((l, i) => (
            <path
              key={i}
              d={`M${PAD + W} ${l.y1}H${PAD + W + l.off}V${l.y2}H${PAD + W + 1}`}
              fill="none" stroke={INK} strokeWidth="1.5" markerEnd="url(#fk-arrow)"
            />
          ))}

          {g.boxes.map(({ t: tb, x, y, h }) => (
            <g key={tb.name}>
              <rect x={x} y={y} width={W} height={h} rx="6" fill="#fff" stroke={INK} strokeWidth="1.5" />
              <path d={`M${x} ${y + 6}a6 6 0 0 1 6 -6H${x + W - 6}a6 6 0 0 1 6 6V${y + HEAD}H${x}Z`} fill={INK} />
              <text x={x + 10} y={y + 20} fontSize="13" fontWeight="700" fill="#fff">{tb.name}</text>
              {tb.cols.map((c, i) => {
                const ry = y + HEAD + i * ROWH;
                const isPk = c.pk > 0;
                const isFk = tb.fks.some((f) => f.from === c.name);
                return (
                  <g key={c.name}>
                    {(isPk || isFk) && (
                      <rect x={x + 1} y={ry} width={W - 2} height={ROWH} fill={isPk ? '#F2A90026' : '#00A67622'} />
                    )}
                    <text x={x + 10} y={ry + 16} fontSize="12" fontFamily="'JetBrains Mono', monospace" fill={INK}>{c.name}</text>
                    {isPk && <Badge x={x + 112} y={ry + 12} text="PK" fill="#B07F00" />}
                    {isFk && <Badge x={x + (isPk ? 140 : 112)} y={ry + 12} text="FK" fill="#00805C" />}
                    <text x={x + W - 8} y={ry + 16} textAnchor="end" fontSize="10" fill="#10202F99">{c.type}</text>
                  </g>
                );
              })}
            </g>
          ))}
        </svg>
        <p className="mt-2 text-xs text-ink/70">{t('db.schema.legend')}</p>
        <p className="text-xs text-ink/70">{t('db.schema.arrowNote')}</p>
      </div>

      <div className="space-y-3 rounded-lg border border-line bg-white p-4">
        <h3 className="font-semibold">{t('db.schema.browse')}</h3>
        <Segmented
          options={names.map((n) => ({ value: n, label: n }))}
          value={current}
          onChange={setSel}
          label={t('db.schema.browse')}
        />
        {data && <ResultTable columns={data.columns} values={data.values} />}
      </div>
    </section>
  );
}