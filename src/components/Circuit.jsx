import { evalCircuit } from '../lib/logic';
import GateSymbol from './GateSymbol';

const R = 12;
const INK = '#10202F';
const HIGH = '#00A676';
const LOW = '#9AA7B4';

const pinYs = (g) => (g.in.length === 1 ? [g.y + 20] : [g.y + 10, g.y + 30]);
const path = (w) =>
  w.from.y === w.to.y
    ? `M${w.from.x} ${w.from.y}H${w.to.x}`
    : `M${w.from.x} ${w.from.y}H${w.xm}V${w.to.y}H${w.to.x}`;

/** Draws a circuit netlist as scalable SVG; wires light up with the signal. */
export default function Circuit({ circuit, values, label }) {
  const { nodeVals, outVals } = evalCircuit(circuit, values);

  const src = {};
  circuit.inputs.forEach((i) => { src[i.id] = { x: i.x + R, y: i.y }; });
  circuit.gates.forEach((g) => { src[g.id] = { x: g.x + 68, y: g.y + 20 }; });

  const wires = [];
  circuit.gates.forEach((g) => {
    const ys = pinYs(g);
    g.in.forEach((from, k) => {
      wires.push({ fromId: from, from: src[from], to: { x: g.x + 6, y: ys[k] }, xm: g.x - 10 - 8 * k, v: nodeVals[from] });
    });
  });
  circuit.outputs.forEach((o) => {
    wires.push({ fromId: o.from, from: src[o.from], to: { x: o.x - R, y: o.y }, xm: o.x - R - 8, v: nodeVals[o.from] });
  });

  // Junction dots where one signal feeds several pins
  const uses = {};
  wires.forEach((w) => { uses[w.fromId] = (uses[w.fromId] || 0) + 1; });
  const dots = Object.keys(uses).filter((id) => uses[id] > 1);

  // Draw 0-wires first so lit wires stay on top at crossings
  const ordered = [...wires].sort((a, b) => a.v - b.v);

  return (
    <svg
      viewBox={`0 0 ${circuit.width} ${circuit.height}`}
      className="mx-auto block w-full max-w-xl"
      role="img"
      aria-label={label}
    >
      {ordered.map((w, i) => (
        <path
          key={i} d={path(w)} fill="none" strokeWidth="3" strokeLinejoin="round"
          stroke={w.v ? HIGH : LOW} style={{ transition: 'stroke .3s' }}
        />
      ))}
      {dots.map((id) => (
        <circle key={id} cx={src[id].x + 6} cy={src[id].y} r="3.5" fill={nodeVals[id] ? HIGH : LOW} />
      ))}

      {circuit.gates.map((g) => (
        <GateSymbol key={g.id} type={g.type} x={g.x} y={g.y} out={nodeVals[g.id]} />
      ))}

      {circuit.inputs.map((i) => {
        const on = nodeVals[i.id];
        return (
          <g key={i.id}>
            <circle cx={i.x} cy={i.y} r={R} fill={on ? HIGH : '#fff'} stroke={on ? HIGH : LOW} strokeWidth="2" style={{ transition: 'fill .3s' }} />
            <text x={i.x} y={i.y + 4} textAnchor="middle" fontSize={i.label.length > 1 ? 9 : 12} fontWeight="700" fill={on ? '#fff' : INK}>{i.label}</text>
          </g>
        );
      })}

      {circuit.outputs.map((o) => {
        const on = outVals[o.id];
        return (
          <g key={o.id}>
            <text x={o.x} y={o.y - R - 4} textAnchor="middle" fontSize="11" fontWeight="600" fill={INK}>{o.label}</text>
            <circle cx={o.x} cy={o.y} r={R} fill={on ? HIGH : '#fff'} stroke={on ? HIGH : LOW} strokeWidth="2" style={{ transition: 'fill .3s' }} />
            <text x={o.x} y={o.y + 5} textAnchor="middle" fontSize="14" fontWeight="700" fill={on ? '#fff' : INK}>{on}</text>
          </g>
        );
      })}
    </svg>
  );
}