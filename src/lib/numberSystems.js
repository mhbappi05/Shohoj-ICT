export const DIGITS = '0123456789ABCDEF';
export const BASES = [2, 8, 10, 16];

export function isValid(str, base) {
  if (!str) return false;
  return [...str.toUpperCase()].every((c) => {
    const i = DIGITS.indexOf(c);
    return i >= 0 && i < base;
  });
}

export function toDecimal(str, base) {
  const b = BigInt(base);
  return [...str.toUpperCase()].reduce(
    (acc, c) => acc * b + BigInt(DIGITS.indexOf(c)),
    0n
  );
}

export function fromDecimal(n, base) {
  if (n === 0n) return '0';
  const b = BigInt(base);
  let s = '';
  while (n > 0n) {
    s = DIGITS[Number(n % b)] + s;
    n /= b;
  }
  return s;
}

/** Each digit with its positional weight, most significant first. */
export function positionalBreakdown(str, base) {
  const chars = [...str.toUpperCase()];
  const b = BigInt(base);
  return chars.map((c, i) => {
    const pos = chars.length - 1 - i;
    const digit = DIGITS.indexOf(c);
    const weight = b ** BigInt(pos);
    return { char: c, digit, pos, weight, value: BigInt(digit) * weight };
  });
}

/** Repeated-division steps for decimal -> base. */
export function divisionSteps(n, base) {
  const b = BigInt(base);
  const steps = [];
  if (n === 0n) return [{ dividend: 0n, quotient: 0n, remainder: 0n }];
  while (n > 0n) {
    steps.push({ dividend: n, quotient: n / b, remainder: n % b });
    n /= b;
  }
  return steps;
}

/** Bit array (MSB first) of a non-negative integer, padded to `bits`. */
export function toBits(n, bits) {
  const s = n.toString(2).padStart(bits, '0');
  return [...s].map(Number);
}

/**
 * Build the 2's complement walkthrough for a decimal integer.
 * Returns null when the value does not fit in `bits`.
 */
export function twosComplementSteps(value, bits) {
  const min = -(2n ** BigInt(bits - 1));
  const max = 2n ** BigInt(bits - 1) - 1n;
  if (value < min || value > max) return null;

  const negative = value < 0n;
  const magnitude = negative ? -value : value;
  const direct = toBits(magnitude, bits);
  if (!negative) return { negative, direct, min, max };

  const inverted = direct.map((b) => 1 - b);
  const flipped = direct.map((b, i) => b !== inverted[i]);

  // Add 1 from the least significant bit, recording the carry INTO each position.
  const result = [...inverted];
  const carryIn = new Array(bits).fill(0);
  let carry = 1;
  for (let i = bits - 1; i >= 0; i--) {
    carryIn[i] = carry;
    const sum = result[i] + carry;
    result[i] = sum % 2;
    carry = sum > 1 ? 1 : 0;
  }
  const changed = result.map((b, i) => b !== inverted[i]);

  return { negative, direct, inverted, flipped, result, carryIn, changed, min, max };
}

/** Signed integer -> bit array (MSB first), wrapping like real hardware. */
export function toTwos(value, bits) {
  const mod = 1n << BigInt(bits);
  const u = ((value % mod) + mod) % mod;
  return toBits(u, bits);
}

/** Bit array read as a signed 2's complement number. */
export function fromTwos(bits) {
  const n = bits.length;
  let v = 0n;
  bits.forEach((b, i) => {
    if (!b) return;
    const w = 1n << BigInt(n - 1 - i);
    v += i === 0 ? -w : w;
  });
  return v;
}

/** Column-by-column binary addition. carryIn[i] is the carry INTO column i. */
export function addBits(x, y) {
  const n = x.length;
  const result = new Array(n).fill(0);
  const carryIn = new Array(n).fill(0);
  let c = 0;
  for (let i = n - 1; i >= 0; i--) {
    carryIn[i] = c;
    const s = x[i] + y[i] + c;
    result[i] = s % 2;
    c = s >> 1;
  }
  return { result, carryIn, carryOut: c };
}

/** Full walkthrough for A + B or A - B (as A + 2's complement of B). */
export function arithmetic(a, b, bits, op) {
  const aBits = toTwos(a, bits);
  const bBits = toTwos(b, bits);
  const one = new Array(bits).fill(0);
  one[bits - 1] = 1;

  let operand = bBits;
  let inv = null;
  let neg = null;
  if (op === 'sub') {
    inv = bBits.map((x) => 1 - x);
    neg = addBits(inv, one);
    operand = neg.result;
  }
  const sum = addBits(aBits, operand);
  const trueValue = op === 'sub' ? a - b : a + b;
  const p = 2n ** BigInt(bits - 1);
  return {
    aBits, bBits, one, inv, neg, operand, sum, trueValue,
    resultValue: fromTwos(sum.result),
    overflow: trueValue < -p || trueValue > p - 1n,
  };
}
