// Helpers that explain a SELECT: split it into clauses, find which table
// columns and rows it touches, so the UI can highlight them.

const CLAUSES = [
    ['select', 'SELECT'], ['from', 'FROM'], ['where', 'WHERE'], ['groupBy', 'GROUP\\s+BY'],
    ['having', 'HAVING'], ['orderBy', 'ORDER\\s+BY'], ['limit', 'LIMIT'],
  ];
  const CLAUSE_RE = CLAUSES.map(([name, re]) => [name, new RegExp(`^(?:${re})\\b`, 'i')]);
  const SET_OP_RE = /^(?:UNION|INTERSECT|EXCEPT)\b/i;
  const isWord = (c) => /[A-Za-z0-9_]/.test(c);
  
  /** Split one SELECT statement into its top-level clauses. Returns null for anything else. */
  export function parseSelect(sql) {
    const s = sql.trim().replace(/;+\s*$/, '');
    if (!/^select\b/i.test(s)) return null;
  
    const marks = [];
    let depth = 0;
    let quote = null;
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (quote) { if (c === quote) quote = null; continue; }
      if (c === "'" || c === '"' || c === '`') { quote = c; continue; }
      if (c === '(') { depth++; continue; }
      if (c === ')') { depth--; continue; }
      if (depth !== 0) continue;
      if (c === ';') return null; // several statements
      if (i > 0 && isWord(s[i - 1])) continue; // keywords start at a word boundary
      const rest = s.slice(i);
      if (SET_OP_RE.test(rest)) return null;
      for (const [name, re] of CLAUSE_RE) {
        const m = re.exec(rest);
        if (m) {
          marks.push({ name, start: i, end: i + m[0].length });
          i += m[0].length - 1;
          break;
        }
      }
    }
  
    const out = {};
    marks.forEach((m, k) => {
      const next = marks[k + 1];
      out[m.name] = s.slice(m.end, next ? next.start : s.length).trim();
    });
    if (out.select === undefined || out.from === undefined) return null;
    out.select = out.select.replace(/^(?:DISTINCT|ALL)\s+/i, '');
    return out;
  }
  
  /** Split on a separator that is outside brackets and quotes. */
  export function splitTopLevel(str, sep = ',') {
    const parts = [];
    let depth = 0, quote = null, cur = '';
    for (const c of str) {
      if (quote) { cur += c; if (c === quote) quote = null; continue; }
      if (c === "'" || c === '"') { quote = c; cur += c; continue; }
      if (c === '(') depth++;
      if (c === ')') depth--;
      if (c === sep && depth === 0) { parts.push(cur); cur = ''; continue; }
      cur += c;
    }
    if (cur.trim()) parts.push(cur);
    return parts;
  }
  
  /** First table in a FROM clause; flags joins and comma-joins. */
  export function parseSource(from) {
    const joined = /\bjoin\b/i.test(from) || splitTopLevel(from, ',').length > 1;
    const m = /^\s*"?([A-Za-z_][\w]*)"?(?:\s+(?:AS\s+)?([A-Za-z_]\w*))?/i.exec(from);
    if (!m) return null;
    const alias = m[2] && !/^(?:JOIN|INNER|LEFT|RIGHT|CROSS|NATURAL|ON|WHERE)$/i.test(m[2]) ? m[2] : null;
    return { table: m[1], alias, joined };
  }
  
  /** Column names from `cols` that appear in `text` (string literals ignored). */
  export function wordsIn(text, cols) {
    const clean = text.replace(/'[^']*'/g, ' ');
    const words = clean.match(/[A-Za-z_][A-Za-z0-9_]*/g) || [];
    const lower = new Map(cols.map((c) => [c.toLowerCase(), c]));
    const found = new Set();
    words.forEach((w) => { if (lower.has(w.toLowerCase())) found.add(lower.get(w.toLowerCase())); });
    return found;
  }
  
  /**
   * Everything the UI needs to show what a simple SELECT picks from its table.
   * db is a sql.js Database; schema comes from readSchema().
   */
  export function buildVisual(db, sql, schema) {
    const parsed = parseSelect(sql);
    if (!parsed) return null;
    const src = parseSource(parsed.from);
    if (!src) return { parsed };
    if (src.joined) return { parsed, joined: true };
    const t = schema.find((x) => x.name.toLowerCase() === src.table.toLowerCase());
    if (!t) return { parsed };
  
    const colNames = t.cols.map((c) => c.name);
    const selectCols = new Set();
    splitTopLevel(parsed.select).forEach((raw) => {
      const item = raw.trim();
      if (item === '*' || /\.\*$/.test(item)) colNames.forEach((c) => selectCols.add(c));
      else wordsIn(item, colNames).forEach((c) => selectCols.add(c));
    });
    const whereCols = parsed.where ? wordsIn(parsed.where, colNames) : new Set();
  
    let rows = [];
    try {
      const r = db.exec(`SELECT rowid AS __rid, * FROM "${t.name}" LIMIT 200`);
      rows = r.length ? r[0].values : [];
    } catch { return { parsed }; }
  
    let matchIds = null;
    if (parsed.where) {
      try {
        const r = db.exec(`SELECT rowid FROM "${t.name}"${src.alias ? ` ${src.alias}` : ''} WHERE ${parsed.where}`);
        matchIds = new Set(r.length ? r[0].values.map((v) => v[0]) : []);
      } catch { matchIds = null; }
    }
    return { parsed, table: t.name, columns: colNames, rows, selectCols, whereCols, matchIds };
  }