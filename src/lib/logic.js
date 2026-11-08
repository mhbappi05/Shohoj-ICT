export const GATES = ['AND', 'OR', 'NOT', 'NAND', 'NOR', 'XOR', 'XNOR'];

export const EXPR = {
    AND: 'Y = A · B',
    OR: 'Y = A + B',
    NOT: 'Y = A′',
    NAND: 'Y = (A · B)′',
    NOR: 'Y = (A + B)′',
    XOR: 'Y = A ⊕ B',
    XNOR: 'Y = (A ⊕ B)′',
};

export function gateEval(type, ins) {
    const and = ins.every(Boolean) ? 1 : 0;
    const or = ins.some(Boolean) ? 1 : 0;
    const xor = ins.reduce((a, b) => a ^ b, 0) & 1;
    switch (type) {
        case 'AND': return and;
        case 'OR': return or;
        case 'NOT': return ins[0] ? 0 : 1;
        case 'NAND': return 1 - and;
        case 'NOR': return 1 - or;
        case 'XOR': return xor;
        case 'XNOR': return 1 - xor;
        default: return 0;
    }
}

/** Evaluate every node of a circuit. Inputs with a `fixed` value ignore inputVals. */
export function evalCircuit(c, inputVals) {
    const vals = {};
    c.inputs.forEach((i) => {
        vals[i.id] = i.fixed !== undefined ? i.fixed : inputVals[i.id] ? 1 : 0;
    });
    const gmap = Object.fromEntries(c.gates.map((g) => [g.id, g]));
    const get = (id) => {
        if (id in vals) return vals[id];
        const g = gmap[id];
        vals[id] = gateEval(g.type, g.in.map(get));
        return vals[id];
    };
    c.gates.forEach((g) => get(g.id));
    const outVals = {};
    c.outputs.forEach((o) => { outVals[o.id] = get(o.from); });
    return { nodeVals: vals, outVals };
}

/** Truth table by running the circuit on every combination of the free inputs. */
export function buildTable(c) {
    const names = c.inputs.filter((i) => i.fixed === undefined).map((i) => i.id);
    const n = names.length;
    const rows = [];
    for (let k = 0; k < 2 ** n; k++) {
        const ins = names.map((_, i) => (k >> (n - 1 - i)) & 1);
        const vals = Object.fromEntries(names.map((nm, i) => [nm, ins[i]]));
        const { outVals } = evalCircuit(c, vals);
        rows.push({ ins, outs: c.outputs.map((o) => outVals[o.id]) });
    }
    return { inputNames: names, outputNames: c.outputs.map((o) => o.label), rows };
}

/** Index of the truth-table row matching the current input values. */
export function activeRow(names, vals) {
    return names.reduce((acc, nm) => acc * 2 + (vals[nm] ? 1 : 0), 0);
}