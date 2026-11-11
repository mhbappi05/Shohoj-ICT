// A small C interpreter for teaching. It runs as a step-by-step generator so the
// UI can show the current line, the variables in memory and the console output.
// Supported: int/char/short/long/unsigned/float/double, arrays (any dimension),
// printf, scanf, if/else, for, while, do-while, switch, break, continue, return,
// #define constants, a few <math.h> functions. Not supported: pointers, structs,
// functions other than main.

export class CError extends Error {
    constructor(code, params = {}, line = null) {
      super(code);
      this.code = code;
      this.params = params;
      this.line = line;
    }
  }
  
  // ------------------------------------------------------------------ values
  
  const INT_TYPES = {
    char: { bits: 8, s: true, size: 1 }, uchar: { bits: 8, s: false, size: 1 },
    short: { bits: 16, s: true, size: 2 }, ushort: { bits: 16, s: false, size: 2 },
    int: { bits: 32, s: true, size: 4 }, uint: { bits: 32, s: false, size: 4 },
    long: { bits: 64, s: true, size: 8 }, ulong: { bits: 64, s: false, size: 8 },
  };
  const isFloatTy = (t) => t === 'float' || t === 'double';
  const sizeOf = (t) => (isFloatTy(t) ? (t === 'float' ? 4 : 8) : INT_TYPES[t].size);
  const wrap = (ty, v) => (INT_TYPES[ty].s ? BigInt.asIntN(INT_TYPES[ty].bits, v) : BigInt.asUintN(INT_TYPES[ty].bits, v));
  const V = (ty, v) => ({ ty, v });
  const zero = (ty) => (isFloatTy(ty) ? 0 : 0n);
  
  function toTy(val, ty) {
    if (isFloatTy(ty)) {
      const n = typeof val.v === 'bigint' ? Number(val.v) : val.v;
      return V(ty, ty === 'float' ? Math.fround(n) : n);
    }
    if (typeof val.v === 'bigint') return V(ty, wrap(ty, val.v));
    if (!Number.isFinite(val.v)) return V(ty, 0n);
    return V(ty, wrap(ty, BigInt(Math.trunc(val.v))));
  }
  const isTrue = (x) => (typeof x.v === 'bigint' ? x.v !== 0n : x.v !== 0);
  const promote = (t) => (INT_TYPES[t] && INT_TYPES[t].bits < 32 ? 'int' : t);
  function common(a, b) {
    if (a === 'double' || b === 'double') return 'double';
    if (a === 'float' || b === 'float') return 'float';
    a = promote(a); b = promote(b);
    if (a === 'ulong' || b === 'ulong') return 'ulong';
    if (a === 'long' || b === 'long') return 'long';
    if (a === 'uint' || b === 'uint') return 'uint';
    return 'int';
  }
  
  function binop(op, x, y, line) {
    if (op === '<<' || op === '>>') {
      const t = promote(x.ty);
      if (isFloatTy(x.ty) || isFloatTy(y.ty)) throw new CError('unsupported', { what: 'shifting decimals' }, line);
      const a = toTy(x, t).v;
      const b = toTy(y, 'long').v;
      if (b < 0n || b > 64n) throw new CError('unsupported', { what: 'this shift amount' }, line);
      return V(t, wrap(t, op === '<<' ? a << b : a >> b));
    }
    const ty = common(x.ty, y.ty);
    const a = toTy(x, ty).v;
    const b = toTy(y, ty).v;
    switch (op) {
      case '==': return V('int', a === b ? 1n : 0n);
      case '!=': return V('int', a !== b ? 1n : 0n);
      case '<': return V('int', a < b ? 1n : 0n);
      case '>': return V('int', a > b ? 1n : 0n);
      case '<=': return V('int', a <= b ? 1n : 0n);
      case '>=': return V('int', a >= b ? 1n : 0n);
      default: break;
    }
    if (isFloatTy(ty)) {
      let r;
      if (op === '+') r = a + b;
      else if (op === '-') r = a - b;
      else if (op === '*') r = a * b;
      else if (op === '/') r = a / b;
      else throw new CError('unsupported', { what: `the ${op} operator on decimals` }, line);
      return V(ty, ty === 'float' ? Math.fround(r) : r);
    }
    let r;
    switch (op) {
      case '+': r = a + b; break;
      case '-': r = a - b; break;
      case '*': r = a * b; break;
      case '/': if (b === 0n) throw new CError('divZero', {}, line); r = a / b; break;
      case '%': if (b === 0n) throw new CError('divZero', {}, line); r = a % b; break;
      case '&': r = a & b; break;
      case '|': r = a | b; break;
      case '^': r = a ^ b; break;
      default: throw new CError('unsupported', { what: `the ${op} operator` }, line);
    }
    return V(ty, wrap(ty, r));
  }
  
  // ------------------------------------------------------------------- lexer
  
  const KEYWORDS = new Set([
    'int', 'float', 'double', 'char', 'long', 'short', 'unsigned', 'signed', 'void', 'const',
    'if', 'else', 'for', 'while', 'do', 'break', 'continue', 'return', 'switch', 'case', 'default', 'sizeof',
    'struct', 'typedef', 'enum', 'union', 'static', 'goto',
  ]);
  const OPS = [
    '<<=', '>>=', '++', '--', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '==', '!=', '<=', '>=',
    '&&', '||', '<<', '>>', '->',
    '+', '-', '*', '/', '%', '=', '<', '>', '!', '&', '|', '^', '~', '?', ':', ';', ',', '(', ')', '{', '}', '[', ']', '.',
  ];
  const ESC = { n: '\n', t: '\t', r: '\r', 0: '\0', '\\': '\\', "'": "'", '"': '"', a: '\x07', b: '\b' };
  
  function lex(src, macros = new Map(), depth = 0) {
    const toks = [];
    let i = 0, line = 1;
    const n = src.length;
    const isDigit = (c) => c !== undefined && c >= '0' && c <= '9';
    while (i < n) {
      const c = src[i];
      if (c === '\n') { line++; i++; continue; }
      if (/\s/.test(c)) { i++; continue; }
      if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
      if (c === '/' && src[i + 1] === '*') {
        i += 2;
        while (i < n && !(src[i] === '*' && src[i + 1] === '/')) { if (src[i] === '\n') line++; i++; }
        if (i >= n) throw new CError('unterminated', { what: '/*' }, line);
        i += 2;
        continue;
      }
      if (c === '#') {
        let j = i;
        while (j < n && src[j] !== '\n') j++;
        const m = /^#\s*define\s+([A-Za-z_]\w*)(\(?)\s*(.*)$/.exec(src.slice(i, j));
        if (m) {
          if (m[2]) throw new CError('unsupported', { what: 'macros with arguments' }, line);
          macros.set(m[1], m[3].trim());
        }
        i = j;
        continue;
      }
      const start = i;
      if (isDigit(c) || (c === '.' && isDigit(src[i + 1]))) {
        let j = i;
        if (c === '0' && (src[i + 1] === 'x' || src[i + 1] === 'X')) {
          j = i + 2;
          while (/[0-9a-fA-F]/.test(src[j] || '')) j++;
          const v = BigInt(src.slice(i, j));
          while (/[lLuU]/.test(src[j] || '')) j++;
          toks.push({ k: 'num', ty: v > 2147483647n ? 'long' : 'int', v, line, start, end: j });
          i = j;
          continue;
        }
        while (isDigit(src[j])) j++;
        let isF = false;
        if (src[j] === '.') { isF = true; j++; while (isDigit(src[j])) j++; }
        if ((src[j] === 'e' || src[j] === 'E') && (isDigit(src[j + 1]) || ((src[j + 1] === '+' || src[j + 1] === '-') && isDigit(src[j + 2])))) {
          isF = true; j += 2;
          while (isDigit(src[j])) j++;
        }
        const text = src.slice(i, j);
        let suffix = '';
        while (/[fFlLuU]/.test(src[j] || '')) suffix += src[j++];
        if (isF || /f/i.test(suffix)) {
          const isFloat = /f/i.test(suffix);
          toks.push({ k: 'num', ty: isFloat ? 'float' : 'double', v: isFloat ? Math.fround(Number(text)) : Number(text), line, start, end: j });
        } else {
          const v = BigInt(text);
          toks.push({ k: 'num', ty: /l/i.test(suffix) || v > 2147483647n ? 'long' : 'int', v, line, start, end: j });
        }
        i = j;
        continue;
      }
      if (c === '"' || c === "'") {
        let j = i + 1;
        let s = '';
        while (j < n && src[j] !== c) {
          if (src[j] === '\n') throw new CError('unterminated', { what: c }, line);
          if (src[j] === '\\') { j++; s += ESC[src[j]] !== undefined ? ESC[src[j]] : src[j]; } else s += src[j];
          j++;
        }
        if (j >= n) throw new CError('unterminated', { what: c }, line);
        j++;
        if (c === '"') toks.push({ k: 'str', v: s, line, start, end: j });
        else {
          if (s.length !== 1) throw new CError('unsupported', { what: 'this character constant' }, line);
          toks.push({ k: 'num', ty: 'int', v: BigInt(s.charCodeAt(0)), line, start, end: j });
        }
        i = j;
        continue;
      }
      if (/[A-Za-z_]/.test(c)) {
        let j = i;
        while (/\w/.test(src[j] || '')) j++;
        const word = src.slice(i, j);
        if (macros.has(word) && depth < 5) {
          lex(macros.get(word), macros, depth + 1).forEach((t) => toks.push({ ...t, line, start, end: j }));
        } else if (KEYWORDS.has(word)) toks.push({ k: 'kw', v: word, line, start, end: j });
        else toks.push({ k: 'id', v: word, line, start, end: j });
        i = j;
        continue;
      }
      const op = OPS.find((o) => src.startsWith(o, i));
      if (!op) throw new CError('unexpected', { tok: c }, line);
      toks.push({ k: 'op', v: op, line, start, end: i + op.length });
      i += op.length;
    }
    toks.push({ k: 'eof', v: '<end>', line, start: n, end: n });
    return depth > 0 ? toks.slice(0, -1) : toks; // macro bodies have no EOF token
  }
  
  // ------------------------------------------------------------------ parser
  
  const TYPE_WORDS = new Set(['int', 'float', 'double', 'char', 'long', 'short', 'unsigned', 'signed', 'void', 'const']);
  const BIN_PREC = {
    '||': 1, '&&': 2, '|': 3, '^': 4, '&': 5, '==': 6, '!=': 6, '<': 7, '>': 7, '<=': 7, '>=': 7,
    '<<': 8, '>>': 8, '+': 9, '-': 9, '*': 10, '/': 10, '%': 10,
  };
  const ASSIGN_OPS = new Set(['=', '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '<<=', '>>=']);
  
  class Parser {
    constructor(src) {
      this.src = src;
      this.toks = lex(src);
      this.pos = 0;
    }
  
    get tok() { return this.toks[this.pos]; }
    peek(o = 1) { return this.toks[Math.min(this.pos + o, this.toks.length - 1)]; }
    next() { const t = this.toks[this.pos]; if (t.k !== 'eof') this.pos++; return t; }
    is(v) { const t = this.tok; return (t.k === 'op' || t.k === 'kw') && t.v === v; }
    accept(v) { if (this.is(v)) { this.next(); return true; } return false; }
    prevLine() { return this.toks[Math.max(this.pos - 1, 0)].line; }
  
    expect(v) {
      if (this.accept(v)) return;
      const line = v === ';' || v === ')' || v === ']' ? this.prevLine() : this.tok.line;
      throw new CError('expected', { what: v }, line);
    }
    fail() {
      const t = this.tok;
      if (t.k === 'eof') throw new CError('unexpectedEnd', {}, t.line);
      throw new CError('unexpected', { tok: t.v }, t.line);
    }
    srcFrom(a) {
      const b = Math.max(this.pos - 1, a);
      return this.src.slice(this.toks[a].start, this.toks[b].end).replace(/\s+/g, ' ');
    }
    isTypeStart() { return this.tok.k === 'kw' && TYPE_WORDS.has(this.tok.v); }
  
    parseProgram() {
      const globals = [];
      let main = null;
      while (this.tok.k !== 'eof') {
        if (this.tok.k === 'kw' && ['struct', 'typedef', 'enum', 'union'].includes(this.tok.v)) {
          throw new CError('unsupported', { what: this.tok.v }, this.tok.line);
        }
        if (!this.isTypeStart()) this.fail();
        const save = this.pos;
        this.parseType();
        if (this.tok.k === 'id' && this.peek().v === '(' && this.peek().k === 'op') {
          const name = this.next().v;
          if (name !== 'main') throw new CError('unsupported', { what: 'functions other than main' }, this.tok.line);
          this.expect('(');
          if (this.is('void')) this.next();
          if (!this.is(')')) throw new CError('unsupported', { what: 'main with parameters' }, this.tok.line);
          this.expect(')');
          main = this.parseBlock();
        } else {
          this.pos = save;
          globals.push(this.parseDeclaration());
        }
      }
      if (!main) throw new CError('noMain', {}, 1);
      return { globals, main };
    }
  
    parseType() {
      const words = [];
      while (this.tok.k === 'kw' && TYPE_WORDS.has(this.tok.v)) words.push(this.next().v);
      if (!words.length) this.fail();
      const w = words.filter((x) => x !== 'const');
      const has = (x) => w.includes(x);
      const uns = has('unsigned');
      if (has('double')) return 'double';
      if (has('float')) return 'float';
      if (has('void')) return 'void';
      if (has('char')) return uns ? 'uchar' : 'char';
      if (has('short')) return uns ? 'ushort' : 'short';
      if (has('long')) return uns ? 'ulong' : 'long';
      return uns ? 'uint' : 'int';
    }
  
    parseDeclaration() {
      const a = this.pos;
      const line = this.tok.line;
      const ty = this.parseType();
      if (ty === 'void') throw new CError('unsupported', { what: 'void variables' }, line);
      const items = [];
      do {
        if (this.is('*')) throw new CError('unsupported', { what: 'pointers' }, this.tok.line);
        if (this.tok.k !== 'id') this.fail();
        const nameTok = this.next();
        const dims = [];
        while (this.accept('[')) {
          if (this.is(']')) dims.push(null); else dims.push(this.parseAssign());
          this.expect(']');
        }
        let init = null;
        if (this.accept('=')) init = this.is('{') ? this.parseInitList() : this.parseAssign();
        items.push({ name: nameTok.v, dims, init, line: nameTok.line });
      } while (this.accept(','));
      this.expect(';');
      return { t: 'decl', ty, items, line, src: this.srcFrom(a) };
    }
  
    parseInitList() {
      this.expect('{');
      const items = [];
      while (!this.is('}')) {
        items.push(this.is('{') ? this.parseInitList() : this.parseAssign());
        if (!this.accept(',')) break;
      }
      this.expect('}');
      return { t: 'list', items };
    }
  
    parseBlock() {
      const line = this.tok.line;
      this.expect('{');
      const body = [];
      while (!this.is('}')) {
        if (this.tok.k === 'eof') throw new CError('expected', { what: '}' }, this.tok.line);
        body.push(this.parseStatement());
      }
      this.expect('}');
      return { t: 'block', body, line };
    }
  
    parseCond() {
      this.expect('(');
      const a = this.pos;
      const c = this.parseExpr();
      const csrc = this.srcFrom(a);
      this.expect(')');
      return [c, csrc];
    }
  
    parseStatement() {
      const t = this.tok;
      const line = t.line;
      if (this.is('{')) return this.parseBlock();
      if (this.isTypeStart()) return this.parseDeclaration();
      if (this.accept(';')) return { t: 'block', body: [], line };
      if (t.k === 'kw') {
        switch (t.v) {
          case 'if': {
            this.next();
            const [c, csrc] = this.parseCond();
            const then = this.parseStatement();
            const els = this.accept('else') ? this.parseStatement() : null;
            return { t: 'if', c, csrc, then, else: els, line };
          }
          case 'while': {
            this.next();
            const [c, csrc] = this.parseCond();
            return { t: 'while', c, csrc, body: this.parseStatement(), line };
          }
          case 'do': {
            this.next();
            const body = this.parseStatement();
            if (!this.accept('while')) throw new CError('expected', { what: 'while' }, this.tok.line);
            const [c, csrc] = this.parseCond();
            this.expect(';');
            return { t: 'do', c, csrc, body, line };
          }
          case 'for': return this.parseFor();
          case 'switch': return this.parseSwitch();
          case 'break': this.next(); this.expect(';'); return { t: 'break', line };
          case 'continue': this.next(); this.expect(';'); return { t: 'continue', line };
          case 'return': {
            this.next();
            const e = this.is(';') ? null : this.parseExpr();
            this.expect(';');
            return { t: 'return', e, line };
          }
          case 'else': this.fail(); break;
          case 'goto': case 'struct': case 'typedef': case 'enum': case 'union': case 'static':
            throw new CError('unsupported', { what: t.v }, line);
          default: break;
        }
      }
      const a = this.pos;
      const e = this.parseExpr();
      const src = this.srcFrom(a);
      this.expect(';');
      return { t: 'expr', e, src, line };
    }
  
    parseFor() {
      const line = this.tok.line;
      this.next();
      this.expect('(');
      let init = null, isrc = '';
      if (this.isTypeStart()) { init = this.parseDeclaration(); isrc = init.src; }
      else if (!this.accept(';')) {
        const a = this.pos;
        init = this.parseExpr();
        isrc = this.srcFrom(a);
        this.expect(';');
      }
      let c = null, csrc = '';
      if (!this.is(';')) { const a = this.pos; c = this.parseExpr(); csrc = this.srcFrom(a); }
      this.expect(';');
      let update = null, usrc = '';
      if (!this.is(')')) { const a = this.pos; update = this.parseExpr(); usrc = this.srcFrom(a); }
      this.expect(')');
      return { t: 'for', init, isrc, c, csrc, update, usrc, body: this.parseStatement(), line };
    }
  
    parseSwitch() {
      const line = this.tok.line;
      this.next();
      const [e, esrc] = this.parseCond();
      this.expect('{');
      const cases = [];
      while (!this.is('}')) {
        const cl = this.tok.line;
        let test = null;
        if (this.accept('case')) test = this.parseTernary();
        else if (!this.accept('default')) this.fail();
        this.expect(':');
        const body = [];
        while (!this.is('case') && !this.is('default') && !this.is('}')) {
          if (this.tok.k === 'eof') throw new CError('expected', { what: '}' }, this.tok.line);
          body.push(this.parseStatement());
        }
        cases.push({ test, body, line: cl });
      }
      this.expect('}');
      return { t: 'switch', e, esrc, cases, line };
    }
  
    // expressions
    parseExpr() {
      const first = this.parseAssign();
      if (!this.is(',')) return first;
      const list = [first];
      while (this.accept(',')) list.push(this.parseAssign());
      return { t: 'comma', list, line: first.line };
    }
  
    parseAssign() {
      const left = this.parseTernary();
      if (this.tok.k === 'op' && ASSIGN_OPS.has(this.tok.v)) {
        if (left.t !== 'id' && left.t !== 'index') throw new CError('unexpected', { tok: this.tok.v }, this.tok.line);
        const op = this.next().v;
        return { t: 'assign', op, target: left, value: this.parseAssign(), line: left.line };
      }
      return left;
    }
  
    parseTernary() {
      const c = this.parseBin(1);
      if (!this.accept('?')) return c;
      const a = this.parseAssign();
      this.expect(':');
      const b = this.parseAssign();
      return { t: 'cond', c, a, b, line: c.line };
    }
  
    parseBin(min) {
      let left = this.parseUnary();
      for (;;) {
        const t = this.tok;
        const p = t.k === 'op' ? BIN_PREC[t.v] : undefined;
        if (p === undefined || p < min) return left;
        this.next();
        const right = this.parseBin(p + 1);
        left = { t: t.v === '&&' || t.v === '||' ? 'logic' : 'bin', op: t.v, a: left, b: right, line: t.line };
      }
    }
  
    parseUnary() {
      const t = this.tok;
      if (t.k === 'op') {
        if (['-', '+', '!', '~'].includes(t.v)) { this.next(); return { t: 'un', op: t.v, e: this.parseUnary(), line: t.line }; }
        if (t.v === '++' || t.v === '--') { this.next(); return { t: 'pre', op: t.v, e: this.parseUnary(), line: t.line }; }
        if (t.v === '&') {
          const a = this.pos;
          this.next();
          const e = this.parseUnary();
          return { t: 'addr', e, src: this.srcFrom(a), line: t.line };
        }
        if (t.v === '*') throw new CError('unsupported', { what: 'pointers' }, t.line);
        if (t.v === '(' && this.peek().k === 'kw' && TYPE_WORDS.has(this.peek().v)) {
          this.next();
          const ty = this.parseType();
          this.expect(')');
          return { t: 'cast', ty, e: this.parseUnary(), line: t.line };
        }
      }
      if (t.k === 'kw' && t.v === 'sizeof') {
        this.next();
        this.expect('(');
        let node;
        if (this.isTypeStart()) node = { t: 'sizeof', ty: this.parseType(), line: t.line };
        else node = { t: 'sizeof', e: this.parseExpr(), line: t.line };
        this.expect(')');
        return node;
      }
      return this.parsePostfix();
    }
  
    parsePostfix() {
      let n = this.parsePrimary();
      for (;;) {
        if (this.is('[')) {
          const line = this.tok.line;
          this.next();
          const idx = this.parseExpr();
          this.expect(']');
          n = { t: 'index', base: n, idx, line };
        } else if (this.is('++') || this.is('--')) {
          const op = this.next().v;
          n = { t: 'post', op, e: n, line: n.line };
        } else if (this.is('.') || this.is('->')) {
          throw new CError('unsupported', { what: 'structs and pointers' }, this.tok.line);
        } else return n;
      }
    }
  
    parsePrimary() {
      const t = this.tok;
      if (t.k === 'num') { this.next(); return { t: 'num', ty: t.ty, v: t.v, line: t.line }; }
      if (t.k === 'str') { this.next(); return { t: 'str', v: t.v, line: t.line }; }
      if (t.k === 'id') {
        this.next();
        if (this.is('(')) {
          this.next();
          const args = [];
          if (!this.is(')')) {
            do { args.push(this.parseAssign()); } while (this.accept(','));
          }
          this.expect(')');
          return { t: 'call', name: t.v, args, line: t.line };
        }
        return { t: 'id', name: t.v, line: t.line };
      }
      if (this.accept('(')) {
        const e = this.parseExpr();
        this.expect(')');
        return e;
      }
      return this.fail();
    }
  }
  
  export function parseProgram(src) { return new Parser(src).parseProgram(); }
  
  /** Parse a single expression such as "fact = fact * i" or "n % 2 == 0". */
  export function parseExpressionString(src) {
    const p = new Parser(src);
    const e = p.parseExpr();
    if (p.tok.k !== 'eof') p.fail();
    return e;
  }
  
  // ----------------------------------------------------------------- printf
  
  const pad = (s, width, flags, numeric) => {
    if (!width || s.length >= width) return s;
    if (flags.includes('-')) return s + ' '.repeat(width - s.length);
    if (flags.includes('0') && numeric) {
      const sign = /^[+-]/.test(s) ? s[0] : '';
      return sign + '0'.repeat(width - s.length) + s.slice(sign.length);
    }
    return ' '.repeat(width - s.length) + s;
  };
  
  /** Exact %.Nf formatting (round-half-even on the true binary value, like C). */
  function fixed(x, prec) {
    if (Number.isNaN(x)) return 'nan';
    if (!Number.isFinite(x)) return x > 0 ? 'inf' : '-inf';
    const neg = x < 0 || Object.is(x, -0);
    const dv = new DataView(new ArrayBuffer(8));
    dv.setFloat64(0, Math.abs(x));
    const bits = dv.getBigUint64(0);
    const expBits = Number((bits >> 52n) & 0x7ffn);
    let mant = bits & 0xfffffffffffffn;
    let e = -1074;
    if (expBits !== 0) { mant |= 1n << 52n; e = expBits - 1075; }
    const num = mant * 10n ** BigInt(prec);
    let q;
    if (e >= 0) q = num << BigInt(e);
    else {
      const den = 1n << BigInt(-e);
      q = num / den;
      const twice = (num % den) * 2n;
      if (twice > den || (twice === den && (q & 1n) === 1n)) q += 1n;
    }
    const digits = q.toString().padStart(prec + 1, '0');
    const body = prec ? `${digits.slice(0, -prec)}.${digits.slice(-prec)}` : digits;
    return neg ? `-${body}` : body;
  }
  function expFmt(x, prec) {
    return x.toExponential(prec).replace(/e([+-])(\d)$/, 'e$10$2');
  }
  function genFmt(x, prec) {
    if (x === 0) return '0';
    const p = prec === null ? 6 : prec || 1;
    const exp = Math.floor(Math.log10(Math.abs(x)));
    if (exp < -4 || exp >= p) {
      return expFmt(x, p - 1).replace(/\.?0+e/, 'e');
    }
    return x.toFixed(Math.max(p - 1 - exp, 0)).replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  }
  
  // ---------------------------------------------------------------- machine
  
  const MATH1 = { sqrt: Math.sqrt, fabs: Math.abs, floor: Math.floor, ceil: Math.ceil, sin: Math.sin, cos: Math.cos, tan: Math.tan, log: Math.log, log10: Math.log10, exp: Math.exp, round: Math.round };
  const MAX_STEPS = 30000;
  
  const hex = (n) => `0x${n.toString(16)}`;
  function charText(code) {
    if (code === 0) return "'\\0'";
    if (code === 10) return "'\\n'";
    if (code === 9) return "'\\t'";
    if (code >= 32 && code < 127) return `'${String.fromCharCode(code)}'`;
    return `${code}`;
  }
  
  export function fmtCell(ty, c) {
    if (c === null) return { t: '?', u: true };
    if (ty === 'char' || ty === 'uchar') return { t: charText(Number(c)), s: String(c) };
    if (ty === 'float') return { t: String(Number(c.toPrecision(7))) };
    if (ty === 'double') return { t: String(Number(c.toPrecision(15))) };
    return { t: c.toString() };
  }
  
  export class Machine {
    constructor(program = { globals: [], main: null }) {
      this.program = program;
      this.out = '';
      this.inbuf = '';
      this.inPos = 0;
      this.scopes = [];
      this.nextAddr = 0x7ffee000;
      this.changed = new Set();
      this.warn = new Map();
      this.steps = 0;
      this.varId = 0;
      this.lastWrite = null;
      this.lastPrinted = '';
      this.snapN = 0;
      this.echo = true; // show typed input in the console, like a terminal
    }
  
    // ---- memory
    pushScope() { this.scopes.push({ vars: [], start: this.nextAddr }); }
    popScope() { const s = this.scopes.pop(); this.nextAddr = s.start; }
  
    declare(name, ty, dims = [], line = null) {
      const scope = this.scopes[this.scopes.length - 1];
      if (scope.vars.some((v) => v.name === name)) throw new CError('redeclared', { name }, line);
      const count = dims.reduce((a, b) => a * b, 1);
      const size = sizeOf(ty);
      this.nextAddr = Math.ceil(this.nextAddr / Math.min(size, 8)) * Math.min(size, 8);
      const v = { id: ++this.varId, name, ty, dims, count, size, addr: this.nextAddr, cells: new Array(count).fill(null) };
      this.nextAddr += size * count;
      scope.vars.push(v);
      return v;
    }
  
    find(name, line) {
      for (let i = this.scopes.length - 1; i >= 0; i--) {
        const v = this.scopes[i].vars.find((x) => x.name === name);
        if (v) return v;
      }
      throw new CError('undeclared', { name }, line);
    }
  
    label(v, i) {
      if (!v.dims.length) return v.name;
      let rest = i;
      const idx = [];
      for (let k = v.dims.length - 1; k >= 0; k--) { idx.unshift(rest % v.dims[k]); rest = Math.floor(rest / v.dims[k]); }
      return v.name + idx.map((x) => `[${x}]`).join('');
    }
  
    read(v, i) {
      const c = v.cells[i];
      if (c === null) {
        if (!this.warn.has(v.id)) this.warn.set(v.id, v.name);
        return V(v.ty, zero(v.ty));
      }
      return V(v.ty, c);
    }
  
    write(v, i, val) {
      const conv = toTy(val, v.ty);
      v.cells[i] = conv.v;
      this.changed.add(`${v.id}:${i}`);
      this.lastWrite = { name: this.label(v, i), value: fmtCell(v.ty, conv.v).t };
      return conv;
    }
  
    refOf(n) {
      if (n.t === 'id') {
        const v = this.find(n.name, n.line);
        if (v.dims.length) throw new CError('unsupported', { what: 'using a whole array as a value' }, n.line);
        return { v, i: 0 };
      }
      if (n.t === 'index') {
        const subs = [];
        let b = n;
        while (b.t === 'index') { subs.unshift(b); b = b.base; }
        if (b.t !== 'id') throw new CError('unsupported', { what: 'this kind of index' }, n.line);
        const v = this.find(b.name, n.line);
        if (!v.dims.length) throw new CError('notArray', { name: v.name }, n.line);
        if (subs.length !== v.dims.length) throw new CError('unsupported', { what: 'using part of a 2D array' }, n.line);
        let flat = 0;
        subs.forEach((s, k) => {
          const iv = Number(toTy(this.eval(s.idx), 'long').v);
          if (iv < 0 || iv >= v.dims[k]) throw new CError('bounds', { name: v.name, index: iv, max: v.dims[k] - 1 }, n.line);
          flat = flat * v.dims[k] + iv;
        });
        return { v, i: flat };
      }
      throw new CError('unsupported', { what: 'this assignment target' }, n.line);
    }
  
    // ---- expressions
    eval(n) {
      switch (n.t) {
        case 'num': return V(n.ty, n.v);
        case 'id': {
          const v = this.find(n.name, n.line);
          if (v.dims.length) throw new CError('unsupported', { what: 'using a whole array as a value' }, n.line);
          return this.read(v, 0);
        }
        case 'index': { const r = this.refOf(n); return this.read(r.v, r.i); }
        case 'str': throw new CError('unsupported', { what: 'a string used as a value' }, n.line);
        case 'addr': throw new CError('unsupported', { what: '& outside scanf' }, n.line);
        case 'assign': {
          const r = this.refOf(n.target);
          let val = this.eval(n.value);
          if (n.op !== '=') val = binop(n.op.slice(0, -1), this.read(r.v, r.i), val, n.line);
          return this.write(r.v, r.i, val);
        }
        case 'bin': return binop(n.op, this.eval(n.a), this.eval(n.b), n.line);
        case 'logic': {
          const a = isTrue(this.eval(n.a));
          if (n.op === '&&' ? !a : a) return V('int', a ? 1n : 0n);
          return V('int', isTrue(this.eval(n.b)) ? 1n : 0n);
        }
        case 'un': {
          const x = this.eval(n.e);
          if (n.op === '!') return V('int', isTrue(x) ? 0n : 1n);
          if (isFloatTy(x.ty)) {
            if (n.op === '~') throw new CError('unsupported', { what: '~ on decimals' }, n.line);
            return V(x.ty, n.op === '-' ? -x.v : x.v);
          }
          const t = promote(x.ty);
          const a = toTy(x, t).v;
          return V(t, wrap(t, n.op === '-' ? -a : n.op === '~' ? ~a : a));
        }
        case 'pre': case 'post': {
          const r = this.refOf(n.e);
          const old = this.read(r.v, r.i);
          const nv = this.write(r.v, r.i, binop(n.op === '++' ? '+' : '-', old, V('int', 1n), n.line));
          return n.t === 'pre' ? nv : old;
        }
        case 'cond': return isTrue(this.eval(n.c)) ? this.eval(n.a) : this.eval(n.b);
        case 'comma': { let r = null; n.list.forEach((x) => { r = this.eval(x); }); return r; }
        case 'cast': return toTy(this.eval(n.e), n.ty);
        case 'sizeof': {
          if (n.ty) return V('ulong', BigInt(sizeOf(n.ty)));
          if (n.e.t === 'id') { const v = this.find(n.e.name, n.line); return V('ulong', BigInt(v.size * v.count)); }
          return V('ulong', BigInt(sizeOf(this.eval(n.e).ty)));
        }
        case 'call': return this.call(n);
        default: throw new CError('unsupported', { what: n.t }, n.line);
      }
    }
  
    call(n) {
      if (n.name === 'printf') return this.printf(n);
      if (n.name === 'scanf') throw new CError('unsupported', { what: 'scanf inside an expression' }, n.line);
      if (MATH1[n.name] && n.args.length === 1) {
        const x = Number(toTy(this.eval(n.args[0]), 'double').v);
        return V('double', MATH1[n.name](x));
      }
      if (n.name === 'abs' && n.args.length === 1) {
        const x = toTy(this.eval(n.args[0]), 'int').v;
        return V('int', x < 0n ? -x : x);
      }
      if (n.name === 'pow' && n.args.length === 2) {
        return V('double', Math.pow(Number(toTy(this.eval(n.args[0]), 'double').v), Number(toTy(this.eval(n.args[1]), 'double').v)));
      }
      throw new CError('unsupportedFunc', { name: n.name }, n.line);
    }
  
    printfArg(a) {
      if (a.t === 'cond') return isTrue(this.eval(a.c)) ? this.printfArg(a.a) : this.printfArg(a.b);
      if (a.t === 'str') return { str: a.v };
      if (a.t === 'id') {
        const v = this.find(a.name, a.line);
        if (v.dims.length) return { arr: v };
      }
      return this.eval(a);
    }
  
    strOf(a, line) {
      if (a.str !== undefined) return a.str;
      if (a.arr && a.arr.dims.length === 1 && (a.arr.ty === 'char' || a.arr.ty === 'uchar')) {
        let s = '';
        for (const c of a.arr.cells) { if (c === null || c === 0n) break; s += String.fromCharCode(Number(BigInt.asUintN(8, c))); }
        return s;
      }
      throw new CError('badFormat', { what: '%s needs a string' }, line);
    }
  
    printf(n) {
      if (!n.args.length || n.args[0].t !== 'str') throw new CError('unsupported', { what: 'printf without a format string' }, n.line);
      const fmt = n.args[0].v;
      const args = n.args.slice(1).map((a) => this.printfArg(a));
      let out = '';
      let ai = 0;
      for (let i = 0; i < fmt.length; i++) {
        const c = fmt[i];
        if (c !== '%') { out += c; continue; }
        i++;
        if (fmt[i] === '%') { out += '%'; continue; }
        let flags = '';
        while (i < fmt.length && '-+ 0#'.includes(fmt[i])) flags += fmt[i++];
        let width = '';
        while (/\d/.test(fmt[i] || '')) width += fmt[i++];
        let prec = null;
        if (fmt[i] === '.') { i++; let p = ''; while (/\d/.test(fmt[i] || '')) p += fmt[i++]; prec = p === '' ? 0 : Number(p); }
        while (i < fmt.length && 'hlLzjt'.includes(fmt[i])) i++;
        const spec = fmt[i];
        if (spec === undefined) throw new CError('badFormat', { what: 'incomplete %' }, n.line);
        if (ai >= args.length) throw new CError('printfArgs', { need: ai + 1, got: args.length }, n.line);
        const a = args[ai++];
        const w = width === '' ? 0 : Number(width);
        const num = () => {
          if (a.str !== undefined || a.arr) throw new CError('badFormat', { what: `%${spec} needs a number` }, n.line);
          return a;
        };
        let s;
        switch (spec) {
          case 'd': case 'i': {
            const x = num();
            const b = typeof x.v === 'bigint' ? x.v : BigInt(Math.trunc(Number.isFinite(x.v) ? x.v : 0));
            s = b.toString();
            if (b >= 0n && flags.includes('+')) s = `+${s}`; else if (b >= 0n && flags.includes(' ')) s = ` ${s}`;
            out += pad(s, w, flags, true);
            break;
          }
          case 'u': case 'x': case 'X': case 'o': {
            const x = num();
            const bits = INT_TYPES[x.ty] ? Math.max(INT_TYPES[x.ty].bits, 32) : 32;
            const b = BigInt.asUintN(bits, typeof x.v === 'bigint' ? x.v : BigInt(Math.trunc(x.v)));
            s = b.toString(spec === 'u' ? 10 : spec === 'o' ? 8 : 16);
            if (spec === 'X') s = s.toUpperCase();
            out += pad(s, w, flags, true);
            break;
          }
          case 'f': case 'F': case 'e': case 'E': case 'g': case 'G': {
            const x = Number(num().v);
            s = spec === 'f' || spec === 'F' ? fixed(x, prec === null ? 6 : prec)
              : spec === 'e' || spec === 'E' ? expFmt(x, prec === null ? 6 : prec) : genFmt(x, prec);
            if (spec === 'E' || spec === 'G') s = s.toUpperCase();
            if (x >= 0 && flags.includes('+')) s = `+${s}`;
            out += pad(s, w, flags, true);
            break;
          }
          case 'c': {
            const x = num();
            const b = typeof x.v === 'bigint' ? x.v : BigInt(Math.trunc(x.v));
            out += pad(String.fromCharCode(Number(BigInt.asUintN(8, b))), w, flags, false);
            break;
          }
          case 's': {
            s = this.strOf(a, n.line);
            if (prec !== null) s = s.slice(0, prec);
            out += pad(s, w, flags, false);
            break;
          }
          default: throw new CError('unsupported', { what: `%${spec} in printf` }, n.line);
        }
      }
      this.out += out;
      this.lastPrinted = out;
      return V('int', BigInt(out.length));
    }
  
    // ---- declarations
    execDecl(d) {
      const names = [];
      let lastInit = null;
      d.items.forEach((it) => {
        const dims = it.dims.map((e) => {
          if (e === null) return null;
          const k = Number(toTy(this.eval(e), 'long').v);
          if (k <= 0) throw new CError('badSize', { name: it.name }, it.line);
          return k;
        });
        if (dims.length && dims[0] === null) {
          // size from the initializer
          if (it.init && it.init.t === 'str') dims[0] = it.init.v.length + 1;
          else if (it.init && it.init.t === 'list') dims[0] = it.init.items.length;
          else throw new CError('badSize', { name: it.name }, it.line);
        }
        if (dims.some((x) => x === null)) throw new CError('unsupported', { what: 'unsized inner array dimensions' }, it.line);
        const v = this.declare(it.name, d.ty, dims, it.line);
        names.push(it.name);
        if (it.init) {
          if (!dims.length) {
            if (it.init.t === 'list' || it.init.t === 'str') throw new CError('unsupported', { what: 'this initializer' }, it.line);
            this.write(v, 0, this.eval(it.init));
            lastInit = { name: it.name, value: fmtCell(v.ty, v.cells[0]).t };
          } else if (it.init.t === 'str') {
            if (dims.length !== 1 || (v.ty !== 'char' && v.ty !== 'uchar')) throw new CError('unsupported', { what: 'a string for this variable' }, it.line);
            if (it.init.v.length + 1 > dims[0]) throw new CError('bounds', { name: it.name, index: it.init.v.length, max: dims[0] - 1 }, it.line);
            v.cells.fill(0n);
            [...it.init.v].forEach((ch, k) => { v.cells[k] = BigInt(ch.charCodeAt(0)); });
            for (let k = 0; k < v.count; k++) this.changed.add(`${v.id}:${k}`);
          } else if (it.init.t === 'list') {
            v.cells.fill(zero(v.ty));
            const flat = [];
            (function walk(l) { l.items.forEach((x) => (x.t === 'list' ? walk(x) : flat.push(x))); })(it.init);
            if (flat.length > v.count) throw new CError('bounds', { name: it.name, index: flat.length - 1, max: v.count - 1 }, it.line);
            flat.forEach((x, k) => { this.write(v, k, this.eval(x)); });
            for (let k = 0; k < v.count; k++) this.changed.add(`${v.id}:${k}`);
          } else throw new CError('unsupported', { what: 'this array initializer' }, it.line);
        }
      });
      return { names, lastInit, single: d.items.length === 1 };
    }
  
    // ---- input
    *scanf(n) {
      if (!n.args.length || n.args[0].t !== 'str') throw new CError('unsupported', { what: 'scanf without a format string' }, n.line);
      const fmt = n.args[0].v;
      const targets = n.args.slice(1);
      const names = targets.map((t) => (t.t === 'addr' ? t.src.replace(/^&\s*/, '') : t.t === 'id' ? t.name : '?')).join(', ');
      let ti = 0;
      let assigned = 0;
  
      const ensure = function* (self, wantNonSpace) {
        for (;;) {
          let p = self.inPos;
          if (wantNonSpace) while (p < self.inbuf.length && /\s/.test(self.inbuf[p])) p++;
          if (p < self.inbuf.length) { self.inPos = p; return; }
          const text = yield { type: 'input', line: n.line, names };
          self.inbuf += `${text}\n`;
          if (self.echo) self.out += `${text}\n`;
        }
      };
  
      for (let i = 0; i < fmt.length; i++) {
        const c = fmt[i];
        if (/\s/.test(c)) { while (this.inPos < this.inbuf.length && /\s/.test(this.inbuf[this.inPos])) this.inPos++; continue; }
        if (c !== '%') {
          yield* ensure(this, true);
          if (this.inbuf[this.inPos] !== c) return assigned;
          this.inPos++;
          continue;
        }
        i++;
        if (fmt[i] === '%') { yield* ensure(this, true); if (this.inbuf[this.inPos] === '%') this.inPos++; continue; }
        while (i < fmt.length && 'hlL'.includes(fmt[i])) i++;
        const spec = fmt[i];
        if (!'dfcsiu'.includes(spec || '?') || spec === undefined) throw new CError('unsupported', { what: `%${spec || ''} in scanf` }, n.line);
        if (ti >= targets.length) throw new CError('scanfArgs', {}, n.line);
        const tg = targets[ti++];
        yield* ensure(this, spec !== 'c');
        const rest = this.inbuf.slice(this.inPos);
        if (spec === 'c') {
          const r = tg.t === 'addr' ? this.refOf(tg.e) : null;
          if (!r) throw new CError('unsupported', { what: 'scanf %c target' }, n.line);
          this.write(r.v, r.i, V('int', BigInt(rest.charCodeAt(0))));
          this.inPos++;
          assigned++;
          continue;
        }
        if (spec === 's') {
          const m = /^\S+/.exec(rest);
          const arrNode = tg.t === 'addr' ? tg.e : tg;
          if (arrNode.t !== 'id') throw new CError('unsupported', { what: 'scanf %s target' }, n.line);
          const v = this.find(arrNode.name, n.line);
          if (v.dims.length !== 1 || (v.ty !== 'char' && v.ty !== 'uchar')) throw new CError('badFormat', { what: '%s needs a char array' }, n.line);
          if (m[0].length + 1 > v.dims[0]) throw new CError('bounds', { name: v.name, index: m[0].length, max: v.dims[0] - 1 }, n.line);
          v.cells.fill(0n);
          [...m[0]].forEach((ch, k) => { v.cells[k] = BigInt(ch.charCodeAt(0) & 255); });
          v.cells.forEach((_, k) => this.changed.add(`${v.id}:${k}`));
          this.inPos += m[0].length;
          assigned++;
          continue;
        }
        const re = spec === 'f' ? /^[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?/ : /^[+-]?\d+/;
        const m = re.exec(rest);
        if (!m) throw new CError('scanfBad', { spec, text: rest.split(/\s/)[0].slice(0, 12) }, n.line);
        if (tg.t !== 'addr') throw new CError('scanfNoAddr', {}, n.line);
        const r = this.refOf(tg.e);
        this.write(r.v, r.i, spec === 'f' ? V('double', Number(m[0])) : V('long', BigInt(m[0])));
        this.inPos += m[0].length;
        assigned++;
      }
      return assigned;
    }
  
    // ---- statements
    note(key, params = {}) { return { key, params }; }
    step(line, note) { return { type: 'step', line, note }; }
  
    *exec(s) {
      switch (s.t) {
        case 'block': {
          this.pushScope();
          try {
            for (const st of s.body) {
              const sig = yield* this.exec(st);
              if (sig) return sig;
            }
          } finally { this.popScope(); }
          return null;
        }
        case 'decl': {
          const r = this.execDecl(s);
          const names = r.names.join(', ');
          yield this.step(s.line, r.single && r.lastInit ? this.note('declareInit', { name: r.lastInit.name, value: r.lastInit.value }) : this.note('declare', { names }));
          return null;
        }
        case 'expr': {
          const e = s.e;
          if (e.t === 'call' && e.name === 'scanf') {
            const names = e.args.slice(1).map((t) => (t.t === 'addr' ? t.src.replace(/^&\s*/, '') : t.t === 'id' ? t.name : '?')).join(', ');
            yield* this.scanf(e);
            yield this.step(s.line, this.note('scanf', { names }));
            return null;
          }
          this.lastWrite = null;
          this.eval(e);
          if (e.t === 'call' && e.name === 'printf') yield this.step(s.line, this.note('printf', { text: this.lastPrinted.replace(/\n/g, '↵') }));
          else if (this.lastWrite) yield this.step(s.line, this.note('assign', { src: s.src, name: this.lastWrite.name, value: this.lastWrite.value }));
          else yield this.step(s.line, this.note('expr', { src: s.src }));
          return null;
        }
        case 'if': {
          const t = isTrue(this.eval(s.c));
          yield this.step(s.line, this.note(t ? 'condTrue' : 'condFalse', { src: s.csrc }));
          if (t) return yield* this.exec(s.then);
          return s.else ? yield* this.exec(s.else) : null;
        }
        case 'while': {
          for (;;) {
            const t = isTrue(this.eval(s.c));
            yield this.step(s.line, this.note(t ? 'condTrue' : 'condFalse', { src: s.csrc }));
            if (!t) break;
            const sig = yield* this.exec(s.body);
            if (sig === 'break') break;
            if (sig === 'return') return sig;
          }
          return null;
        }
        case 'do': {
          for (;;) {
            const sig = yield* this.exec(s.body);
            if (sig === 'break') break;
            if (sig === 'return') return sig;
            const t = isTrue(this.eval(s.c));
            yield this.step(s.line, this.note(t ? 'condTrue' : 'condFalse', { src: s.csrc }));
            if (!t) break;
          }
          return null;
        }
        case 'for': {
          this.pushScope();
          try {
            if (s.init) {
              if (s.init.t === 'decl') this.execDecl(s.init); else this.eval(s.init);
              yield this.step(s.line, this.note('forInit', { src: s.isrc }));
            }
            for (;;) {
              if (s.c) {
                const t = isTrue(this.eval(s.c));
                yield this.step(s.line, this.note(t ? 'condTrue' : 'condFalse', { src: s.csrc }));
                if (!t) break;
              }
              const sig = yield* this.exec(s.body);
              if (sig === 'break') break;
              if (sig === 'return') return sig;
              if (s.update) {
                this.eval(s.update);
                yield this.step(s.line, this.note('forUpdate', { src: s.usrc }));
              }
            }
          } finally { this.popScope(); }
          return null;
        }
        case 'switch': {
          const v = this.eval(s.e);
          yield this.step(s.line, this.note('switchOn', { src: s.esrc, value: fmtCell(v.ty, v.v).t }));
          let start = s.cases.findIndex((c) => c.test && binop('==', v, this.eval(c.test)).v === 1n);
          if (start < 0) start = s.cases.findIndex((c) => !c.test);
          if (start < 0) return null;
          this.pushScope();
          try {
            for (let k = start; k < s.cases.length; k++) {
              for (const st of s.cases[k].body) {
                const sig = yield* this.exec(st);
                if (sig === 'break') return null;
                if (sig) return sig;
              }
            }
          } finally { this.popScope(); }
          return null;
        }
        case 'break': yield this.step(s.line, this.note('break')); return 'break';
        case 'continue': yield this.step(s.line, this.note('continue')); return 'continue';
        case 'return': {
          const v = s.e ? this.eval(s.e) : null;
          yield this.step(s.line, this.note('return', { value: v ? fmtCell(v.ty, v.v).t : '' }));
          return 'return';
        }
        default: throw new CError('unsupported', { what: s.t }, s.line);
      }
    }
  
    *run() {
      this.pushScope(); // globals
      for (const g of this.program.globals) yield* this.exec(g);
      yield* this.exec(this.program.main);
    }
  
    // ---- snapshots for the UI
    varViews() {
      const out = [];
      this.scopes.forEach((sc, depth) => {
        sc.vars.forEach((v) => {
          out.push({
            name: v.name, ty: v.ty, size: v.size, addr: hex(v.addr), dims: v.dims, depth,
            cells: v.cells.map((c, i) => ({ ...fmtCell(v.ty, c), changed: this.changed.has(`${v.id}:${i}`) })),
          });
        });
      });
      return out;
    }
  
    snapshot(line, note, extra = {}) {
      const snap = {
        n: this.snapN++, line, note, out: this.out, vars: this.varViews(),
        warnings: [...this.warn.values()], waiting: null, done: false, error: null, ...extra,
      };
      this.changed = new Set();
      return snap;
    }
  }
  
  // ----------------------------------------------------------------- runner
  
  const HISTORY_CAP = 6000;
  
  export class Runner {
    constructor(machine) {
      this.m = machine;
      this.gen = machine.run();
      this.hist = [machine.snapshot(null, { key: 'ready', params: {} })];
      this.cur = 0;
      this.finished = false;
    }
  
    get snap() { return this.hist[this.cur]; }
    get canBack() { return this.cur > 0; }
    get atEnd() { return this.cur === this.hist.length - 1; }
    get waiting() { return this.atEnd ? this.snap.waiting : null; }
    get canNext() { return !this.atEnd || (!this.finished && !this.snap.waiting); }
  
    push(s) {
      this.hist.push(s);
      if (this.hist.length > HISTORY_CAP) this.hist.splice(0, 1000);
      this.cur = this.hist.length - 1;
    }
  
    advance(input) {
      try {
        const r = this.gen.next(input);
        if (r.done) {
          this.finished = true;
          this.push(this.m.snapshot(null, { key: 'end', params: {} }, { done: true }));
        } else if (r.value.type === 'input') {
          this.push(this.m.snapshot(r.value.line, { key: 'waiting', params: { names: r.value.names } }, { waiting: { names: r.value.names } }));
        } else {
          this.m.steps++;
          if (this.m.steps > MAX_STEPS) throw new CError('stepLimit', {}, r.value.line);
          this.push(this.m.snapshot(r.value.line, r.value.note));
        }
      } catch (e) {
        if (!(e instanceof CError)) throw e;
        this.finished = true;
        this.push(this.m.snapshot(e.line, { key: 'error', params: {} }, { error: { code: e.code, params: e.params, line: e.line } }));
      }
    }
  
    step() {
      if (!this.atEnd) { this.cur++; return; }
      if (this.finished || this.snap.waiting) return;
      this.advance(undefined);
    }
  
    back() { if (this.cur > 0) this.cur--; }
  
    provideInput(text) {
      if (this.waiting) this.advance(text);
    }
  
    /** Run until the program ends, asks for input, or fails. */
    runToEnd(limit = MAX_STEPS + 100) {
      for (let k = 0; k < limit; k++) {
        if (!this.atEnd) { this.cur = this.hist.length - 1; continue; }
        if (this.finished || this.snap.waiting) return;
        this.advance(undefined);
      }
    }
  }
  
  /** Compile a program. Returns { ok: true, run } or { ok: false, error }. */
  export function createRun(source) {
    try {
      const program = parseProgram(source);
      return { ok: true, run: new Runner(new Machine(program)) };
    } catch (e) {
      if (e instanceof CError) return { ok: false, error: { code: e.code, params: e.params, line: e.line } };
      throw e;
    }
  }