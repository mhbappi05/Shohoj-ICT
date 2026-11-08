// Boolean expression -> AST -> gate circuit with automatic layout.

const AND_CH = new Set(['.', '·', '•', '∙', '*', '&', '×']);
const OR_CH = new Set(['+', '|', '∨']);
const XOR_CH = new Set(['^', '⊕']);
const POST_NOT = new Set(["'", '′', '’', '`']);
const PRE_NOT = new Set(['!', '~', '¬']);

export const MAX_VARS = 4;

function tokenize(s, base) {
  const toks = [];
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    const pos = base + i + 1;
    if (/\s/.test(c)) continue;
    if (/[A-Za-z]/.test(c)) toks.push({ t: 'var', v: c.toUpperCase(), pos, ch: c });
    else if (c === '0' || c === '1') toks.push({ t: 'const', v: Number(c), pos, ch: c });
    else if (AND_CH.has(c)) toks.push({ t: 'and', pos, ch: c });
    else if (OR_CH.has(c)) toks.push({ t: 'or', pos, ch: c });
    else if (XOR_CH.has(c)) toks.push({ t: 'xor', pos, ch: c });
    else if (POST_NOT.has(c)) toks.push({ t: 'snot', pos, ch: c });
    else if (PRE_NOT.has(c)) toks.push({ t: 'pnot', pos, ch: c });
    else if (c === '(') toks.push({ t: 'lp', pos, ch: c });
    else if (c === ')') toks.push({ t: 'rp', pos, ch: c });
    else throw { code: 'unexpected', ch: c, pos };
  }
  return toks;
}

/** Parse text into an AST. Throws { code, ch?, pos? } on bad input. */
export function parseExpression(input) {
  let src = input;
  let base = 0;
  const eq = input.lastIndexOf('=');
  if (eq >= 0) { src = input.slice(eq + 1); base = eq + 1; } // allow "Y = ..."
  const toks = tokenize(src, base);
  if (toks.length === 0) throw { code: 'empty' };

  let i = 0;
  const peek = () => toks[i];
  const next = () => toks[i++];
  const endPos = () => base + src.length + 1;

  function parseOr() {
    let l = parseXor();
    while (peek() && peek().t === 'or') { next(); l = { t: 'or', a: l, b: parseXor() }; }
    return l;
  }
  function parseXor() {
    let l = parseAnd();
    while (peek() && peek().t === 'xor') { next(); l = { t: 'xor', a: l, b: parseAnd() }; }
    return l;
  }
  function parseAnd() {
    let l = parseUnary();
    for (;;) {
      const p = peek();
      if (p && p.t === 'and') { next(); l = { t: 'and', a: l, b: parseUnary() }; }
      else if (p && (p.t === 'var' || p.t === 'const' || p.t === 'lp' || p.t === 'pnot')) {
        l = { t: 'and', a: l, b: parseUnary() }; // implicit AND: AB, A(B+C)
      } else break;
    }
    return l;
  }
  function parseUnary() {
    const p = peek();
    if (p && p.t === 'pnot') { next(); return { t: 'not', a: parseUnary() }; }
    let n = parsePrimary();
    while (peek() && peek().t === 'snot') { next(); n = { t: 'not', a: n }; }
    return n;
  }
  function parsePrimary() {
    const p = next();
    if (!p) throw { code: 'missing', pos: endPos() };
    if (p.t === 'var') return { t: 'var', n: p.v };
    if (p.t === 'const') return { t: 'const', v: p.v };
    if (p.t === 'lp') {
      const e = parseOr();
      const c = next();
      if (!c || c.t !== 'rp') throw { code: 'paren' };
      return e;
    }
    if (p.t === 'rp') throw { code: 'paren' };
    throw { code: 'unexpected', ch: p.ch, pos: p.pos };
  }

  const ast = parseOr();
  if (i < toks.length) {
    const p = toks[i];
    throw p.t === 'rp' ? { code: 'paren' } : { code: 'unexpected', ch: p.ch, pos: p.pos };
  }
  if (collectVars(ast).length > MAX_VARS) throw { code: 'tooMany' };
  return ast;
}

export function collectVars(ast) {
  const s = new Set();
  (function walk(n) {
    if (n.t === 'var') s.add(n.n);
    else if (n.t === 'not') walk(n.a);
    else if (n.t !== 'const') { walk(n.a); walk(n.b); }
  })(ast);
  return [...s].sort();
}

const PREC = { or: 1, xor: 2, and: 3 };

/** Readable form of an AST, e.g. A·B + C′ */
export function pp(n) {
  if (n.t === 'var') return n.n;
  if (n.t === 'const') return String(n.v);
  if (n.t === 'not') {
    const c = n.a;
    const simple = c.t === 'var' || c.t === 'const' || c.t === 'not';
    return (simple ? pp(c) : `(${pp(c)})`) + '′';
  }
  const sym = { and: '·', or: ' + ', xor: ' ⊕ ' }[n.t];
  const wrap = (c) => (c.t in PREC && PREC[c.t] < PREC[n.t] ? `(${pp(c)})` : pp(c));
  return wrap(n.a) + sym + wrap(n.b);
}

const canon = (n) =>
  n.t === 'var' ? n.n
  : n.t === 'const' ? `#${n.v}`
  : n.t === 'not' ? `!${canon(n.a)}`
  : `(${n.t} ${canon(n.a)} ${canon(n.b)})`;

const BASE_TYPE = { and: 'AND', or: 'OR', xor: 'XOR' };
const NEG_TYPE = { and: 'NAND', or: 'NOR', xor: 'XNOR' };

const IN_X = 24, R = 12, GW = 68, FIRST = 88, COL = 100, ROW = 64;

/**
 * Turn an AST into a drawable netlist. Identical sub-expressions share one gate.
 * With merge=true, NOT applied to AND/OR/XOR becomes one NAND/NOR/XNOR gate.
 */
export function circuitFromAst(ast, { merge = true } = {}) {
  const vars = collectVars(ast);
  const level = {};
  const gates = [];
  const seen = new Map();
  const consts = new Set();
  vars.forEach((v) => { level[v] = 0; });

  function build(n) {
    if (n.t === 'var') return n.n;
    if (n.t === 'const') { const id = `K${n.v}`; consts.add(n.v); level[id] = 0; return id; }
    const key = canon(n);
    if (seen.has(key)) return seen.get(key);
    let type, ins;
    if (n.t === 'not') {
      if (merge && n.a.t in NEG_TYPE) { type = NEG_TYPE[n.a.t]; ins = [build(n.a.a), build(n.a.b)]; }
      else { type = 'NOT'; ins = [build(n.a)]; }
    } else { type = BASE_TYPE[n.t]; ins = [build(n.a), build(n.b)]; }
    const id = `g${gates.length + 1}`;
    gates.push({ id, type, in: ins, expr: pp(n) });
    level[id] = 1 + Math.max(...ins.map((x) => level[x]));
    seen.set(key, id);
    return id;
  }
  const rootId = build(ast);

  // inputs
  const inputs = [
    ...vars.map((v) => ({ id: v, label: v })),
    ...[...consts].sort().map((v) => ({ id: `K${v}`, label: String(v), fixed: v })),
  ];
  const outY = {};
  inputs.forEach((it, i) => { it.x = IN_X; it.y = 28 + i * 52; outY[it.id] = it.y; });

  // gate columns by level, ordered by the average height of their inputs
  const maxLevel = Math.max(0, ...gates.map((g) => level[g.id]));
  for (let L = 1; L <= maxLevel; L++) {
    const col = gates
      .filter((g) => level[g.id] === L)
      .map((g) => ({ g, want: g.in.reduce((s, x) => s + outY[x], 0) / g.in.length }))
      .sort((a, b) => a.want - b.want);
    let prev = -Infinity;
    col.forEach(({ g, want }) => {
      const top = Math.max(want - 20, 6, prev + ROW);
      g.x = FIRST + (L - 1) * COL;
      g.y = top;
      prev = top;
      outY[g.id] = top + 20;
    });
  }

  // wires that jump over a column ride a lane below the circuit
  const lanes = {};
  let laneCount = 0;
  gates.forEach((g) => {
    g.skip = g.in.map((src) => level[g.id] - level[src] > 1);
    g.in.forEach((src, k) => {
      if (g.skip[k] && !lanes[src]) lanes[src] = { idx: laneCount++ };
    });
  });
  const bottom = Math.max(
    ...inputs.map((i) => i.y + R + 4),
    ...gates.map((g) => g.y + 56),
    60
  );
  const xOf = (id) => {
    const inp = inputs.find((i) => i.id === id);
    return inp ? inp.x + R : gates.find((g) => g.id === id).x + GW;
  };
  Object.entries(lanes).forEach(([id, l]) => {
    l.ly = bottom + 12 + l.idx * 8;
    l.xa = xOf(id) + 8 + (l.idx % 4) * 5;
  });

  const outX = maxLevel > 0 ? FIRST + (maxLevel - 1) * COL + GW + 56 : IN_X + 100;
  return {
    width: outX + R + 10,
    height: bottom + (laneCount ? 12 + laneCount * 8 : 0) + 8,
    inputs,
    gates,
    lanes,
    outputs: [{ id: 'Y', label: 'Y', from: rootId, x: outX, y: outY[rootId], skip: false }],
  };
}