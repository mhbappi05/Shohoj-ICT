// Circuit = { width, height, inputs, gates, outputs } drawn in SVG units.
// A gate is 68 wide x 40 tall; input pins sit at y+10 / y+30 (y+20 for NOT).
const inp = (id, x, y) => ({ id, label: id, x, y });
const out = (id, from, x, y) => ({ id, label: id, from, x, y });

export function singleGate(type) {
  const one = type === 'NOT';
  return {
    width: 280, height: 100,
    inputs: one ? [inp('A', 24, 50)] : [inp('A', 24, 22), inp('B', 24, 78)],
    gates: [{ id: 'g1', type, x: 112, y: 30, in: one ? ['A'] : ['A', 'B'] }],
    outputs: [out('Y', 'g1', 256, 50)],
  };
}

/** Build NOT / AND / OR from only NAND or only NOR. */
export function universal(base, target) {
  if (target === 'NOT') {
    return {
      width: 300, height: 100,
      inputs: [inp('A', 24, 50)],
      gates: [{ id: 'g1', type: base, x: 120, y: 30, in: ['A', 'A'] }],
      outputs: [out('Y', 'g1', 264, 50)],
    };
  }
  const twoGate = target === (base === 'NAND' ? 'AND' : 'OR');
  if (twoGate) {
    return {
      width: 360, height: 100,
      inputs: [inp('A', 24, 22), inp('B', 24, 78)],
      gates: [
        { id: 'g1', type: base, x: 84, y: 30, in: ['A', 'B'] },
        { id: 'g2', type: base, x: 190, y: 30, in: ['g1', 'g1'] },
      ],
      outputs: [out('Y', 'g2', 330, 50)],
    };
  }
  return {
    width: 360, height: 130,
    inputs: [inp('A', 24, 28), inp('B', 24, 92)],
    gates: [
      { id: 'g1', type: base, x: 84, y: 6, in: ['A', 'A'] },
      { id: 'g2', type: base, x: 84, y: 70, in: ['B', 'B'] },
      { id: 'g3', type: base, x: 200, y: 38, in: ['g1', 'g2'] },
    ],
    outputs: [out('Y', 'g3', 338, 58)],
  };
}

export function halfAdder() {
  return {
    width: 300, height: 130,
    inputs: [inp('A', 24, 20), inp('B', 24, 100)],
    gates: [
      { id: 'g1', type: 'XOR', x: 110, y: 10, in: ['A', 'B'] },
      { id: 'g2', type: 'AND', x: 110, y: 70, in: ['A', 'B'] },
    ],
    outputs: [out('Sum', 'g1', 262, 30), out('Carry', 'g2', 262, 90)],
  };
}

export function fullAdder() {
  return {
    width: 400, height: 150,
    inputs: [inp('A', 22, 16), inp('B', 22, 92), inp('Cin', 22, 56)],
    gates: [
      { id: 'g1', type: 'XOR', x: 82, y: 6, in: ['A', 'B'] },
      { id: 'g3', type: 'AND', x: 82, y: 66, in: ['A', 'B'] },
      { id: 'g2', type: 'XOR', x: 192, y: 6, in: ['g1', 'Cin'] },
      { id: 'g4', type: 'AND', x: 192, y: 92, in: ['g1', 'Cin'] },
      { id: 'g5', type: 'OR', x: 292, y: 66, in: ['g3', 'g4'] },
    ],
    outputs: [out('Sum', 'g2', 384, 26), out('Cout', 'g5', 384, 86)],
  };
}