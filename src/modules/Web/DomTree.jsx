import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';

function flatten(model, collapsed) {
  const rows = [];
  (function walk(n, id, depth, trail) {
    const hasKids = n.type === 'el' && n.children.length > 0;
    const path = n.type === 'el' ? [...trail, n.tag] : trail;
    rows.push({ id, depth, n, hasKids, path });
    if (hasKids && !collapsed.has(id)) n.children.forEach((c, i) => walk(c, `${id}.${i}`, depth + 1, path));
  })(model, '0', 0, []);
  return rows;
}

function parentIds(model) {
  const ids = [];
  (function walk(n, id) {
    if (n.type === 'el' && n.children.length) {
      ids.push(id);
      n.children.forEach((c, i) => walk(c, `${id}.${i}`));
    }
  })(model, '0');
  return ids;
}

const trunc = (s, n = 18) => (s.length > n ? `${s.slice(0, n)}…` : s);
const btn =
  'min-h-[40px] rounded-md border border-ink/20 bg-white px-3 text-sm font-medium active:bg-ink active:text-white';

function Label({ n }) {
  if (n.type === 'text') return <span className="italic text-ink/80">“{n.text}”</span>;
  if (n.type === 'comment') return <span className="text-ink/50">{'<!-- '}{trunc(n.text, 24)}{' -->'}</span>;
  return (
    <span>
      <span className="text-emerald-700">&lt;{n.tag}</span>
      {n.attrs.slice(0, 3).map(([k, v]) => (
        <span key={k} className="text-ink/60"> {k}{v !== '' && <>="<span className="text-ink">{trunc(v)}</span>"</>}</span>
      ))}
      {n.attrs.length > 3 && <span className="text-ink/50"> …</span>}
      <span className="text-emerald-700">&gt;</span>
    </span>
  );
}

export default function DomTree({ model, truncated }) {
  const { t, i18n } = useTranslation();
  const [collapsed, setCollapsed] = useState(() => new Set());
  const [selected, setSelected] = useState(null);

  const rows = useMemo(() => flatten(model, collapsed), [model, collapsed]);
  const sel = rows.find((r) => r.id === selected) || null;

  const toggle = (id) =>
    setCollapsed((s) => {
      const next = new Set(s);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });

  const tagKey = sel && sel.n.type === 'el' ? (/^h[1-6]$/.test(sel.n.tag) ? 'h' : sel.n.tag) : null;
  const hasDesc = tagKey && i18n.exists(`web.tag.${tagKey}`);

  return (
    <div className="space-y-3 rounded-lg border border-line bg-white p-4">
      <h3 className="font-semibold">{t('web.tree.title')}</h3>
      <p className="text-xs text-ink/70">{t('web.tree.autoTags')}</p>

      <div className="min-h-[88px] rounded-md bg-paper p-3 text-sm">
        {sel && sel.n.type === 'el' ? (
          <div className="space-y-1">
            <div className="font-mono font-bold">&lt;{sel.n.tag}&gt;</div>
            {hasDesc && <p>{t(`web.tag.${tagKey}`)}</p>}
            <p className="break-words font-mono text-xs text-ink/70">
              {t('web.tree.attributes')}:{' '}
              {sel.n.attrs.length ? sel.n.attrs.map(([k, v]) => `${k}="${v}"`).join('  ') : t('web.tree.none')}
            </p>
            <p className="text-xs text-ink/70">{t('web.tree.children')}: {sel.n.children.length}</p>
            <p className="break-words font-mono text-xs text-ink/70">{t('web.tree.path')}: {sel.path.join(' › ')}</p>
          </div>
        ) : (
          <p className="text-ink/70">{t('web.tree.tapHint')}</p>
        )}
      </div>

      <div className="flex gap-2">
        <button type="button" className={btn} onClick={() => setCollapsed(new Set())}>{t('web.tree.expandAll')}</button>
        <button type="button" className={btn} onClick={() => setCollapsed(new Set(parentIds(model)))}>{t('web.tree.collapseAll')}</button>
      </div>

      <div className="max-h-[50vh] overflow-auto rounded-md border border-line" role="tree">
        <div className="min-w-max py-1">
          {rows.map((r) => (
            <div
              key={r.id}
              role="treeitem"
              aria-selected={r.id === selected}
              className={`flex items-center font-mono text-sm ${r.id === selected ? 'bg-signal/10' : ''}`}
              style={{ paddingLeft: 4 + r.depth * 14 }}
            >
              {r.hasKids ? (
                <button
                  type="button"
                  onClick={() => toggle(r.id)}
                  aria-label={collapsed.has(r.id) ? 'Expand' : 'Collapse'}
                  className="h-9 w-8 shrink-0 text-ink/60"
                >
                  {collapsed.has(r.id) ? '▸' : '▾'}
                </button>
              ) : (
                <span className="w-8 shrink-0" />
              )}
              <button
                type="button"
                onClick={() => setSelected(r.id)}
                className="min-h-[36px] flex-1 whitespace-nowrap pr-4 text-left"
              >
                <Label n={r.n} />
              </button>
            </div>
          ))}
        </div>
      </div>
      {truncated && <p className="text-xs text-ink/60">{t('web.tree.truncated')}</p>}
    </div>
  );
}