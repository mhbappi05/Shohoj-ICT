const INK = '#10202F';
const HIGH = '#00A676';
const LOW = '#9AA7B4';

const NEG = new Set(['NAND', 'NOR', 'XNOR', 'NOT']);
const SHAPE = { AND: 'AND', NAND: 'AND', OR: 'OR', NOR: 'OR', XOR: 'OR', XNOR: 'OR', NOT: 'NOT' };
const BODY = {
  AND: 'M0 0H28A22 20 0 0 1 28 40H0Z',
  OR: 'M0 0Q20 0 50 20Q20 40 0 40Q14 20 0 0Z',
  NOT: 'M0 2L46 20L0 38Z',
};

/** Standard gate symbol. (x, y) is the top-left; the output pin is at (x+68, y+20). */
export default function GateSymbol({ type, x, y, out }) {
  const tip = type === 'NOT' ? 46 : 50;
  const neg = NEG.has(type);
  return (
    <g transform={`translate(${x} ${y})`}>
      <line
        x1={neg ? tip + 8 : tip} y1="20" x2="68" y2="20"
        stroke={out ? HIGH : LOW} strokeWidth="3" style={{ transition: 'stroke .3s' }}
      />
      <path d={BODY[SHAPE[type]]} fill="#fff" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      {(type === 'XOR' || type === 'XNOR') && (
        <path d="M-6 0Q8 20 -6 40" fill="none" stroke={INK} strokeWidth="2" />
      )}
      {neg && <circle cx={tip + 4} cy="20" r="4" fill="#fff" stroke={INK} strokeWidth="2" />}
      <text x="30" y="52" textAnchor="middle" fontSize="10" fill={INK} opacity="0.6">{type}</text>
    </g>
  );
}