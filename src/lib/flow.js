// Step-by-step executor for a flowchart. Expressions use the same engine as the C visualizer.
import { Machine, parseExpressionString, CError } from './cinterp';

const MAX_STEPS = 2000;
const isFloat = (ty) => ty === 'float' || ty === 'double';

function showValue(v) {
  if (typeof v.v === 'bigint') return v.v.toString();
  return String(Number(v.v.toFixed(6)));
}

export class FlowRun {
  constructor(chart) {
    this.chart = chart;
    this.nodes = Object.fromEntries(chart.nodes.map((n) => [n.id, n]));
    this.m = new Machine();
    this.m.pushScope();
    this.vars = {};
    Object.entries(chart.vars).forEach(([name, ty]) => { this.vars[name] = this.m.declare(name, ty); });
    this.cache = new Map();
    this.cur = chart.nodes.find((n) => n.type === 'start').id;
    this.out = '';
    this.steps = 0;
    this.finished = false;
    this.hist = [this.snapshot(null, null, { key: 'ready', params: {} })];
    this.idx = 0;
  }

  snapshot(active, edge, note, extra = {}) {
    const s = {
      active, edge, next: this.cur, vars: this.m.varViews(), out: this.out, note,
      waiting: null, done: false, error: null, ...extra,
    };
    this.m.changed = new Set();
    return s;
  }

  get snap() { return this.hist[this.idx]; }
  get atEnd() { return this.idx === this.hist.length - 1; }
  get canBack() { return this.idx > 0; }
  get canNext() { return !this.atEnd || (!this.finished && !this.snap.waiting); }
  get waiting() { return this.atEnd ? this.snap.waiting : null; }

  push(s) { this.hist.push(s); this.idx = this.hist.length - 1; }
  back() { if (this.idx > 0) this.idx--; }

  expr(src) {
    if (!this.cache.has(src)) this.cache.set(src, parseExpressionString(src));
    return this.cache.get(src);
  }

  follow(id, kind) {
    return this.chart.edges.find((x) => x.from === id && (kind === null || x.kind === kind)) || null;
  }

  step() {
    if (!this.atEnd) { this.idx++; return; }
    if (this.finished || this.snap.waiting) return;
    this.run(this.cur, null);
  }

  /** Execute node `id`. For an input node, `values` holds what the user typed. */
  run(id, values) {
    const n = this.nodes[id];
    try {
      if (++this.steps > MAX_STEPS) throw new CError('stepLimit', {});
      let note;
      let kind = null;
      switch (n.kind || n.type) {
        case 'start': note = { key: 'start', params: {} }; break;
        case 'end': note = { key: 'end', params: {} }; break;
        case 'in': {
          if (!values) {
            this.push(this.snapshot(null, null, { key: 'waiting', params: { names: n.vars.join(', ') } }, { waiting: { vars: n.vars.map((v) => ({ name: v, ty: this.chart.vars[v] })) } }));
            this.steps--;
            return;
          }
          n.vars.forEach((v) => this.m.write(this.vars[v], 0, values[v]));
          note = { key: 'input', params: { names: n.vars.join(', ') } };
          break;
        }
        case 'process': {
          const lines = [];
          n.exec.forEach((src) => {
            this.m.lastWrite = null;
            this.m.eval(this.expr(src));
            if (this.m.lastWrite) lines.push(`${this.m.lastWrite.name} = ${this.m.lastWrite.value}`);
          });
          note = { key: 'process', params: { changes: lines.join(', ') } };
          break;
        }
        case 'decision': {
          const v = this.m.eval(this.expr(n.cond));
          const t = typeof v.v === 'bigint' ? v.v !== 0n : v.v !== 0;
          kind = t ? 'yes' : 'no';
          note = { key: t ? 'yes' : 'no', params: { src: n.cond } };
          break;
        }
        case 'out': {
          const text = n.print.map((it) => (it.s !== undefined ? it.s : showValue(this.m.eval(this.expr(it.e))))).join('');
          this.out += `${text}\n`;
          note = { key: 'output', params: { text } };
          break;
        }
        default: break;
      }
      const edge = n.type === 'end' ? null : this.follow(id, kind);
      this.cur = edge ? edge.to : id;
      if (n.type === 'end') this.finished = true;
      this.push(this.snapshot(id, edge ? edge.id : null, note, { done: n.type === 'end' }));
    } catch (e) {
      if (!(e instanceof CError)) throw e;
      this.finished = true;
      this.push(this.snapshot(id, null, { key: 'error', params: {} }, { error: { code: e.code, params: e.params } }));
    }
  }

  /** Called when the user submits the input form. Returns { ok } or { ok: false, name }. */
  provideInput(raw) {
    const n = this.nodes[this.cur];
    if (!this.waiting || (n.kind || n.type) !== 'in') return { ok: false };
    const values = {};
    for (const v of n.vars) {
      const text = String(raw[v] ?? '').trim();
      const ty = this.chart.vars[v];
      const okText = isFloat(ty) ? /^[+-]?(\d+\.?\d*|\.\d+)$/.test(text) : /^[+-]?\d+$/.test(text);
      if (!okText) return { ok: false, name: v };
      values[v] = isFloat(ty) ? { ty: 'double', v: Number(text) } : { ty: 'long', v: BigInt(text) };
    }
    this.run(this.cur, values);
    return { ok: true };
  }
}