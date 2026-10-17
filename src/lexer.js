// REPY 렉서 — 파이썬 방식 들여쓰기(INDENT/DEDENT)를 지원한다.
import { ReprError } from './errors.js';

const KEYWORDS = new Set([
  'if', 'elif', 'else', 'while', 'for', 'in', 'def', 'return', 'break', 'continue', 'pass',
  'and', 'or', 'not', 'True', 'False', 'None', 'global', 'import', 'from', 'del', 'as',
]);

const OPS3 = ['**=', '//=', '...', '>>=', '<<='];
const OPS2 = ['==', '!=', '<=', '>=', '+=', '-=', '*=', '/=', '%=', '**', '//', '->', ':='];
const OPS1 = '+-*/%<>=()[]{},:.@;!';

const isIdStart = ch => /[\p{L}_]/u.test(ch);
const isIdPart = ch => /[\p{L}\p{N}_]/u.test(ch);
const isDigit = ch => ch >= '0' && ch <= '9';

const ESCAPES = { n: '\n', t: '\t', r: '\r', '\\': '\\', "'": "'", '"': '"', '0': '\0' };

export function tokenize(source) {
  const src = source.replace(/\r\n?/g, '\n');
  const tokens = [];
  const indents = [0];
  let i = 0, line = 1, lineStart = 0, depth = 0, atLineStart = true;

  const err = (msg, l = line, c = i - lineStart + 1) => { throw new ReprError(msg, l, c, 'syntax'); };
  const push = (type, value, extra = {}) =>
    tokens.push({ type, value, line, col: (extra.start ?? i) - lineStart + 1, ...extra });

  while (i < src.length) {
    if (atLineStart && depth === 0) {
      // 들여쓰기 폭 계산
      let width = 0, j = i;
      while (j < src.length && (src[j] === ' ' || src[j] === '\t')) { width += src[j] === '\t' ? 4 : 1; j++; }
      if (j >= src.length) { i = j; break; }
      if (src[j] === '\n' || src[j] === '#') { // 빈 줄·주석 줄
        while (j < src.length && src[j] !== '\n') j++;
        i = j + 1; line++; lineStart = i; continue;
      }
      i = j;
      if (width > indents[indents.length - 1]) { indents.push(width); push('INDENT', width); }
      else {
        while (width < indents[indents.length - 1]) { indents.pop(); push('DEDENT', width); }
        if (width !== indents[indents.length - 1]) err('들여쓰기가 맞지 않습니다');
      }
      atLineStart = false;
    }

    const ch = src[i];
    if (ch === ' ' || ch === '\t') { i++; continue; }
    if (ch === '#') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (ch === '\\' && src[i + 1] === '\n') { i += 2; line++; lineStart = i; continue; }
    if (ch === '\n') {
      if (depth === 0) { push('NEWLINE', '\n'); atLineStart = true; }
      i++; line++; lineStart = i; continue;
    }

    // 문자열 (접두어 f / r 지원)
    const strPrefix = /^([fFrR]{0,2})('''|"""|'|")/.exec(src.slice(i, i + 5));
    if (strPrefix && (strPrefix[1] === '' || !isIdPart(src[i - 1] || ' '))) {
      const prefix = strPrefix[1].toLowerCase();
      const quote = strPrefix[2];
      const raw = prefix.includes('r');
      const isF = prefix.includes('f');
      const startLine = line, startCol = i - lineStart + 1;
      i += strPrefix[0].length;
      let buf = '';
      let closed = false;
      while (i < src.length) {
        if (src.startsWith(quote, i)) { i += quote.length; closed = true; break; }
        const c = src[i];
        if (c === '\n') {
          if (quote.length === 1) err('문자열이 닫히지 않았습니다', startLine, startCol);
          line++; lineStart = i + 1; buf += c; i++; continue;
        }
        if (c === '\\' && !raw) {
          const n = src[i + 1];
          if (n === '\n') { i += 2; line++; lineStart = i; continue; }
          if (n === 'u' && /^[0-9a-fA-F]{4}$/.test(src.slice(i + 2, i + 6))) {
            buf += String.fromCharCode(parseInt(src.slice(i + 2, i + 6), 16)); i += 6; continue;
          }
          if (n in ESCAPES) { buf += ESCAPES[n]; i += 2; continue; }
          buf += c; i++; continue;
        }
        buf += c; i++;
      }
      if (!closed) err('문자열이 닫히지 않았습니다', startLine, startCol);
      tokens.push({ type: isF ? 'FSTRING' : 'STRING', value: buf, line: startLine, col: startCol });
      continue;
    }

    if (isDigit(ch) || (ch === '.' && isDigit(src[i + 1] || ''))) {
      const m = /^(0[xX][0-9a-fA-F]+|0[bB][01]+|\d[\d_]*\.?\d*(?:[eE][+-]?\d+)?|\.\d+(?:[eE][+-]?\d+)?)/.exec(src.slice(i));
      const text = m[0];
      const startCol = i - lineStart + 1;
      i += text.length;
      tokens.push({ type: 'NUMBER', value: Number(text.replace(/_/g, '')), line, col: startCol });
      continue;
    }

    if (isIdStart(ch)) {
      const start = i;
      while (i < src.length && isIdPart(src[i])) i++;
      const word = src.slice(start, i);
      tokens.push({ type: KEYWORDS.has(word) ? 'KEYWORD' : 'NAME', value: word, line, col: start - lineStart + 1 });
      continue;
    }

    const op3 = OPS3.find(o => src.startsWith(o, i));
    const op2 = OPS2.find(o => src.startsWith(o, i));
    const op = op3 || op2 || (OPS1.includes(ch) ? ch : null);
    if (op) {
      if ('([{'.includes(op)) depth++;
      else if (')]}'.includes(op)) depth = Math.max(0, depth - 1);
      tokens.push({ type: 'OP', value: op, line, col: i - lineStart + 1 });
      i += op.length;
      continue;
    }
    err(`알 수 없는 문자입니다: ${JSON.stringify(ch)}`);
  }

  if (tokens.length && tokens[tokens.length - 1].type !== 'NEWLINE') push('NEWLINE', '\n');
  while (indents.length > 1) { indents.pop(); push('DEDENT', 0); }
  tokens.push({ type: 'EOF', value: '', line, col: 1 });
  return tokens;
}
