// Flowcharts for the HSC algorithms. Each node says what it draws AND what it does,
// so the same data drives the picture and the step-by-step execution.

const CH = 6.4; // approximate character width at font-size 12

function mkNode(id, type, x, y, lines, o = {}) {
  const text = Array.isArray(lines) ? lines : [lines];
  const longest = Math.max(...text.map((l) => l.length));
  let w = o.w;
  let h = o.h;
  if (type === 'start' || type === 'end') { w = w || 84; h = h || 30; }
  else if (type === 'decision') { w = w || 130; h = h || 56; }
  else if (type === 'io') { w = w || Math.max(96, Math.round(longest * CH + 40)); h = h || Math.max(34, text.length * 15 + 14); }
  else { w = w || Math.max(84, Math.round(longest * CH + 26)); h = h || Math.max(34, text.length * 15 + 14); }
  return { id, type, x, y, w, h, text, ...o.run };
}

const port = (n, side) => ({
  top: [n.x, n.y - n.h / 2], bottom: [n.x, n.y + n.h / 2],
  left: [n.x - n.w / 2, n.y], right: [n.x + n.w / 2, n.y],
}[side]);

/** Build node and edge geometry. edges: [from, fromPort, to, toPort, { label, via }] */
function build(def) {
  const nodes = def.nodes;
  const byId = Object.fromEntries(nodes.map((n) => [n.id, n]));
  const edges = def.edges.map(([from, fp, to, tp, o = {}], i) => {
    const a = port(byId[from], fp);
    const b = port(byId[to], tp);
    let via = [];
    if (o.via === 'hv') { if (a[0] !== b[0] && a[1] !== b[1]) via = [[b[0], a[1]]]; }
    else if (o.via === 'vh') { if (a[0] !== b[0] && a[1] !== b[1]) via = [[a[0], b[1]]]; }
    else if (Array.isArray(o.via)) via = o.via;
    const pts = [a, ...via, b];
    // the label sits beside the first segment
    const [p0, p1] = [pts[0], pts[1]];
    const horizontal = p0[1] === p1[1];
    const label = o.label
      ? { text: o.label, x: horizontal ? (p0[0] + p1[0]) / 2 : p0[0] + 8, y: horizontal ? p0[1] - 6 : (p0[1] + p1[1]) / 2 - 2, anchor: horizontal ? 'middle' : 'start' }
      : null;
    return { id: i, from, to, kind: o.label === 'Yes' ? 'yes' : o.label === 'No' ? 'no' : null, pts, label };
  });
  return { id: def.id, vars: def.vars, defaults: def.defaults, width: 340, height: def.height, nodes, edges };
}

const start = (x, y) => mkNode('start', 'start', x, y, 'Start');
const end = (id, x, y, o) => mkNode(id, 'end', x, y, 'End', o);
const input = (id, x, y, names, o) => mkNode(id, 'io', x, y, `Input ${names.join(', ')}`, { ...o, run: { kind: 'in', vars: names } });
const print = (id, x, y, lines, items, o = {}) => mkNode(id, 'io', x, y, lines, { ...o, run: { kind: 'out', print: items } });
const proc = (id, x, y, stmts, o = {}) => mkNode(id, 'process', x, y, stmts, { ...o, run: { kind: 'process', exec: stmts } });
const decide = (id, x, y, cond, o = {}) => mkNode(id, 'decision', x, y, `${cond} ?`, { ...o, run: { kind: 'decision', cond } });

// ---- Even or odd
const evenOdd = build({
  id: 'evenOdd', vars: { n: 'int' }, defaults: { n: '7' }, height: 360,
  nodes: [
    start(170, 26),
    input('in', 170, 80, ['n']),
    decide('d', 170, 160, 'n % 2 == 0', { w: 130, h: 60 }),
    print('yes', 65, 250, 'Print "Even"', [{ s: 'Even' }], { w: 110 }),
    print('no', 275, 250, 'Print "Odd"', [{ s: 'Odd' }], { w: 110 }),
    end('end', 170, 326),
  ],
  edges: [
    ['start', 'bottom', 'in', 'top'],
    ['in', 'bottom', 'd', 'top'],
    ['d', 'left', 'yes', 'top', { label: 'Yes', via: 'hv' }],
    ['d', 'right', 'no', 'top', { label: 'No', via: 'hv' }],
    ['yes', 'bottom', 'end', 'left', { via: 'vh' }],
    ['no', 'bottom', 'end', 'right', { via: 'vh' }],
  ],
});

// ---- Largest of three numbers
const largest = build({
  id: 'largest', vars: { a: 'int', b: 'int', c: 'int' }, defaults: { a: '12', b: '7', c: '19' }, height: 430,
  nodes: [
    start(170, 26),
    input('in', 170, 78, ['a', 'b', 'c'], { w: 150 }),
    decide('d1', 170, 150, 'a > b', { w: 140, h: 60 }),
    decide('d2', 70, 240, 'a > c', { w: 130, h: 60 }),
    decide('d3', 270, 240, 'b > c', { w: 130, h: 60 }),
    print('pa', 70, 330, 'Print a', [{ s: 'Largest = ' }, { e: 'a' }], { w: 90 }),
    print('pc', 170, 330, 'Print c', [{ s: 'Largest = ' }, { e: 'c' }], { w: 80 }),
    print('pb', 270, 330, 'Print b', [{ s: 'Largest = ' }, { e: 'b' }], { w: 90 }),
    end('end', 170, 396),
  ],
  edges: [
    ['start', 'bottom', 'in', 'top'],
    ['in', 'bottom', 'd1', 'top'],
    ['d1', 'left', 'd2', 'top', { label: 'Yes', via: 'hv' }],
    ['d1', 'right', 'd3', 'top', { label: 'No', via: 'hv' }],
    ['d2', 'bottom', 'pa', 'top', { label: 'Yes' }],
    ['d2', 'right', 'pc', 'top', { label: 'No', via: 'hv' }],
    ['d3', 'bottom', 'pb', 'top', { label: 'Yes' }],
    ['d3', 'left', 'pc', 'top', { label: 'No', via: 'hv' }],
    ['pa', 'bottom', 'end', 'left', { via: 'vh' }],
    ['pc', 'bottom', 'end', 'top'],
    ['pb', 'bottom', 'end', 'right', { via: 'vh' }],
  ],
});

// ---- Prime number check
const prime = build({
  id: 'prime', vars: { n: 'int', i: 'int' }, defaults: { n: '29' }, height: 490,
  nodes: [
    start(170, 26),
    input('in', 170, 76, ['n']),
    decide('d0', 170, 140, 'n < 2', { w: 90, h: 52 }),
    print('np0', 62, 196, ['Print', '"Not prime"'], [{ s: 'Not prime' }], { w: 100, h: 40 }),
    end('end0', 62, 248, { w: 50 }),
    proc('p1', 170, 206, ['i = 2'], { w: 80 }),
    decide('d1', 170, 288, 'i * i <= n', { w: 104, h: 56 }),
    print('pp', 292, 288, 'Print "Prime"', [{ s: 'Prime' }], { w: 90 }),
    end('end1', 292, 330, { w: 70 }),
    decide('d2', 170, 372, 'n % i == 0', { w: 104, h: 56 }),
    print('np', 290, 372, ['Print', '"Not prime"'], [{ s: 'Not prime' }], { w: 96, h: 40 }),
    end('end2', 290, 436, { w: 70 }),
    proc('p3', 170, 456, ['i = i + 1'], { w: 90 }),
  ],
  edges: [
    ['start', 'bottom', 'in', 'top'],
    ['in', 'bottom', 'd0', 'top'],
    ['d0', 'left', 'np0', 'top', { label: 'Yes', via: 'hv' }],
    ['np0', 'bottom', 'end0', 'top'],
    ['d0', 'bottom', 'p1', 'top', { label: 'No' }],
    ['p1', 'bottom', 'd1', 'top'],
    ['d1', 'right', 'pp', 'left', { label: 'No' }],
    ['pp', 'bottom', 'end1', 'top'],
    ['d1', 'bottom', 'd2', 'top', { label: 'Yes' }],
    ['d2', 'right', 'np', 'left', { label: 'Yes' }],
    ['np', 'bottom', 'end2', 'top'],
    ['d2', 'bottom', 'p3', 'top', { label: 'No' }],
    ['p3', 'left', 'd1', 'top', { via: [[106, 456], [106, 236], [170, 236]] }],
  ],
});

// ---- Loop template: factorial and 1 + 2 + ... + n
function loopChart(id, varName, varType, firstValue, bodyStmt, printLabel, nodeText) {
  return build({
    id, vars: { n: 'int', [varName]: varType, i: 'int' }, defaults: { n: '5' }, height: 390,
    nodes: [
      start(170, 26),
      input('in', 170, 78, ['n']),
      proc('p1', 170, 140, [`${varName} = ${firstValue}`, 'i = 1']),
      decide('d', 170, 222, 'i <= n', { w: 110, h: 56 }),
      proc('p2', 170, 296, [bodyStmt], { w: 130 }),
      proc('p3', 170, 348, ['i = i + 1'], { w: 100 }),
      print('out', 288, 222, nodeText, [{ s: printLabel }, { e: varName }], { w: 100 }),
      end('end', 288, 290, { w: 70 }),
    ],
    edges: [
      ['start', 'bottom', 'in', 'top'],
      ['in', 'bottom', 'p1', 'top'],
      ['p1', 'bottom', 'd', 'top'],
      ['d', 'bottom', 'p2', 'top', { label: 'Yes' }],
      ['p2', 'bottom', 'p3', 'top'],
      ['p3', 'left', 'd', 'top', { via: [[40, 348], [40, 178], [170, 178]] }],
      ['d', 'right', 'out', 'left', { label: 'No' }],
      ['out', 'bottom', 'end', 'top'],
    ],
  });
}
const factorial = loopChart('factorial', 'fact', 'long', '1', 'fact = fact * i', 'Factorial = ', 'Print fact');
const seriesSum = loopChart('seriesSum', 'sum', 'long', '0', 'sum = sum + i', 'Sum = ', 'Print sum');

export const CHARTS = [evenOdd, largest, prime, factorial, seriesSum];
export const chartById = (id) => CHARTS.find((c) => c.id === id);