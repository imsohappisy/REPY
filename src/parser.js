// REPY 파서 — 파이썬 문법 + 엔트리 확장 문법(object / textbox / scene / when / shape / sound)
import { tokenize } from './lexer.js';
import { ReprError } from './errors.js';

// 문장 앞에 올 때만 키워드로 취급하는 "소프트 키워드"
const SOFT = new Set(['object', 'textbox', 'scene', 'when', 'shape', 'sound']);

export function parse(source) {
  return new Parser(tokenize(source)).parseModule();
}

class Parser {
  constructor(tokens) { this.toks = tokens; this.p = 0; }

  // ── 토큰 헬퍼 ──────────────────────────────────────────────
  get tok() { return this.toks[this.p]; }
  peek(n = 1) { return this.toks[Math.min(this.p + n, this.toks.length - 1)]; }
  err(msg, t = this.tok) { throw new ReprError(msg, t.line, t.col, 'syntax'); }
  isOp(v, t = this.tok) { return t.type === 'OP' && t.value === v; }
  isKw(v, t = this.tok) { return t.type === 'KEYWORD' && t.value === v; }
  eatOp(v) { if (this.isOp(v)) { this.p++; return true; } return false; }
  eatKw(v) { if (this.isKw(v)) { this.p++; return true; } return false; }
  expectOp(v) {
    if (!this.isOp(v)) this.err(`'${v}' 가 필요합니다 (현재: ${this.describe()})`);
    return this.toks[this.p++];
  }
  expectKw(v) {
    if (!this.isKw(v)) this.err(`'${v}' 가 필요합니다 (현재: ${this.describe()})`);
    return this.toks[this.p++];
  }
  describe(t = this.tok) {
    if (t.type === 'NEWLINE') return '줄 끝';
    if (t.type === 'EOF') return '파일 끝';
    if (t.type === 'INDENT') return '들여쓰기';
    if (t.type === 'DEDENT') return '내어쓰기';
    return `'${t.value}'`;
  }
  expectName() {
    if (this.tok.type !== 'NAME') this.err(`이름이 필요합니다 (현재: ${this.describe()})`);
    return this.toks[this.p++];
  }
  node(t, tok, props) { return { t, line: tok.line, col: tok.col, ...props }; }
  skipNewlines() { while (this.tok.type === 'NEWLINE') this.p++; }

  // ── 모듈 / 블록 ────────────────────────────────────────────
  parseModule() {
    const body = [];
    this.skipNewlines();
    while (this.tok.type !== 'EOF') {
      if (this.tok.type === 'INDENT') this.err('예상하지 못한 들여쓰기입니다');
      body.push(...this.parseStatement());
      this.skipNewlines();
    }
    return { t: 'Module', body };
  }

  parseBlock() {
    this.expectOp(':');
    if (this.tok.type !== 'NEWLINE') { // 한 줄 블록
      const stmts = this.parseSimpleLine();
      return stmts;
    }
    this.p++;
    this.skipNewlines();
    if (this.tok.type !== 'INDENT') this.err('들여쓰기된 블록이 필요합니다');
    this.p++;
    const body = [];
    this.skipNewlines();
    while (this.tok.type !== 'DEDENT' && this.tok.type !== 'EOF') {
      body.push(...this.parseStatement());
      this.skipNewlines();
    }
    if (this.tok.type === 'DEDENT') this.p++;
    return body;
  }

  // ── 문장 ──────────────────────────────────────────────────
  parseStatement() {
    const t = this.tok;
    if (t.type === 'KEYWORD') {
      switch (t.value) {
        case 'if': return [this.parseIf()];
        case 'while': return [this.parseWhile()];
        case 'for': return [this.parseFor()];
        case 'def': return [this.parseDef()];
      }
    }
    if (t.type === 'NAME' && SOFT.has(t.value)) {
      const n = this.peek();
      if (n.type === 'NAME' || n.type === 'STRING' || n.type === 'FSTRING' || (n.type === 'KEYWORD' && t.value === 'when')) {
        return [this.parseSoft()];
      }
    }
    return this.parseSimpleLine();
  }

  parseSimpleLine() {
    const out = [this.parseSimple()];
    while (this.eatOp(';')) { if (this.tok.type === 'NEWLINE') break; out.push(this.parseSimple()); }
    if (this.tok.type !== 'NEWLINE' && this.tok.type !== 'EOF') {
      this.err(`문장이 끝나야 하는데 ${this.describe()} 가 있습니다`);
    }
    if (this.tok.type === 'NEWLINE') this.p++;
    return out;
  }

  parseSimple() {
    const t = this.tok;
    if (t.type === 'KEYWORD') {
      switch (t.value) {
        case 'pass': this.p++; return this.node('Pass', t);
        case 'break': this.p++; return this.node('Break', t);
        case 'continue': this.p++; return this.node('Continue', t);
        case 'return': {
          this.p++;
          let value = null;
          if (this.tok.type !== 'NEWLINE' && !this.isOp(';')) value = this.parseExprList();
          return this.node('Return', t, { value });
        }
        case 'global': {
          this.p++;
          const names = [this.expectName().value];
          while (this.eatOp(',')) names.push(this.expectName().value);
          return this.node('Global', t, { names });
        }
        case 'import': case 'from': {
          // import math / from random import randint — 의미 없는 구문으로 무시
          while (this.tok.type !== 'NEWLINE' && this.tok.type !== 'EOF') this.p++;
          return this.node('Pass', t);
        }
        case 'del': {
          this.p++;
          const target = this.parseExpr();
          return this.node('Del', t, { target });
        }
      }
    }
    const expr = this.parseExprList();
    // 대입 / 복합 대입
    if (this.isOp('=')) {
      const targets = [expr];
      let value;
      while (this.eatOp('=')) {
        value = this.parseExprList();
        if (this.isOp('=')) targets.push(value);
      }
      for (const tg of targets) this.checkTarget(tg);
      return this.node('Assign', t, { targets, value });
    }
    const aug = ['+=', '-=', '*=', '/=', '%=', '**=', '//='].find(o => this.isOp(o));
    if (aug) {
      this.p++;
      this.checkTarget(expr, true);
      const value = this.parseExprList();
      return this.node('AugAssign', t, { target: expr, op: aug.slice(0, -1), value });
    }
    return this.node('ExprStmt', t, { expr });
  }

  checkTarget(e, aug = false) {
    if (e.t === 'Name' || e.t === 'Attr' || e.t === 'Index') return;
    if (e.t === 'Tuple' && !aug) { e.items.forEach(x => this.checkTarget(x)); return; }
    throw new ReprError('대입할 수 없는 대상입니다', e.line, e.col, 'syntax');
  }

  parseIf() {
    const t = this.tok;
    this.p++;
    const test = this.parseExpr();
    const body = this.parseBlock();
    let orelse = [];
    if (this.isKw('elif')) {
      orelse = [this.parseIf2()];
    } else if (this.isKw('else')) {
      this.p++;
      orelse = this.parseBlock();
    }
    return this.node('If', t, { test, body, orelse });
  }
  parseIf2() { return this.parseIf(); } // 'elif' 도 같은 방식 (키워드 소비는 parseIf 의 this.p++)

  parseWhile() {
    const t = this.tok;
    this.p++;
    const test = this.parseExpr();
    const body = this.parseBlock();
    return this.node('While', t, { test, body });
  }

  parseFor() {
    const t = this.tok;
    this.p++;
    const target = this.parseTargetList();
    this.expectKw('in');
    const iter = this.parseExprList();
    const body = this.parseBlock();
    return this.node('For', t, { target, iter, body });
  }

  parseTargetList() {
    const t = this.tok;
    const first = this.parsePostfix();
    if (!this.isOp(',')) { this.checkTarget(first); return first; }
    const items = [first];
    while (this.eatOp(',')) { if (this.isKw('in')) break; items.push(this.parsePostfix()); }
    items.forEach(x => this.checkTarget(x));
    return this.node('Tuple', t, { items });
  }

  parseDef() {
    const t = this.tok;
    this.p++;
    const name = this.expectName().value;
    this.expectOp('(');
    const params = [];
    while (!this.isOp(')')) {
      const pn = this.expectName();
      let type = null;
      if (this.eatOp(':')) type = this.parseExpr();
      if (this.eatOp('=')) this.err('기본값 인자는 아직 지원하지 않습니다', pn);
      params.push({ name: pn.value, type, line: pn.line, col: pn.col });
      if (!this.eatOp(',')) break;
    }
    this.expectOp(')');
    if (this.eatOp('->')) this.parseExpr();
    const body = this.parseBlock();
    return this.node('Def', t, { name, params, body });
  }

  // object / textbox / scene / when / shape / sound
  parseSoft() {
    const t = this.tok;
    this.p++;
    switch (t.value) {
      case 'object': case 'textbox': {
        const nameTok = this.tok;
        let name;
        if (nameTok.type === 'NAME' || nameTok.type === 'STRING') { name = nameTok.value; this.p++; }
        else this.err('오브젝트 이름이 필요합니다');
        let args = [], kwargs = [];
        if (this.isOp('(')) ({ args, kwargs } = this.parseCallArgs());
        let body = [];
        if (this.isOp(':')) {
          body = this.parseBlock();
        } else if (this.tok.type === 'NEWLINE') {
          this.p++;
        } else if (this.tok.type !== 'EOF') {
          this.err("오브젝트 선언 뒤에는 ':' 또는 줄바꿈이 필요합니다");
        }
        return this.node('ObjectDef', t, { kind: t.value, name, args, kwargs, body });
      }
      case 'scene': {
        const nameTok = this.tok;
        this.p++;
        if (this.isOp(':')) {
          const body = this.parseBlock();
          return this.node('SceneDef', t, { name: nameTok.value, body });
        }
        if (this.tok.type !== 'NEWLINE' && this.tok.type !== 'EOF') this.err("장면 이름 뒤에는 ':' 또는 줄바꿈이 필요합니다");
        if (this.tok.type === 'NEWLINE') this.p++;
        return this.node('SceneDef', t, { name: nameTok.value, body: null });
      }
      case 'when': {
        const event = this.parseExpr();
        const body = this.parseBlock();
        return this.node('When', t, { event, body });
      }
      case 'shape': case 'sound': {
        const expr = this.parseExpr();
        let alias = null;
        if (this.eatKw('as')) {
          if (this.tok.type === 'STRING' || this.tok.type === 'NAME') { alias = this.tok.value; this.p++; }
          else this.err('이름이 필요합니다');
        }
        if (this.tok.type === 'NEWLINE') this.p++;
        else if (this.tok.type !== 'EOF') this.err(`문장이 끝나야 하는데 ${this.describe()} 가 있습니다`);
        return this.node(t.value === 'shape' ? 'ShapeDecl' : 'SoundDecl', t, { expr, alias });
      }
    }
    this.err('알 수 없는 구문');
  }

  // ── 표현식 ────────────────────────────────────────────────
  parseExprList() {
    const t = this.tok;
    const first = this.parseExpr();
    if (!this.isOp(',')) return first;
    const items = [first];
    while (this.eatOp(',')) {
      if (this.tok.type === 'NEWLINE' || this.isOp('=') || this.isOp(')')) break;
      items.push(this.parseExpr());
    }
    return this.node('Tuple', t, { items });
  }

  parseExpr() { return this.parseTernary(); }

  parseTernary() {
    const t = this.tok;
    const body = this.parseOr();
    if (this.isKw('if')) {
      this.p++;
      const test = this.parseOr();
      this.expectKw('else');
      const orelse = this.parseTernary();
      return this.node('IfExp', t, { test, body, orelse });
    }
    return body;
  }

  parseOr() {
    const t = this.tok;
    let left = this.parseAnd();
    while (this.isKw('or')) { this.p++; left = this.node('BoolOp', t, { op: 'or', left, right: this.parseAnd() }); }
    return left;
  }
  parseAnd() {
    const t = this.tok;
    let left = this.parseNot();
    while (this.isKw('and')) { this.p++; left = this.node('BoolOp', t, { op: 'and', left, right: this.parseNot() }); }
    return left;
  }
  parseNot() {
    const t = this.tok;
    if (this.isKw('not')) { this.p++; return this.node('Not', t, { operand: this.parseNot() }); }
    return this.parseCompare();
  }

  parseCompare() {
    const t = this.tok;
    const first = this.parseArith();
    const ops = [], rest = [];
    for (;;) {
      let op = null;
      if (this.tok.type === 'OP' && ['==', '!=', '<', '>', '<=', '>='].includes(this.tok.value)) { op = this.tok.value; this.p++; }
      else if (this.isKw('in')) { op = 'in'; this.p++; }
      else if (this.isKw('not') && this.isKw('in', this.peek())) { op = 'not in'; this.p += 2; }
      else break;
      ops.push(op);
      rest.push(this.parseArith());
    }
    if (!ops.length) return first;
    return this.node('Compare', t, { first, ops, rest });
  }

  parseArith() {
    const t = this.tok;
    let left = this.parseTerm();
    while (this.isOp('+') || this.isOp('-')) {
      const op = this.tok.value; this.p++;
      left = this.node('Bin', t, { op, left, right: this.parseTerm() });
    }
    return left;
  }
  parseTerm() {
    const t = this.tok;
    let left = this.parseUnary();
    while (['*', '/', '//', '%'].some(o => this.isOp(o))) {
      const op = this.tok.value; this.p++;
      left = this.node('Bin', t, { op, left, right: this.parseUnary() });
    }
    return left;
  }
  parseUnary() {
    const t = this.tok;
    if (this.isOp('-') || this.isOp('+')) {
      const op = this.tok.value; this.p++;
      const operand = this.parseUnary();
      if (op === '-' && operand.t === 'Num') return this.node('Num', t, { v: -operand.v });
      if (op === '+') return operand;
      return this.node('Neg', t, { operand });
    }
    return this.parsePower();
  }
  parsePower() {
    const t = this.tok;
    const base = this.parsePostfix();
    if (this.isOp('**')) {
      this.p++;
      const exp = this.parseUnary();
      return this.node('Bin', t, { op: '**', left: base, right: exp });
    }
    return base;
  }

  parseCallArgs() {
    this.expectOp('(');
    const args = [], kwargs = [];
    while (!this.isOp(')')) {
      if (this.tok.type === 'NAME' && this.isOp('=', this.peek())) {
        const k = this.tok; this.p += 2;
        kwargs.push({ name: k.value, value: this.parseExpr(), line: k.line, col: k.col });
      } else {
        if (kwargs.length) this.err('위치 인자는 이름 있는 인자 앞에 와야 합니다');
        args.push(this.parseExpr());
      }
      if (!this.eatOp(',')) break;
    }
    this.expectOp(')');
    return { args, kwargs };
  }

  parsePostfix() {
    const t = this.tok;
    let e = this.parseAtom();
    for (;;) {
      if (this.isOp('(')) {
        const { args, kwargs } = this.parseCallArgs();
        e = this.node('Call', t, { func: e, args, kwargs });
      } else if (this.isOp('.')) {
        this.p++;
        const nm = this.tok;
        if (nm.type !== 'NAME' && nm.type !== 'KEYWORD') this.err('속성 이름이 필요합니다');
        this.p++;
        e = this.node('Attr', t, { obj: e, name: nm.value });
      } else if (this.isOp('[')) {
        this.p++;
        let lo = null, hi = null, isSlice = false;
        if (!this.isOp(':')) lo = this.parseExpr();
        if (this.eatOp(':')) { isSlice = true; if (!this.isOp(']')) hi = this.parseExpr(); }
        this.expectOp(']');
        e = isSlice ? this.node('Slice', t, { obj: e, lo, hi }) : this.node('Index', t, { obj: e, index: lo });
      } else break;
    }
    return e;
  }

  parseAtom() {
    const t = this.tok;
    switch (t.type) {
      case 'NUMBER': this.p++; return this.node('Num', t, { v: t.value });
      case 'STRING': case 'FSTRING': {
        // 인접한 문자열은 이어 붙인다.
        const parts = [];
        let anyF = false;
        while (this.tok.type === 'STRING' || this.tok.type === 'FSTRING') {
          const s = this.tok; this.p++;
          if (s.type === 'FSTRING') { anyF = true; parts.push(...this.splitFString(s)); }
          else parts.push({ lit: s.value });
        }
        if (!anyF) return this.node('Str', t, { v: parts.map(x => x.lit).join('') });
        return this.node('FStr', t, { parts });
      }
      case 'NAME': this.p++; return this.node('Name', t, { id: t.value });
      case 'KEYWORD':
        if (t.value === 'True' || t.value === 'False') { this.p++; return this.node('Bool', t, { v: t.value === 'True' }); }
        if (t.value === 'None') { this.p++; return this.node('None', t); }
        break;
      case 'OP':
        if (t.value === '(') {
          this.p++;
          if (this.eatOp(')')) return this.node('Tuple', t, { items: [] });
          const first = this.parseExpr();
          if (this.isOp(',')) {
            const items = [first];
            while (this.eatOp(',')) { if (this.isOp(')')) break; items.push(this.parseExpr()); }
            this.expectOp(')');
            return this.node('Tuple', t, { items });
          }
          this.expectOp(')');
          return first.paren ? first : { ...first, paren: true };
        }
        if (t.value === '[') {
          this.p++;
          const items = [];
          while (!this.isOp(']')) { items.push(this.parseExpr()); if (!this.eatOp(',')) break; }
          this.expectOp(']');
          return this.node('List', t, { items });
        }
        break;
    }
    this.err(`식이 필요합니다 (현재: ${this.describe()})`);
  }

  // f"... {expr} ..." 를 [{lit}|{expr}] 로 쪼갠다.
  splitFString(tok) {
    const s = tok.value, parts = [];
    let buf = '', i = 0;
    while (i < s.length) {
      const c = s[i];
      if (c === '{' && s[i + 1] === '{') { buf += '{'; i += 2; continue; }
      if (c === '}' && s[i + 1] === '}') { buf += '}'; i += 2; continue; }
      if (c === '{') {
        let depth = 1, j = i + 1;
        while (j < s.length && depth) { if (s[j] === '{') depth++; else if (s[j] === '}') depth--; j++; }
        if (depth) throw new ReprError("f-문자열의 '{' 가 닫히지 않았습니다", tok.line, tok.col, 'syntax');
        let inner = s.slice(i + 1, j - 1);
        const fmt = /^(.*?)(![rsa])?(:[^:]*)?$/s.exec(inner);
        if (fmt && fmt[3] && !/[()\[\]'"]/.test(fmt[3])) inner = fmt[1];
        if (buf) { parts.push({ lit: buf }); buf = ''; }
        const sub = new Parser(tokenize('(' + inner + ')'));
        let expr;
        try { expr = sub.parseExpr(); } catch (e) {
          if (e instanceof ReprError) throw new ReprError('f-문자열 안의 식 오류: ' + e.message, tok.line, tok.col, 'syntax');
          throw e;
        }
        const fix = n => { if (n && typeof n === 'object') { if ('line' in n) { n.line = tok.line; n.col = tok.col; } for (const k of Object.keys(n)) if (k !== 'line' && k !== 'col') fix(n[k]); } };
        fix(expr);
        parts.push({ expr });
        i = j; continue;
      }
      buf += c; i++;
    }
    if (buf) parts.push({ lit: buf });
    return parts;
  }
}
