// Boolean simplification: laws of Boolean algebra (with named steps) + Quine–McCluskey.
// Works on an n-ary AST: var | const | not{a} | and{args} | or{args} | xor{a,b}

const K = (v) => ({ t: 'const', v });
const V = (n) => ({ t: 'var', n });
const NOT = (a) => ({ t: 'not', a });
const isK = (n, v) => n.t === 'const' && n.v === v;
const negOf = (x) => (x.t === 'not' ? x.a : NOT(x));

/** Build an and/or node: flatten same-type children, unwrap 0 or 1 argument. */
export function mk(t, args) {
  const flat = [];
  args.forEach((a) => (a.t === t ? flat.push(...a.args) : flat.push(a)));
  if (flat.length === 0) return K(t === 'and' ? 1 : 0);
  if (flat.length === 1) return flat[0];
  return { t, args: flat };
}

/** Parser AST (binary) -> n-ary AST */
export function toNary(n) {
  switch (n.t) {
    case 'var': case 'const': return n;
    case 'not': return NOT(toNary(n.a));
    case 'xor': return { t: 'xor', a: toNary(n.a), b: toNary(n.b) };
    default: return mk(n.t, [toNary(n.a), toNary(n.b)]);
  }
}

/** n-ary AST -> binary AST (left-associative), as the circuit builders expect */
export function toBinary(n) {
  switch (n.t) {
    case 'var': case 'const': return n;
    case 'not': return NOT(toBinary(n.a));
    case 'xor': return { t: 'xor', a: toBinary(n.a), b: toBinary(n.b) };
    default: return n.args.map(toBinary).reduce((a, b) => ({ t: n.t, a, b }));
  }
}

export const key = (n) =>
  n.t === 'var' ? n.n
  : n.t === 'const' ? `#${n.v}`
  : n.t === 'not' ? `!${key(n.a)}`
  : n.t === 'xor' ? `(x ${[key(n.a), key(n.b)].sort().join(' ')})`
  : `(${n.t} ${n.args.map(key).sort().join(' ')})`;

export function varsOf(n) {
  const s = new Set();
  (function walk(x) {
    if (x.t === 'var') s.add(x.n);
    else if (x.t === 'not') walk(x.a);
    else if (x.t === 'xor') { walk(x.a); walk(x.b); }
    else if (x.t !== 'const') x.args.forEach(walk);
  })(n);
  return [...s].sort();
}

export function evalN(n, v) {
  switch (n.t) {
    case 'var': return v[n.n];
    case 'const': return n.v;
    case 'not': return 1 - evalN(n.a, v);
    case 'xor': return evalN(n.a, v) ^ evalN(n.b, v);
    case 'and': return n.args.every((a) => evalN(a, v)) ? 1 : 0;
    default: return n.args.some((a) => evalN(a, v)) ? 1 : 0;
  }
}

/** Readable form, e.g. A·B + C′ */
export function ppN(n) {
  switch (n.t) {
    case 'var': return n.n;
    case 'const': return String(n.v);
    case 'not': {
      const c = n.a;
      const simple = c.t === 'var' || c.t === 'const' || c.t === 'not';
      return (simple ? ppN(c) : `(${ppN(c)})`) + '′';
    }
    case 'xor': {
      const w = (c, left) => (c.t === 'or' || (c.t === 'xor' && !left) ? `(${ppN(c)})` : ppN(c));
      return `${w(n.a, true)} ⊕ ${w(n.b, false)}`;
    }
    case 'and':
      return n.args.map((c) => (c.t === 'or' || c.t === 'xor' ? `(${ppN(c)})` : ppN(c))).join('·');
    default:
      return n.args.map(ppN).join(' + ');
  }
}

/** Cost = literals first, then operators. */
export function cost(n) {
  let lits = 0, ops = 0;
  (function w(x) {
    switch (x.t) {
      case 'var': lits++; break;
      case 'const': break;
      case 'not': ops++; w(x.a); break;
      case 'xor': ops++; w(x.a); w(x.b); break;
      default: ops += x.args.length - 1; x.args.forEach(w);
    }
  })(n);
  return { lits, ops };
}
export const cheaper = (a, b) => a.lits < b.lits || (a.lits === b.lits && a.ops < b.ops);

const size = (n) =>
  n.t === 'var' || n.t === 'const' ? 1
  : n.t === 'not' ? 1 + size(n.a)
  : n.t === 'xor' ? 1 + size(n.a) + size(n.b)
  : 1 + n.args.reduce((s, a) => s + size(a), 0);

// ---------------------------------------------------------------- laws

function dedupe(args) {
  const seen = new Set();
  const out = [];
  let dup = false;
  args.forEach((a) => {
    const k = key(a);
    if (seen.has(k)) dup = true; else { seen.add(k); out.push(a); }
  });
  return { out, dup, seen };
}

/** Terms p, q that differ in exactly one complemented factor -> their common part */
function combine(p, q) {
  if (p.length !== q.length) return null;
  const kp = p.map(key), kq = q.map(key);
  const onlyP = p.filter((_, i) => !kq.includes(kp[i]));
  const onlyQ = q.filter((_, i) => !kp.includes(kq[i]));
  if (onlyP.length !== 1 || onlyQ.length !== 1) return null;
  if (key(onlyQ[0]) !== key(negOf(onlyP[0]))) return null;
  return p.filter((_, i) => kq.includes(kp[i]));
}

function applyHere(n, dist) {
  switch (n.t) {
    case 'var': case 'const': return null;
    case 'not': {
      const a = n.a;
      if (a.t === 'not') return { node: a.a, law: 'doubleNeg' };
      if (a.t === 'const') return { node: K(1 - a.v), law: 'constNot' };
      if (a.t === 'and') return { node: mk('or', a.args.map(NOT)), law: 'deMorgan' };
      if (a.t === 'or') return { node: mk('and', a.args.map(NOT)), law: 'deMorgan' };
      return null;
    }
    case 'xor': {
      const { a, b } = n;
      if (key(a) === key(b)) return { node: K(0), law: 'xor' };
      if (key(a) === key(negOf(b))) return { node: K(1), law: 'xor' };
      if (isK(a, 0)) return { node: b, law: 'xor' };
      if (isK(b, 0)) return { node: a, law: 'xor' };
      if (isK(a, 1)) return { node: NOT(b), law: 'xor' };
      if (isK(b, 1)) return { node: NOT(a), law: 'xor' };
      return null;
    }
    case 'and': {
      const args = n.args;
      if (args.some((a) => isK(a, 0))) return { node: K(0), law: 'null' };
      if (args.some((a) => isK(a, 1))) return { node: mk('and', args.filter((a) => !isK(a, 1))), law: 'identity' };
      const d = dedupe(args);
      if (d.dup) return { node: mk('and', d.out), law: 'idempotent' };
      if (args.some((a) => d.seen.has(key(negOf(a))))) return { node: K(0), law: 'complement' };
      for (let i = 0; i < args.length; i++) {
        const kx = key(args[i]);
        const knx = key(negOf(args[i]));
        for (let j = 0; j < args.length; j++) {
          if (i === j || args[j].t !== 'or') continue;
          const y = args[j];
          if (y.args.some((z) => key(z) === kx)) {
            return { node: mk('and', args.filter((_, k) => k !== j)), law: 'absorption' };
          }
          const idx = y.args.findIndex((z) => key(z) === knx);
          if (idx >= 0) {
            const ny = mk('or', y.args.filter((_, k) => k !== idx));
            return { node: mk('and', args.map((a, k) => (k === j ? ny : a))), law: 'redundancy' };
          }
        }
      }
      if (dist) {
        const j = args.findIndex((a) => a.t === 'or');
        if (j >= 0) {
          return {
            node: mk('or', args[j].args.map((p) => mk('and', args.map((a, k) => (k === j ? p : a))))),
            law: 'distributive',
          };
        }
      }
      return null;
    }
    default: { // or
      const args = n.args;
      if (args.some((a) => isK(a, 1))) return { node: K(1), law: 'null' };
      if (args.some((a) => isK(a, 0))) return { node: mk('or', args.filter((a) => !isK(a, 0))), law: 'identity' };
      const d = dedupe(args);
      if (d.dup) return { node: mk('or', d.out), law: 'idempotent' };
      if (args.some((a) => d.seen.has(key(negOf(a))))) return { node: K(1), law: 'complement' };
      for (let i = 0; i < args.length; i++) {
        const kx = key(args[i]);
        const knx = key(negOf(args[i]));
        for (let j = 0; j < args.length; j++) {
          if (i === j || args[j].t !== 'and') continue;
          const y = args[j];
          if (y.args.some((z) => key(z) === kx)) {
            return { node: mk('or', args.filter((_, k) => k !== j)), law: 'absorption' };
          }
          const idx = y.args.findIndex((z) => key(z) === knx);
          if (idx >= 0) {
            const ny = mk('and', y.args.filter((_, k) => k !== idx));
            return { node: mk('or', args.map((a, k) => (k === j ? ny : a))), law: 'redundancy' };
          }
        }
      }
      const terms = args.map((a) => (a.t === 'and' ? a.args : [a]));
      for (let i = 0; i < args.length; i++) {
        for (let j = i + 1; j < args.length; j++) {
          const c = combine(terms[i], terms[j]);
          if (c) {
            const merged = mk('and', c);
            return {
              node: mk('or', args.map((a, k) => (k === i ? merged : a)).filter((_, k) => k !== j)),
              law: 'combining',
            };
          }
        }
      }
      for (let i = 0; i < args.length; i++) {
        for (let j = i + 1; j < args.length; j++) {
          const kp = terms[i].map(key), kq = terms[j].map(key);
          const clash = terms[i].filter((e) => kq.includes(key(negOf(e))));
          if (clash.length !== 1) continue;
          const kc = key(clash[0]), knc = key(negOf(clash[0]));
          const cons = new Set([...kp.filter((k) => k !== kc), ...kq.filter((k) => k !== knc)]);
          for (let r = 0; r < args.length; r++) {
            if (r === i || r === j) continue;
            const kr = new Set(terms[r].map(key));
            if (kr.size === cons.size && [...kr].every((k) => cons.has(k))) {
              return { node: mk('or', args.filter((_, k) => k !== r)), law: 'consensus' };
            }
          }
        }
      }
      return null;
    }
  }
}

function rewriteOnce(n, dist) {
  if (n.t === 'not') {
    const r = rewriteOnce(n.a, dist);
    if (r) return { node: NOT(r.node), law: r.law };
  } else if (n.t === 'xor') {
    let r = rewriteOnce(n.a, dist);
    if (r) return { node: { t: 'xor', a: r.node, b: n.b }, law: r.law };
    r = rewriteOnce(n.b, dist);
    if (r) return { node: { t: 'xor', a: n.a, b: r.node }, law: r.law };
  } else if (n.t === 'and' || n.t === 'or') {
    for (let i = 0; i < n.args.length; i++) {
      const r = rewriteOnce(n.args[i], dist);
      if (r) return { node: mk(n.t, n.args.map((a, k) => (k === i ? r.node : a))), law: r.law };
    }
  }
  return applyHere(n, dist);
}

// Distribution is a last resort: only when no other law applies anywhere.
function runLaws(start) {
  let cur = start;
  const steps = [];
  for (let it = 0; it < 80; it++) {
    const r = rewriteOnce(cur, false) || rewriteOnce(cur, true);
    if (!r) break;
    cur = r.node;
    steps.push({ law: r.law, node: cur });
    if (size(cur) > 150) return null;
  }
  return { final: cur, steps };
}

// ------------------------------------------------- Quine–McCluskey

function primeImplicants(minterms) {
  let cur = new Map(minterms.map((m) => [`${m}|0`, { val: m, mask: 0 }]));
  const primes = [];
  while (cur.size) {
    const list = [...cur.values()];
    const used = new Set();
    const next = new Map();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        if (a.mask !== b.mask) continue;
        const diff = a.val ^ b.val;
        if (diff && (diff & (diff - 1)) === 0) {
          used.add(i); used.add(j);
          const nm = { val: a.val & ~diff, mask: a.mask | diff };
          next.set(`${nm.val}|${nm.mask}`, nm);
        }
      }
    }
    list.forEach((x, i) => { if (!used.has(i)) primes.push(x); });
    cur = next;
  }
  return primes;
}

const pop = (x) => { let c = 0; while (x) { c += x & 1; x >>= 1; } return c; };
const covers = (p, m) => (m & ~p.mask) === p.val;

function minimalCover(minterms, n) {
  if (minterms.length === 0) return [];
  const primes = primeImplicants(minterms);
  const chosen = [];
  minterms.forEach((m) => {
    const ps = primes.filter((p) => covers(p, m));
    if (ps.length === 1 && !chosen.includes(ps[0])) chosen.push(ps[0]);
  });
  const left = minterms.filter((m) => !chosen.some((p) => covers(p, m)));
  if (left.length) {
    const rest = primes.filter((p) => !chosen.includes(p));
    let best = null;
    if (rest.length <= 18) {
      for (let s = 1; s < 1 << rest.length; s++) {
        const pick = rest.filter((_, i) => (s >> i) & 1);
        if (!left.every((m) => pick.some((p) => covers(p, m)))) continue;
        const lits = pick.reduce((a, p) => a + n - pop(p.mask), 0);
        if (!best || lits < best.lits || (lits === best.lits && pick.length < best.pick.length)) best = { pick, lits };
      }
    }
    if (best) chosen.push(...best.pick);
    else { // greedy fallback
      let rem = [...left];
      while (rem.length) {
        const p = rest.slice().sort((a, b) => rem.filter((m) => covers(b, m)).length - rem.filter((m) => covers(a, m)).length)[0];
        chosen.push(p);
        rem = rem.filter((m) => !covers(p, m));
      }
    }
  }
  return chosen;
}

function literals(imp, names, flip) {
  const n = names.length;
  const out = [];
  names.forEach((nm, i) => {
    const b = n - 1 - i;
    if ((imp.mask >> b) & 1) return;
    const bit = (imp.val >> b) & 1;
    const positive = flip ? !bit : !!bit;
    out.push(positive ? V(nm) : NOT(V(nm)));
  });
  return out;
}

/** Minimal sum of products and minimal product of sums from a truth table. */
export function minimalForms(ones, zeros, names) {
  const n = names.length;
  const sop = mk('or', minimalCover(ones, n).map((p) => mk('and', literals(p, names, false))));
  const pos = mk('and', minimalCover(zeros, n).map((p) => mk('or', literals(p, names, true))));
  return { sop, pos };
}

// ------------------------------------------------------------ driver

/**
 * Simplify a parsed expression. Returns the original, the best form found,
 * the named steps that lead to it, and the alternative forms.
 */
export function simplify(ast) {
  const orig = toNary(ast);
  const names = varsOf(orig);
  const n = names.length;
  const ones = [], zeros = [];
  const assign = (k) => Object.fromEntries(names.map((nm, i) => [nm, (k >> (n - 1 - i)) & 1]));
  for (let k = 0; k < 2 ** n; k++) (evalN(orig, assign(k)) ? ones : zeros).push(k);
  const { sop, pos } = minimalForms(ones, zeros, names);

  // Law-based path: keep the cheapest point along the steps (stop before it gets worse)
  let lawsPath = null;
  const laws = runLaws(orig);
  if (laws) {
    const ok = [...Array(2 ** n).keys()].every((k) => evalN(laws.final, assign(k)) === evalN(orig, assign(k)));
    if (ok) {
      let bestCost = cost(orig), idx = -1;
      laws.steps.forEach((st, i) => {
        const c = cost(st.node);
        if (cheaper(c, bestCost)) { bestCost = c; idx = i; }
      });
      if (idx >= 0) lawsPath = { final: laws.steps[idx].node, steps: laws.steps.slice(0, idx + 1) };
    }
  }

  const cands = [{ id: 'orig', node: orig }];
  if (lawsPath) cands.push({ id: 'laws', node: lawsPath.final });
  cands.push({ id: 'sop', node: sop }, { id: 'pos', node: pos });
  let best = cands[0];
  cands.forEach((c) => { if (cheaper(cost(c.node), cost(best.node))) best = c; });

  let steps = [];
  if (best.id === 'laws') steps = lawsPath.steps;
  else if (best.id === 'sop' || best.id === 'pos') {
    steps = lawsPath && key(lawsPath.final) !== key(best.node) ? [...lawsPath.steps] : [];
    steps.push({ law: best.id === 'sop' ? 'kmap' : 'kmapPos', node: best.node });
  }

  return {
    orig,
    final: best.node,
    finalBinary: toBinary(best.node),
    steps,
    changed: best.id !== 'orig',
    forms: { orig, final: best.node, sop, pos },
    names,
  };
}