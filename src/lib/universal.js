// Rebuild any expression using only NAND gates or only NOR gates (2-input).
import { collectVars, canon, layoutNetlist } from './expression';
import { toBinary } from './simplify';

/**
 * ast: binary AST. base: 'NAND' | 'NOR'.
 * Each node becomes a signal that can supply its true form (pos) or its
 * complement (neg). The main gate makes the cheaper polarity; the other one
 * costs one inverter (the base gate with both inputs tied), created only if
 * somebody asks for it. That turns a sum of products into NAND-NAND (or a
 * product of sums into NOR-NOR) automatically.
 */
export function buildUniversal(ast, base) {
  const gates = [];
  const consts = new Set();
  const memo = new Map();
  const mkGate = (ins) => {
    const id = `g${gates.length + 1}`;
    gates.push({ id, type: base, in: ins, expr: '' });
    return id;
  };
  const inv = (x) => mkGate([x, x]);

  const pair = (main, mainIsPos) => {
    let m = null, o = null;
    const getMain = () => (m ??= main());
    const getOther = () => (o ??= inv(getMain()));
    return mainIsPos ? { pos: getMain, neg: getOther } : { pos: getOther, neg: getMain };
  };

  function sig(n) {
    const k = canon(n);
    if (memo.has(k)) return memo.get(k);
    let s;
    if (n.t === 'var') {
      let neg = null;
      s = { pos: () => n.n, neg: () => (neg ??= inv(n.n)) };
    } else if (n.t === 'const') {
      s = {
        pos: () => { consts.add(n.v); return `K${n.v}`; },
        neg: () => { consts.add(1 - n.v); return `K${1 - n.v}`; },
      };
    } else if (n.t === 'not') {
      const c = sig(n.a);
      s = { pos: () => c.neg(), neg: () => c.pos() };
    } else {
      const A = sig(n.a), B = sig(n.b);
      if (base === 'NAND') {
        if (n.t === 'and') s = pair(() => mkGate([A.pos(), B.pos()]), false);     // NAND = (ab)'
        else if (n.t === 'or') s = pair(() => mkGate([A.neg(), B.neg()]), true);  // a' and b' NANDed = a+b
        else s = pair(() => {                                                     // xor: 4 NANDs
          const a = A.pos(), b = B.pos();
          const n1 = mkGate([a, b]);
          return mkGate([mkGate([a, n1]), mkGate([b, n1])]);
        }, true);
      } else {
        if (n.t === 'or') s = pair(() => mkGate([A.pos(), B.pos()]), false);      // NOR = (a+b)'
        else if (n.t === 'and') s = pair(() => mkGate([A.neg(), B.neg()]), true); // a' and b' NORed = ab
        else s = pair(() => {                                                     // xor: 4 NORs give XNOR
          const a = A.pos(), b = B.pos();
          const n1 = mkGate([a, b]);
          return mkGate([mkGate([a, n1]), mkGate([b, n1])]);
        }, false);
      }
    }
    memo.set(k, s);
    return s;
  }

  const rootId = sig(ast).pos();
  const inputs = [
    ...collectVars(ast).map((v) => ({ id: v, label: v })),
    ...[...consts].sort().map((v) => ({ id: `K${v}`, label: String(v), fixed: v })),
  ];
  return { circuit: layoutNetlist({ inputs, gates, rootId }), gateCount: gates.length };
}

/**
 * Try the simplified form, the minimal SOP, the minimal POS and the original,
 * and keep whichever needs the fewest gates in this gate family.
 */
export function bestUniversal(forms, base) {
  const list = [
    { id: 'final', node: forms.final },
    { id: 'sop', node: forms.sop },
    { id: 'pos', node: forms.pos },
    { id: 'orig', node: forms.orig },
  ];
  let best = null;
  list.forEach((c) => {
    const r = buildUniversal(toBinary(c.node), base);
    if (!best || r.gateCount < best.gateCount) best = { ...r, id: c.id, node: c.node };
  });
  return best;
}