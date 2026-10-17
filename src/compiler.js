// REPY 컴파일러: AST → 엔트리 프로젝트 모델(블록 JSON 포함)
//
// 흐름
//   1) collect  : 최상위/오브젝트의 선언(장면, 오브젝트, 함수, 변수, 리스트, 모양, 소리)을 모은다
//   2) prescan  : 핸들러 안에서 대입되는 이름을 미리 훑어 전역 변수로 자동 선언한다
//   3) emit     : 함수/핸들러 본문을 엔트리 블록 JSON 으로 만든다
//
// 이 모듈은 환경(브라우저/노드)에 의존하지 않는다. 그림/소리 파일 처리는 assets.js / pack.js 의 몫.
import { REGISTRY } from './registry.js';
import { ReprError } from './errors.js';
import {
  STATEMENTS, VALUES, EVENTS, EFFECTS, STOP_TARGETS, DATE_PARTS, MATH_OPS, keyCode, parseColor,
} from './blocks-table.js';
import { isKnownPresetShape, normalizeShapeName } from './shapes.js';

const SLOT_ARG = 'BDYKXCA';          // 사용자 인자로 채워지는 슬롯 코드
const STR_TYPES = new Set([
  'combine_something', 'char_at', 'substring', 'replace_string', 'change_string_case',
  'reverse_of_string', 'get_user_name', 'get_nickname', 'text_read',
]);
const SHAPE_NAMES = new Set([
  'circle', 'rect', 'square', 'ellipse', 'triangle', 'star', 'heart', 'diamond', 'ring',
  'polygon', 'hexagon', 'pentagon', 'arrow', 'cross', 'blank', 'background', 'line',
  'entrybot', 'entrybot_walk1', 'entrybot_walk2', 'entrybot_fly',
  'cat', 'dog', 'tree', 'coin',
  '엔트리봇', '엔트리봇_걷기1', '엔트리봇_걷기2', '엔트리봇_날기',
  '고양이', '강아지', '나무', '코인', '동전', '원', '네모', '별', '하트'
]);

// ── 블록 생성 보조 ─────────────────────────────────────────────
const num = n => ({ type: 'number', params: [String(n)] });
const txt = s => ({ type: 'text', params: [String(s)] });
const bool = b => ({ type: b ? 'True' : 'False', params: [] });
const colorBlock = hex => ({ type: 'color', params: [hex] });

function fnv(str) {
  let h = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h >>> 0;
}

export function compileModule(ast, options = {}) {
  return new Compiler(options).run(ast);
}

class Compiler {
  constructor(options) {
    this.options = options;
    this.usedIds = new Set();
    this.warnings = [];
    this.meta = { name: options.name || '내 작품', speed: 60, category: 'game' };
    this.scenes = [];                 // {id, name}
    this.sceneByName = new Map();
    this.globals = new Map();         // name → {scope:'global', kind, id, rec}
    this.messages = new Map();        // name → id
    this.objects = [];                // ObjectInfo
    this.objectByName = new Map();
    this.funcs = new Map();           // name → FuncInfo
    this.ctx = null;                  // 현재 컴파일 중인 문맥
    this.tempCount = 0;
  }

  // ── 오류/경고 ────────────────────────────────────────────
  fail(msg, node) { throw new ReprError(msg, node?.line || 0, node?.col || 0, 'compile'); }
  warn(msg, node) { this.warnings.push({ message: msg, line: node?.line || 0, col: node?.col || 0 }); }

  // ── id ──────────────────────────────────────────────────
  makeId(seed) {
    let n = fnv(seed);
    for (;;) {
      const id = (n % 1679616).toString(36).padStart(4, '0'); // 36^4
      if (!this.usedIds.has(id)) { this.usedIds.add(id); return id; }
      n = fnv(id + seed + '#');
    }
  }

  // ═══ 실행 ═════════════════════════════════════════════════
  run(ast) {
    this.collect(ast);
    if (!this.scenes.length) this.addScene('장면 1');
    for (const o of this.objects) this.prescanObject(o);
    this.emitFunctions();
    for (const o of this.objects) this.emitObject(o);
    return this.buildModel();
  }

  addScene(name, node) {
    if (this.sceneByName.has(name)) return this.sceneByName.get(name);
    const sc = { id: this.makeId('scene:' + name), name };
    this.scenes.push(sc);
    this.sceneByName.set(name, sc);
    return sc;
  }

  // ── 1) 선언 수집 ──────────────────────────────────────────
  collect(ast) {
    const topScene = null;
    for (const st of ast.body) this.collectTop(st, topScene);
  }

  collectTop(st, scene) {
    switch (st.t) {
      case 'Pass': return;
      case 'ExprStmt':
        if (st.expr.t === 'Str') return;
        if (st.expr.t === 'Call' && st.expr.func.t === 'Name') {
          const n = st.expr.func.id;
          if (n === 'project') return this.collectProject(st.expr);
          if (n === 'message') { st.expr.args.forEach(a => this.declareMessage(this.constString(a, '신호 이름'))); return; }
          if (n === 'scene') { st.expr.args.forEach(a => this.addScene(this.constString(a, '장면 이름'))); return; }
        }
        this.fail('최상위에는 선언만 쓸 수 있습니다. 실행할 코드는 object 안의 when 블록에 쓰세요', st);
        return;
      case 'Assign': return this.declareVariable(st, null);
      case 'Def': return this.registerFunction(st);
      case 'SceneDef': {
        const sc = this.addScene(st.name, st);
        if (st.body) for (const s of st.body) {
          if (s.t === 'ObjectDef') this.registerObject(s, sc);
          else if (s.t === 'Pass') continue;
          else if (s.t === 'Def') this.registerFunction(s);
          else if (s.t === 'Assign') this.declareVariable(s, null);
          else this.fail('scene 블록 안에는 object / textbox 만 쓸 수 있습니다', s);
        }
        return;
      }
      case 'ObjectDef': return this.registerObject(st, null);
      default:
        this.fail('최상위에는 선언(변수, def, object, scene)만 쓸 수 있습니다', st);
    }
  }

  collectProject(call) {
    for (const kw of call.kwargs) {
      const v = this.constAny(kw.value);
      if (kw.name === 'name') this.meta.name = String(v);
      else if (kw.name === 'speed') this.meta.speed = Number(v);
      else if (kw.name === 'category') this.meta.category = String(v);
      else this.fail(`project() 에 알 수 없는 옵션: ${kw.name} (name, speed, category)`, kw);
    }
    if (call.args[0]) this.meta.name = String(this.constAny(call.args[0]));
  }

  declareMessage(name) {
    if (!this.messages.has(name)) this.messages.set(name, this.makeId('msg:' + name));
    return this.messages.get(name);
  }

  // 상수 평가 -------------------------------------------------
  constAny(e) {
    switch (e.t) {
      case 'Num': return e.v;
      case 'Str': return e.v;
      case 'Bool': return e.v;
      case 'Name': return e.id;                   // 색 이름 같은 식별자
      case 'Neg': { const v = this.constAny(e.operand); if (typeof v === 'number') return -v; break; }
      case 'List': return e.items.map(i => this.constAny(i));
      case 'Tuple': return e.items.map(i => this.constAny(i));
      case 'Call': {
        if (e.func.t === 'Name') {
          const fn = e.func.id;
          if (fn === 'image') {
            const src = e.args[0] ? this.constAny(e.args[0]) : '';
            const kw = Object.fromEntries(e.kwargs.map(k => [k.name, this.constAny(k.value)]));
            return { kind: 'image', src, width: kw.width || kw.w || 100, height: kw.height || kw.h || 100 };
          }
          if (fn === 'shape') {
            const first = e.args[0] ? this.constAny(e.args[0]) : null;
            const second = e.args[1] ? this.constAny(e.args[1]) : null;
            if (second !== null) {
              return { kind: 'shape_alias', alias: String(first), target: second };
            }
            return { kind: 'shape_alias', alias: null, target: first };
          }
          if (SHAPE_NAMES.has(fn) || isKnownPresetShape(fn)) {
            return {
              shape: fn,
              args: e.args.map(a => this.constAny(a)),
              kwargs: Object.fromEntries(e.kwargs.map(k => [k.name, this.constAny(k.value)]))
            };
          }
        }
        break;
      }
    }
    this.fail('여기에는 상수(숫자, 문자열, True/False)만 쓸 수 있습니다', e);
  }
  constString(e, what = '값') {
    if (e.t === 'Str') return e.v;
    if (e.t === 'Name') return e.id;
    if (e.t === 'Num') return String(e.v);
    this.fail(`${what}은(는) 문자열 상수여야 합니다`, e);
  }

  // 변수 선언 (최상위 / 오브젝트 본문) ------------------------------
  declareVariable(st, obj) {
    if (st.targets.length !== 1 || st.targets[0].t !== 'Name') {
      this.fail('선언은 `이름 = 값` 형태여야 합니다', st);
    }
    const name = st.targets[0].id;
    const v = st.value;
    const scopeMap = obj ? obj.locals : this.globals;
    const objectId = obj ? obj.id : null;
    const base = { name, id: this.makeId((obj ? obj.id + ':' : 'var:') + name), objectId };
    const kw = (call, k, d) => { const f = call.kwargs.find(x => x.name === k); return f ? this.constAny(f.value) : d; };
    const pos = call => {
      const given = call.kwargs.some(k => k.name === 'x' || k.name === 'y');
      if (!given) return { x: 0, y: 0 }; // 0,0 → 엔트리가 자동 배치
      // 엔트리 변수 좌표는 y 가 아래로 증가하고, 0 은 자동 배치로 처리되므로 보정한다
      const x = kw(call, 'x', 0), y = kw(call, 'y', 0);
      return { x: x === 0 ? 0.5 : x, y: y === 0 ? 0.5 : -y };
    };
    let info;
    if (v.t === 'Call' && v.func.t === 'Name' && ['variable', 'slider', 'list'].includes(v.func.id) && !this.funcs.has(v.func.id)) {
      const fnName = v.func.id;
      if (fnName === 'list') {
        const items = v.args[0] ? this.constAny(v.args[0]) : [];
        if (!Array.isArray(items)) this.fail('list() 의 첫 인자는 [..] 목록이어야 합니다', v);
        info = { ...base, kind: 'list', items, visible: kw(v, 'visible', false), ...pos(v), width: kw(v, 'width', 100), height: kw(v, 'height', 120), cloud: kw(v, 'cloud', false) };
      } else if (fnName === 'slider') {
        info = { ...base, kind: 'slide', value: v.args[0] ? this.constAny(v.args[0]) : 0, min: kw(v, 'min', 0), max: kw(v, 'max', 100), visible: kw(v, 'visible', true), ...pos(v), cloud: false };
      } else {
        info = { ...base, kind: 'var', value: v.args[0] ? this.constAny(v.args[0]) : 0, visible: kw(v, 'visible', false), ...pos(v), cloud: kw(v, 'cloud', false) };
      }
    } else if (v.t === 'List') {
      info = { ...base, kind: 'list', items: this.constAny(v), visible: false, x: 0, y: 0, width: 100, height: 120, cloud: false };
    } else {
      const val = this.constAny(v);
      if (typeof val === 'object') this.fail('변수의 초기값은 숫자, 문자열, True/False 중 하나여야 합니다', v);
      info = { ...base, kind: 'var', value: val, visible: false, x: 0, y: 0, cloud: false };
    }
    info.scope = obj ? 'object' : 'global';
    scopeMap.set(name, info);
  }

  // 함수 등록 --------------------------------------------------
  registerFunction(st) {
    if (this.funcs.has(st.name)) this.fail(`함수 '${st.name}' 가 이미 정의되어 있습니다`, st);
    const id = this.makeId('func:' + st.name);
    const params = st.params.map(p => {
      let type = 'string';
      if (p.type) {
        const tn = p.type.t === 'Name' ? p.type.id : p.type.t === 'Str' ? p.type.v : '';
        if (['bool', 'boolean', '불리언'].includes(tn)) type = 'boolean';
      }
      return { name: p.name, type, id: this.makeId(`param:${st.name}.${p.name}`) };
    });
    // 반환값: 마지막 문장이 `return 식` 이면 값 함수
    const last = st.body[st.body.length - 1];
    const returnsValue = !!(last && last.t === 'Return' && last.value);
    this.funcs.set(st.name, { name: st.name, id, params, returnsValue, def: st, locals: new Map(), globalsDeclared: new Set() });
  }

  registerObject(st, scene) {
    if (this.objectByName.has(st.name)) this.fail(`오브젝트 '${st.name}' 가 이미 있습니다`, st);
    const sceneKw = st.kwargs.find(k => k.name === 'scene');
    if (sceneKw) scene = this.addScene(this.constString(sceneKw.value, '장면 이름'));
    const info = {
      name: st.name, kind: st.kind, node: st, id: this.makeId('obj:' + st.name),
      scene: scene, locals: new Map(), pictures: [], sounds: [], whens: [], pictureNames: new Map(), soundNames: new Map(),
      script: [], props: {},
    };
    this.objects.push(info);
    this.objectByName.set(st.name, info);
    // 본문 선언 처리
    for (const s of st.body) {
      switch (s.t) {
        case 'Pass': break;
        case 'ExprStmt': if (s.expr.t === 'Str') break; this.fail('오브젝트 본문에는 선언과 when 블록만 쓸 수 있습니다. 실행할 코드는 when 블록 안에 쓰세요', s); break;
        case 'Assign': {
          const targetName = s.targets[0]?.id;
          if (targetName === 'shapes') {
            const listVal = this.constAny(s.value);
            const items = Array.isArray(listVal) ? listVal : [listVal];
            for (const item of items) {
              this.addPictureFromAny(info, item, s);
            }
          } else if (targetName === 'shape') {
            const val = this.constAny(s.value);
            this.addPictureFromAny(info, val, s);
          } else {
            this.declareVariable(s, info);
          }
          break;
        }
        case 'Def': this.registerFunction(s); break;
        case 'When': info.whens.push(s); break;
        case 'ShapeDecl': this.addPicture(info, s); break;
        case 'SoundDecl': this.addSound(info, s); break;
        default: this.fail('오브젝트 본문에는 선언(변수, shape, sound, def)과 when 블록만 쓸 수 있습니다', s);
      }
    }
    // 헤더 옵션의 shapes=, shape=, image=
    const shapesKw = st.kwargs.find(k => k.name === 'shapes');
    if (shapesKw) {
      const listVal = this.constAny(shapesKw.value);
      const items = Array.isArray(listVal) ? listVal : [listVal];
      for (const item of items) {
        this.addPictureFromAny(info, item, shapesKw);
      }
    }
    const shapeKw = st.kwargs.find(k => k.name === 'shape' || k.name === 'image');
    if (shapeKw) {
      const val = this.constAny(shapeKw.value);
      this.addPictureFromAny(info, val, shapeKw, true);
    }
    const soundKw = st.kwargs.find(k => k.name === 'sound');
    if (soundKw) this.addSound(info, { expr: soundKw.value, alias: null, line: soundKw.line, col: soundKw.col });
  }

  addPicture(info, st, front = false) {
    const v = this.constAny(st.expr);
    this.addPictureFromAny(info, v, st, front, st.alias);
  }

  addPictureFromAny(info, v, node, front = false, explicitAlias = null) {
    if (!v) return;
    let req;
    if (typeof v === 'string') {
      const base = v.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
      req = { kind: 'file', file: v, name: explicitAlias || base };
    } else if (v.kind === 'shape_alias') {
      const targetVal = v.target;
      const alias = explicitAlias || v.alias;
      if (typeof targetVal === 'string') {
        req = { kind: 'file', file: targetVal, name: alias || targetVal };
      } else if (targetVal && targetVal.shape) {
        req = { kind: 'shape', shape: targetVal.shape, args: targetVal.args, kwargs: targetVal.kwargs, name: alias || targetVal.shape };
      } else if (targetVal && targetVal.kind === 'image') {
        req = { kind: 'image', src: targetVal.src, width: targetVal.width, height: targetVal.height, name: alias || 'image' };
      } else {
        req = { kind: 'file', file: String(targetVal), name: alias || 'shape' };
      }
    } else if (v.kind === 'image') {
      req = { kind: 'image', src: v.src, width: v.width, height: v.height, name: explicitAlias || 'image' };
    } else if (v.shape) {
      req = { kind: 'shape', shape: v.shape, args: v.args, kwargs: v.kwargs, name: explicitAlias || v.shape };
    } else {
      this.fail('shape 은 문자열(파일/프리셋 이름), image(...) 또는 circle()/rect() 같은 도형이어야 합니다', node);
    }
    req.id = this.makeId(`pic:${info.id}:${info.pictures.length}`);
    req.line = node?.line || 0;
    let name = req.name, n = 2;
    while (info.pictureNames.has(name)) name = `${req.name}${n++}`;
    req.name = name;
    info.pictureNames.set(name, req.id);
    front ? info.pictures.unshift(req) : info.pictures.push(req);
  }

  addSound(info, st) {
    const v = this.constAny(st.expr);
    if (typeof v !== 'string') this.fail('sound 는 파일 이름(문자열)이어야 합니다', st);
    const base = v.split(/[\\/]/).pop().replace(/\.[^.]+$/, '');
    let name = st.alias || base, n = 2;
    const nm = name;
    while (info.soundNames.has(name)) name = `${nm}${n++}`;
    const req = { kind: 'file', file: v, name, id: this.makeId(`snd:${info.id}:${info.sounds.length}`), line: st.line };
    info.soundNames.set(name, req.id);
    info.sounds.push(req);
  }

  // ── 2) 사전 훑기: 자동 전역 변수 ───────────────────────────
  *walk(stmts) {
    for (const s of stmts || []) {
      yield s;
      if (s.body) yield* this.walk(s.body);
      if (s.orelse) yield* this.walk(s.orelse);
    }
  }

  assignedNames(stmts, includeFor = true) {
    const names = new Set();
    const addTarget = t => {
      if (t.t === 'Name') names.add(t.id);
      else if (t.t === 'Tuple') t.items.forEach(addTarget);
    };
    for (const s of this.walk(stmts)) {
      if (s.t === 'Assign') s.targets.forEach(addTarget);
      else if (s.t === 'AugAssign') addTarget(s.target);
      else if (s.t === 'For' && includeFor) addTarget(s.target);
    }
    return names;
  }

  prescanObject(o) {
    for (const w of o.whens) {
      for (const name of this.assignedNames(w.body, false)) this.ensureVar(name, o);
    }
  }

  ensureVar(name, obj) {
    if (obj && obj.locals.has(name)) return;
    if (this.globals.has(name)) return;
    if (this.funcs.has(name) || this.objectByName.has(name)) return;
    this.globals.set(name, {
      name, scope: 'global', kind: 'var', id: this.makeId('var:' + name), objectId: null,
      value: 0, visible: false, x: 0, y: 0, cloud: false,
    });
  }

  // ── 3) 방출 ───────────────────────────────────────────────
  emitFunctions() {
    for (const f of this.funcs.values()) {
      const st = f.def;
      // 지역 변수 = 함수 안에서 대입되는 이름 (global 선언·매개변수 제외)
      const globalsDeclared = new Set();
      for (const s of this.walk(st.body)) if (s.t === 'Global') s.names.forEach(n => globalsDeclared.add(n));
      f.globalsDeclared = globalsDeclared;
      for (const n of globalsDeclared) this.ensureVar(n, null);
      const paramNames = new Set(f.params.map(p => p.name));
      for (const n of this.assignedNames(st.body)) {
        if (globalsDeclared.has(n) || paramNames.has(n)) continue;
        f.locals.set(n, { name: n, id: `${f.id}_${n}`, scope: 'fn', kind: 'var' });
      }
    }
    for (const f of this.funcs.values()) {
      const st = f.def;
      this.ctx = { obj: null, fn: f, loops: 0 };
      let body = st.body;
      let ret = null;
      const last = body[body.length - 1];
      if (last && last.t === 'Return') {
        body = body.slice(0, -1);
        if (last.value) ret = this.valueBlock(last.value);
      }
      for (const s of this.walk(body)) {
        if (s.t === 'Return') this.fail('return 은 함수의 맨 마지막 문장으로만 쓸 수 있습니다 (엔트리 함수는 중간에 값을 돌려줄 수 없습니다)', s);
      }
      f.compiledBody = this.block(body);
      f.compiledReturn = ret;
      this.ctx = null;
    }
  }

  emitObject(o) {
    for (const w of o.whens) {
      this.ctx = { obj: o, fn: null, loops: 0 };
      const body = this.block(w.body);
      this.ctx = null;
      for (const head of this.eventHeads(w, o)) o.script.push([head, ...structuredClone(body)]);
    }
  }

  eventHeads(w, o) {
    const e = w.event;
    let name, args = [];
    if (e.t === 'Name') name = e.id;
    else if (e.t === 'Call' && e.func.t === 'Name') { name = e.func.id; args = e.args; }
    else this.fail('when 뒤에는 이벤트 이름이 필요합니다 (예: when run: / when key("space"):)', e);
    const ev = EVENTS[name];
    if (!ev) this.fail(`알 수 없는 이벤트: ${name}. 사용 가능: ${[...new Set(Object.keys(EVENTS).filter(k => /^[a-z_]+$/.test(k)))].join(', ')}`, e);
    const [type, argKind, flags] = ev;
    const reg = REGISTRY[type];
    const params = new Array(reg.p.length).fill(null);
    if (argKind === 'key') {
      if (args.length !== 1) this.fail('when key("키") 처럼 키를 하나 지정하세요', e);
      params[reg.p.indexOf('K')] = this.keyOf(args[0]);
    } else if (argKind === 'message') {
      if (args.length !== 1) this.fail('when message("신호") 처럼 신호 이름을 하나 지정하세요', e);
      params[reg.p.indexOf('Y')] = this.declareMessage(this.constString(args[0], '신호 이름'));
    } else if (args.length) this.fail(`${name} 이벤트는 인자를 받지 않습니다`, e);
    const heads = [{ type, params }];
    if (flags && flags.sceneStart) {
      // 첫 장면에서는 시작 버튼, 그 외 장면에서는 장면 시작 이벤트만 발생한다.
      const first = this.scenes[0];
      const mine = o.scene || first;
      const sceneHead = { type: 'when_scene_start', params: [null] };
      if (mine !== first) return [sceneHead];
      heads.push(sceneHead);
    }
    return heads;
  }

  keyOf(node) {
    const raw = node.t === 'Str' ? node.v : node.t === 'Num' ? String(node.v) : node.t === 'Name' ? node.id : null;
    const code = raw == null ? null : keyCode(raw);
    if (!code) this.fail(`알 수 없는 키: ${raw ?? '?'} (예: "space", "left", "a", "1", "enter")`, node);
    return code;
  }

  // ═══ 블록 / 문장 ═══════════════════════════════════════════
  block(stmts) {
    const out = [];
    for (const s of stmts) out.push(...this.stmt(s));
    return out;
  }

  stmt(s) {
    switch (s.t) {
      case 'Pass': return [];
      case 'ExprStmt': return this.exprStmt(s);
      case 'Assign': return this.assign(s);
      case 'AugAssign': return this.augAssign(s);
      case 'If': return this.ifStmt(s);
      case 'While': return this.whileStmt(s);
      case 'For': return this.forStmt(s);
      case 'Break':
        if (!this.ctx.loops) this.fail('break 는 반복문 안에서만 쓸 수 있습니다', s);
        return [this.mk('stop_repeat', {})];
      case 'Continue':
        if (!this.ctx.loops) this.fail('continue 는 반복문 안에서만 쓸 수 있습니다', s);
        return [this.mk('continue_repeat', {})];
      case 'Return': this.fail('return 은 함수의 맨 마지막 문장으로만 쓸 수 있습니다', s); return [];
      case 'Global': return [];
      case 'Del': return this.delStmt(s);
      case 'Def': this.fail('def 는 최상위 또는 오브젝트 본문에서만 정의할 수 있습니다', s); return [];
      case 'When': this.fail('when 은 오브젝트 본문에서만 쓸 수 있습니다 (중첩 불가)', s); return [];
      case 'ObjectDef': case 'SceneDef': this.fail(`${s.t === 'SceneDef' ? 'scene' : 'object'} 는 최상위에서만 선언할 수 있습니다`, s); return [];
      case 'ShapeDecl': case 'SoundDecl': this.fail('shape / sound 는 오브젝트 본문 맨 위에 선언하세요 (when 안에서는 set_shape / play_sound 를 쓰세요)', s); return [];
      default: this.fail(`지원하지 않는 문장: ${s.t}`, s); return [];
    }
  }

  // 블록 생성 -------------------------------------------------
  // slots: {슬롯번호: 값}, statements: [[...],[...]]
  mk(type, slots = {}, statements = null) {
    const reg = REGISTRY[type];
    const n = reg ? reg.p.length : Math.max(-1, ...Object.keys(slots).map(Number)) + 1;
    const params = new Array(n).fill(null);
    for (const [i, v] of Object.entries(slots)) params[i] = v;
    const b = { type, params };
    const sc = reg ? reg.s : 0;
    if (statements) {
      b.statements = statements;
      while (b.statements.length < sc) b.statements.push([]);
    } else if (sc > 0) b.statements = Array.from({ length: sc }, () => []);
    return b;
  }

  // ── 변수 해석 ───────────────────────────────────────────
  lookup(name) {
    const { fn, obj } = this.ctx;
    if (fn) {
      const p = fn.params.find(x => x.name === name);
      if (p) return { scope: 'param', param: p, kind: 'var' };
      if (fn.locals.has(name)) return fn.locals.get(name);
    }
    if (obj && obj.locals.has(name)) return obj.locals.get(name);
    if (this.globals.has(name)) return this.globals.get(name);
    return null;
  }

  getVar(ref) {
    if (ref.scope === 'param') return { type: `${ref.param.type === 'boolean' ? 'booleanParam' : 'stringParam'}_${ref.param.id}`, params: [] };
    if (ref.scope === 'fn') return { type: 'get_func_variable', params: [ref.id, null] };
    return { type: 'get_variable', params: [ref.id, null] };
  }
  setVar(ref, value, node) {
    if (ref.scope === 'param') this.fail(`매개변수 '${ref.param.name}' 에는 값을 대입할 수 없습니다`, node);
    if (ref.scope === 'fn') return this.mk('set_func_variable', { 0: ref.id, 1: value });
    return this.mk('set_variable', { 0: ref.id, 1: value });
  }
  changeVar(ref, delta, node) {
    if (ref.scope === 'param') this.fail(`매개변수 '${ref.param.name}' 의 값을 바꿀 수 없습니다`, node);
    if (ref.scope === 'fn') {
      return this.mk('set_func_variable', { 0: ref.id, 1: this.mk('calc_basic', { 0: this.getVar(ref), 1: 'PLUS', 2: delta }) });
    }
    return this.mk('change_variable', { 0: ref.id, 1: delta });
  }

  // 임시 변수 (for 반복 등)
  tempVar(prefix) {
    const name = `_${prefix}${++this.tempCount}`;
    const { fn, obj } = this.ctx;
    if (fn) { const r = { name, id: `${fn.id}_${name}`, scope: 'fn', kind: 'var' }; fn.locals.set(name, r); return r; }
    if (obj) {
      const r = { name, scope: 'object', kind: 'var', id: this.makeId(`tmp:${obj.id}:${name}`), objectId: obj.id, value: 0, visible: false, x: 0, y: 0, cloud: false };
      obj.locals.set(name, r); return r;
    }
    this.fail('내부 오류: 임시 변수를 만들 수 없는 위치입니다', null);
  }

  // 반복문의 대상 변수: for 의 이름은 오브젝트 지역/함수 지역으로 만든다.
  loopVar(name, node) {
    const existing = this.lookup(name);
    if (existing && existing.scope !== 'param') return existing;
    const { fn, obj } = this.ctx;
    if (fn) { const r = { name, id: `${fn.id}_${name}`, scope: 'fn', kind: 'var' }; fn.locals.set(name, r); return r; }
    const r = { name, scope: 'object', kind: 'var', id: this.makeId(`loop:${obj.id}:${name}`), objectId: obj.id, value: 0, visible: false, x: 0, y: 0, cloud: false };
    obj.locals.set(name, r);
    return r;
  }

  // ── 대입 ────────────────────────────────────────────────
  assign(s) {
    const out = [];
    const value = s.value;
    for (const target of s.targets) out.push(...this.assignTo(target, value, s));
    return out;
  }

  assignTo(target, value, s) {
    if (target.t === 'Tuple') {
      if (value.t !== 'Tuple' || value.items.length !== target.items.length) this.fail('튜플 대입은 같은 개수의 값이 필요합니다 (예: a, b = 1, 2)', s);
      // self.pos = ... 가 아니라면 순서대로 대입한다 (교환 `a, b = b, a` 는 안전하지 않다)
      if (value.items.some(v => v.t === 'Name' && target.items.some(t => t.t === 'Name' && t.id === v.id))) {
        this.warn('튜플 대입은 순서대로 실행되므로 값을 맞바꾸는 용도(a, b = b, a)로는 안전하지 않습니다', s);
      }
      return target.items.flatMap((t, i) => this.assignTo(t, value.items[i], s));
    }
    // 삼항식 대입 → if/else
    if (value.t === 'IfExp') {
      const mkAssign = v => ({ t: 'Assign', targets: [target], value: v, line: s.line, col: s.col });
      return this.stmt({ t: 'If', test: value.test, body: [mkAssign(value.body)], orelse: [mkAssign(value.orelse)], line: s.line, col: s.col });
    }
    // input() → 묻고 기다리기 + 대답 저장
    if (value.t === 'Call' && value.func.t === 'Name' && value.func.id === 'input' && !this.funcs.has('input')) {
      const ask = this.mk('ask_and_wait', { 0: value.args[0] ? this.valueBlock(value.args[0]) : txt('') });
      return [ask, ...this.assignTo(target, { t: 'Name', id: 'answer', line: s.line, col: s.col }, s)];
    }
    if (target.t === 'Name') {
      let ref = this.lookup(target.id);
      if (!ref) {
        if (this.ctx.fn) { // 함수 안의 새 이름은 이미 emitFunctions 에서 지역 변수로 등록됨
          this.fail(`'${target.id}' 를 해석할 수 없습니다`, target);
        }
        this.ensureVar(target.id, this.ctx.obj);
        ref = this.lookup(target.id);
      }
      if (ref.kind === 'list') {
        if (value.t === 'List' && value.items.length === 0) return this.clearList(ref);
        this.fail(`'${target.id}' 는 리스트입니다. 리스트에는 값을 직접 대입할 수 없습니다 (append / lst[번호] = 값)`, target);
      }
      if (value.t === 'List') this.fail('리스트 값은 선언(최상위/오브젝트 본문)에서만 만들 수 있습니다', value);
      return [this.setVar(ref, this.valueBlock(value), target)];
    }
    if (target.t === 'Index') {
      const list = this.listRef(target.obj);
      return [this.mk('change_value_list_index', { 0: list.id, 1: this.valueBlock(target.index), 2: this.valueBlock(value) })];
    }
    if (target.t === 'Attr') return this.assignAttr(target, value, s, false);
    this.fail('대입할 수 없는 대상입니다', target);
  }

  assignAttr(target, value, s, aug, op) {
    if (!(target.obj.t === 'Name' && target.obj.id === 'self')) {
      this.fail('다른 오브젝트의 속성은 바꿀 수 없습니다 (신호를 보내 그 오브젝트가 스스로 바꾸게 하세요). self.x = ... 처럼 자기 자신만 가능합니다', target);
    }
    const name = target.name;
    if (name === 'pos' && !aug) {
      if (value.t !== 'Tuple' || value.items.length !== 2) this.fail('self.pos = (x, y) 형태로 써 주세요', value);
      return [this.mk('locate_xy', { 0: this.valueBlock(value.items[0]), 1: this.valueBlock(value.items[1]) })];
    }
    if (name === 'visible') {
      if (aug) this.fail('visible 에는 += 를 쓸 수 없습니다', target);
      if (value.t === 'Bool') return [this.mk(value.v ? 'show' : 'hide')];
      return [this.mk('if_else', { 0: this.toBool(value) }, [[this.mk('show')], [this.mk('hide')]])];
    }
    const SET = { x: 'locate_x', y: 'locate_y', direction: 'direction_absolute', rotation: 'rotate_absolute', size: 'set_scale_size', shape: 'change_to_some_shape', text: 'text_write' };
    const ADD = { x: 'move_x', y: 'move_y', direction: 'direction_relative', rotation: 'rotate_relative', size: 'change_scale_size', text: 'text_append' };
    if (!SET[name]) this.fail(`self.${name} 에는 대입할 수 없습니다 (x, y, pos, direction, rotation, size, shape, visible, text)`, target);
    if (aug && (op === '+' || op === '-') && ADD[name]) {
      let v = this.valueBlock(value);
      if (op === '-') {
        if (name === 'text') this.fail('text 에는 -= 를 쓸 수 없습니다', target);
        v = value.t === 'Num' ? num(-value.v) : this.mk('calc_basic', { 0: num(0), 1: 'MINUS', 2: v });
      }
      return [this.mk(ADD[name], { 0: v })];
    }
    if (aug) {
      const cur = this.attrRead({ obj: target.obj, name }, target).b;
      const v = this.binBlock(op, { b: cur, t: 'any' }, this.expr(value), s);
      return [this.mk(SET[name], { 0: v.b })];
    }
    return [this.mk(SET[name], { 0: this.valueBlock(value) })];
  }

  augAssign(s) {
    const { target, op, value } = s;
    if (target.t === 'Name') {
      const ref = this.lookup(target.id) || (this.ensureVar(target.id, this.ctx.obj), this.lookup(target.id));
      if (ref.kind === 'list') this.fail('리스트에는 복합 대입을 쓸 수 없습니다', target);
      if (op === '+' || op === '-') {
        let v = this.valueBlock(value);
        if (op === '-') v = value.t === 'Num' ? num(-value.v) : this.mk('calc_basic', { 0: num(0), 1: 'MINUS', 2: v });
        return [this.changeVar(ref, v, target)];
      }
      const r = this.binBlock(op, { b: this.getVar(ref), t: 'any' }, this.expr(value), s);
      return [this.setVar(ref, r.b, target)];
    }
    if (target.t === 'Index') {
      const list = this.listRef(target.obj);
      const cur = { b: this.mk('value_of_index_from_list', { 1: list.id, 3: this.valueBlock(target.index) }), t: 'any' };
      const r = this.binBlock(op, cur, this.expr(value), s);
      return [this.mk('change_value_list_index', { 0: list.id, 1: this.valueBlock(target.index), 2: r.b })];
    }
    if (target.t === 'Attr') return this.assignAttr(target, value, s, true, op);
    this.fail('복합 대입할 수 없는 대상입니다', target);
  }

  clearList(ref) {
    const cond = this.mk('boolean_basic_operator', { 0: this.mk('length_of_list', { 1: ref.id }), 1: 'GREATER', 2: num(0) });
    return [this.mk('repeat_while_true', { 0: cond, 1: 'while' }, [[this.mk('remove_value_from_list', { 0: num(1), 1: ref.id })]])];
  }

  delStmt(s) {
    const t = s.target;
    if (t.t !== 'Index') this.fail('del 은 del 리스트[번호] 형태만 지원합니다', s);
    const list = this.listRef(t.obj);
    return [this.mk('remove_value_from_list', { 0: this.valueBlock(t.index), 1: list.id })];
  }

  listRef(node) {
    if (node.t === 'Name') {
      const ref = this.lookup(node.id);
      if (ref && ref.kind === 'list') return ref;
    }
    this.fail('리스트 변수가 필요합니다 (최상위에서 `이름 = [..]` 로 선언하세요)', node);
  }

  // ── 제어문 ──────────────────────────────────────────────
  ifStmt(s) {
    const cond = this.toBool(s.test);
    const body = this.block(s.body);
    if (!s.orelse.length) return [this.mk('_if', { 0: cond }, [body])];
    return [this.mk('if_else', { 0: cond }, [body, this.block(s.orelse)])];
  }

  loopBody(stmts) {
    this.ctx.loops++;
    const b = this.block(stmts);
    this.ctx.loops--;
    return b;
  }

  whileStmt(s) {
    const t = s.test;
    if (t.t === 'Bool' && t.v === true) return [this.mk('repeat_inf', {}, [this.loopBody(s.body)])];
    if (t.t === 'Num' && t.v) return [this.mk('repeat_inf', {}, [this.loopBody(s.body)])];
    if (t.t === 'Not') return [this.mk('repeat_while_true', { 0: this.toBool(t.operand), 1: 'until' }, [this.loopBody(s.body)])];
    return [this.mk('repeat_while_true', { 0: this.toBool(t), 1: 'while' }, [this.loopBody(s.body)])];
  }

  usesName(stmts, name) {
    let found = false;
    const visit = n => {
      if (found || !n || typeof n !== 'object') return;
      if (Array.isArray(n)) return n.forEach(visit);
      if (n.t === 'Name' && n.id === name) { found = true; return; }
      for (const k of Object.keys(n)) if (k !== 'line' && k !== 'col') visit(n[k]);
    };
    visit(stmts);
    return found;
  }

  forStmt(s) {
    const it = s.iter;
    // range()
    if (it.t === 'Call' && it.func.t === 'Name' && it.func.id === 'range' && !this.funcs.has('range')) return this.forRange(s, it);
    if (s.target.t !== 'Name') this.fail('for 의 반복 변수는 하나의 이름이어야 합니다', s.target);
    // 리스트
    if (it.t === 'Name') {
      const ref = this.lookup(it.id);
      if (ref && ref.kind === 'list') {
        const idx = this.tempVar('i');
        const v = this.loopVar(s.target.id, s.target);
        const pre = [this.setVar(idx, num(0))];
        const body = [
          this.changeVar(idx, num(1)),
          this.setVar(v, this.mk('value_of_index_from_list', { 1: ref.id, 3: this.getVar(idx) })),
          ...this.loopBody(s.body),
        ];
        return [...pre, this.mk('repeat_basic', { 0: this.mk('length_of_list', { 1: ref.id }) }, [body])];
      }
    }
    // 문자열 (변수/문자열 상수/f-문자열)
    if (it.t === 'Str' || it.t === 'FStr' || (it.t === 'Name' && this.lookup(it.id))) return this.forChars(s, it);
    this.fail('for 는 range(...), 리스트 변수, 문자열만 반복할 수 있습니다', it);
  }

  forChars(s, it) {
    const idx = this.tempVar('i');
    const v = this.loopVar(s.target.id, s.target);
    const strB = this.valueBlock(it);
    const body = [
      this.changeVar(idx, num(1)),
      this.setVar(v, this.mk('char_at', { 1: strB, 3: this.getVar(idx) })),
      ...this.loopBody(s.body),
    ];
    return [this.setVar(idx, num(0)), this.mk('repeat_basic', { 0: this.mk('length_of_string', { 1: strB }) }, [body])];
  }

  forRange(s, call) {
    if (call.args.length < 1 || call.args.length > 3 || call.kwargs.length) this.fail('range(끝) / range(시작, 끝) / range(시작, 끝, 간격) 만 지원합니다', call);
    const [a0, a1, a2] = call.args;
    const startN = call.args.length === 1 ? { t: 'Num', v: 0, line: call.line, col: call.col } : a0;
    const stopN = call.args.length === 1 ? a0 : a1;
    const stepN = a2 || { t: 'Num', v: 1, line: call.line, col: call.col };
    if (stepN.t !== 'Num' || stepN.v === 0) this.fail('range 의 간격은 0이 아닌 숫자 상수여야 합니다', stepN);
    const step = stepN.v;
    const varName = s.target.t === 'Name' ? s.target.id : null;
    if (!varName) this.fail('for 의 반복 변수는 하나의 이름이어야 합니다', s.target);
    const used = varName !== '_' && this.usesName(s.body, varName);

    // 반복 횟수
    let count;
    if (startN.t === 'Num' && stopN.t === 'Num') count = num(Math.max(0, Math.ceil((stopN.v - startN.v) / step)));
    else {
      const diff = step > 0
        ? (startN.t === 'Num' && startN.v === 0 ? this.valueBlock(stopN) : this.mk('calc_basic', { 0: this.valueBlock(stopN), 1: 'MINUS', 2: this.valueBlock(startN) }))
        : this.mk('calc_basic', { 0: this.valueBlock(startN), 1: 'MINUS', 2: this.valueBlock(stopN) });
      const a = Math.abs(step);
      count = a === 1 ? diff : this.mk('quotient_and_mod', { 1: this.mk('calc_basic', { 0: diff, 1: 'PLUS', 2: num(a - 1) }), 3: num(a), 5: 'QUOTIENT' });
    }
    if (!used) return [this.mk('repeat_basic', { 0: count }, [this.loopBody(s.body)])];

    const v = this.loopVar(varName, s.target);
    const init = startN.t === 'Num'
      ? num(startN.v - step)
      : this.mk('calc_basic', { 0: this.valueBlock(startN), 1: 'MINUS', 2: num(step) });
    const body = [this.changeVar(v, num(step)), ...this.loopBody(s.body)];
    return [this.setVar(v, init), this.mk('repeat_basic', { 0: count }, [body])];
  }

  // ═══ 식 ═══════════════════════════════════════════════════
  valueBlock(node) { return this.expr(node).b; }

  toBool(node) {
    const r = this.expr(node);
    if (r.t === 'bool') return r.b;
    if (r.t === 'str') return this.mk('boolean_basic_operator', { 0: r.b, 1: 'NOT_EQUAL', 2: txt('') });
    return this.mk('boolean_basic_operator', { 0: r.b, 1: 'NOT_EQUAL', 2: num(0) });
  }

  expr(e) {
    switch (e.t) {
      case 'Num': return { b: num(e.v), t: 'num' };
      case 'Str': return { b: txt(e.v), t: 'str' };
      case 'Bool': return { b: bool(e.v), t: 'bool' };
      case 'None': this.fail('None 은 지원하지 않습니다', e); break;
      case 'FStr': return this.fstring(e);
      case 'Name': return this.nameExpr(e);
      case 'Neg': return { b: this.mk('calc_basic', { 0: num(0), 1: 'MINUS', 2: this.valueBlock(e.operand) }), t: 'num' };
      case 'Not': return { b: this.mk('boolean_not', { 1: this.toBool(e.operand) }), t: 'bool' };
      case 'BoolOp': return { b: this.mk('boolean_and_or', { 0: this.toBool(e.left), 1: e.op === 'and' ? 'AND' : 'OR', 2: this.toBool(e.right) }), t: 'bool' };
      case 'Bin': return this.binBlock(e.op, this.expr(e.left), this.expr(e.right), e, e);
      case 'Compare': return this.compare(e);
      case 'Attr': return this.attrRead(e, e);
      case 'Index': return this.indexRead(e);
      case 'Slice': return this.sliceRead(e);
      case 'Call': return this.callExpr(e);
      case 'IfExp': this.fail('삼항식(a if 조건 else b)은 `x = a if 조건 else b` 형태의 대입에서만 쓸 수 있습니다', e); break;
      case 'List': this.fail('리스트 값은 선언(최상위/오브젝트 본문)에서만 만들 수 있습니다', e); break;
      case 'Tuple': this.fail('튜플은 여기서 쓸 수 없습니다', e); break;
      default: this.fail(`지원하지 않는 식: ${e.t}`, e);
    }
  }

  fstring(e) {
    let acc = null;
    for (const p of e.parts) {
      const piece = p.lit !== undefined ? { b: txt(p.lit), t: 'str' } : this.expr(p.expr);
      acc = acc ? { b: this.mk('combine_something', { 1: acc.b, 3: piece.b }), t: 'str' } : piece;
    }
    if (!acc) return { b: txt(''), t: 'str' };
    if (e.parts.length === 1 && e.parts[0].lit === undefined) acc = { b: this.mk('combine_something', { 1: acc.b, 3: txt('') }), t: 'str' };
    return { b: acc.b, t: 'str' };
  }

  nameExpr(e) {
    const ref = this.lookup(e.id);
    if (ref) {
      if (ref.kind === 'list') this.fail(`'${e.id}' 는 리스트입니다. len(${e.id}), ${e.id}[번호] 처럼 쓰세요`, e);
      return { b: this.getVar(ref), t: 'any' };
    }
    switch (e.id) {
      case 'answer': return { b: { type: 'get_canvas_input_value', params: [] }, t: 'any' };
      case 'timer': return { b: this.mk('get_project_timer_value', {}), t: 'num' };
      case 'PI': case 'pi': return { b: num(Math.PI), t: 'num' };
      case 'self': this.fail('self 는 self.x 처럼 속성과 함께 쓰세요', e); break;
    }
    // 현재 오브젝트의 기본 속성 x, y, direction, rotation, size 단독 접근 허용
    if (['x', 'y', 'direction', 'rotation', 'size'].includes(e.id) && this.ctx.obj) {
      return this.attrRead({ obj: { t: 'Name', id: 'self' }, name: e.id }, e);
    }
    if (this.objectByName.has(e.id)) this.fail(`'${e.id}' 는 오브젝트입니다. ${e.id}.x 처럼 속성을 쓰거나 touch(${e.id}) 처럼 인자로 쓰세요`, e);
    this.fail(`'${e.id}' 를 찾을 수 없습니다. 변수는 최상위에서 선언하거나 when 안에서 처음 대입하세요`, e);
  }

  binBlock(op, l, r, node) {
    const OPS = { '+': 'PLUS', '-': 'MINUS', '*': 'MULTI', '/': 'DIVIDE' };
    if (op === '+' && (l.t === 'str' || r.t === 'str')) {
      return { b: this.mk('combine_something', { 1: l.b, 3: r.b }), t: 'str' };
    }
    if (OPS[op]) return { b: this.mk('calc_basic', { 0: l.b, 1: OPS[op], 2: r.b }), t: 'num' };
    if (op === '//') return { b: this.mk('quotient_and_mod', { 1: l.b, 3: r.b, 5: 'QUOTIENT' }), t: 'num' };
    if (op === '%') return { b: this.mk('quotient_and_mod', { 1: l.b, 3: r.b, 5: 'MOD' }), t: 'num' };
    if (op === '**') {
      const rb = r.b;
      const k = rb.type === 'number' ? Number(rb.params[0]) : NaN;
      if (k === 2) return { b: this.mk('calc_operation', { 1: l.b, 3: 'square' }), t: 'num' };
      if (k === 0.5) return { b: this.mk('calc_operation', { 1: l.b, 3: 'root' }), t: 'num' };
      if (Number.isInteger(k) && k >= 1 && k <= 6) {
        let acc = l.b;
        for (let i = 1; i < k; i++) acc = this.mk('calc_basic', { 0: acc, 1: 'MULTI', 2: structuredClone(l.b) });
        return { b: acc, t: 'num' };
      }
      this.fail('거듭제곱(**)은 지수가 1~6 사이의 정수 또는 0.5 일 때만 지원합니다', node);
    }
    this.fail(`지원하지 않는 연산자: ${op}`, node);
  }

  compare(e) {
    const CMP = { '==': 'EQUAL', '!=': 'NOT_EQUAL', '<': 'LESS', '>': 'GREATER', '<=': 'LESS_OR_EQUAL', '>=': 'GREATER_OR_EQUAL' };
    let left = e.first;
    const parts = [];
    for (let i = 0; i < e.ops.length; i++) {
      const op = e.ops[i], right = e.rest[i];
      if (op === 'in' || op === 'not in') {
        const list = this.listRef(right);
        let b = this.mk('is_included_in_list', { 1: list.id, 3: this.valueBlock(left) });
        if (op === 'not in') b = this.mk('boolean_not', { 1: b });
        parts.push(b);
      } else {
        parts.push(this.mk('boolean_basic_operator', { 0: this.valueBlock(left), 1: CMP[op], 2: this.valueBlock(right) }));
      }
      left = right;
    }
    let acc = parts[0];
    for (let i = 1; i < parts.length; i++) acc = this.mk('boolean_and_or', { 0: acc, 1: 'AND', 2: parts[i] });
    return { b: acc, t: 'bool' };
  }

  indexRead(e) {
    if (e.obj.t === 'Name') {
      const ref = this.lookup(e.obj.id);
      if (ref && ref.kind === 'list') return { b: this.mk('value_of_index_from_list', { 1: ref.id, 3: this.valueBlock(e.index) }), t: 'any' };
    }
    return { b: this.mk('char_at', { 1: this.valueBlock(e.obj), 3: this.valueBlock(e.index) }), t: 'str' };
  }

  sliceRead(e) {
    const s = this.valueBlock(e.obj);
    const lo = e.lo ? this.valueBlock(e.lo) : num(1);
    const hi = e.hi ? this.valueBlock(e.hi) : this.mk('length_of_string', { 1: structuredClone(s) });
    return { b: this.mk('substring', { 1: s, 3: lo, 5: hi }), t: 'str' };
  }

  attrRead(e) {
    const { obj, name } = e;
    if (obj.t === 'Name') {
      const id = obj.id;
      const userVar = this.lookup(id);
      if (!userVar) {
        if (id === 'mouse' && (name === 'x' || name === 'y')) return { b: this.mk('coordinate_mouse', { 1: name }), t: 'num' };
        if (id === 'timer' && name === 'value') return { b: this.mk('get_project_timer_value', {}), t: 'num' };
        if (id === 'date') {
          const part = DATE_PARTS[name];
          if (!part) this.fail(`date.${name} 을(를) 알 수 없습니다 (year, month, day, hour, minute, second, weekday)`, e);
          return { b: this.mk('get_date', { 1: part }), t: 'num' };
        }
        if (id === 'math' || id === 'random') this.fail(`${id}.${name} 은(는) 호출해서 쓰세요: ${id}.${name}(...)`, e);
        const COORD = { x: 'x', y: 'y', rotation: 'rotation', direction: 'direction', size: 'size', shape_index: 'picture_index', shape_name: 'picture_name' };
        let target = null;
        if (id === 'self') target = 'self';
        else if (this.objectByName.has(id)) target = this.objectByName.get(id).id;
        if (target !== null) {
          if (name === 'text') {
            if (id === 'self' ? this.ctx.obj?.kind !== 'textbox' : this.objectByName.get(id).kind !== 'textbox') this.fail(`'${id}' 는 글상자가 아니므로 text 를 읽을 수 없습니다`, e);
            return { b: this.mk('text_read', { 0: target }), t: 'str' };
          }
          if (!COORD[name]) this.fail(`${id}.${name} 을(를) 읽을 수 없습니다 (x, y, rotation, direction, size, shape_index, shape_name, text)`, e);
          return { b: this.mk('coordinate_object', { 1: target, 3: COORD[name] }), t: name === 'shape_name' ? 'str' : 'num' };
        }
      }
    }
    this.fail(`속성 '.${name}' 을(를) 읽을 수 없습니다`, e);
  }

  // ═══ 호출 ═════════════════════════════════════════════════
  callExpr(e) {
    const r = this.callAny(e, 'value');
    if (r.stmts) this.fail('이 호출은 값을 돌려주지 않습니다. 문장으로 쓰세요', e);
    return r;
  }

  exprStmt(s) {
    const e = s.expr;
    if (e.t === 'Str') return [];
    if (e.t !== 'Call') this.fail('이 식은 문장으로 쓸 수 없습니다 (함수 호출이어야 합니다)', e);
    const r = this.callAny(e, 'stmt');
    if (r.stmts) return r.stmts;
    this.fail('값을 돌려주는 호출은 문장으로 쓸 수 없습니다. 변수에 저장하거나 다른 블록의 인자로 쓰세요', e);
    return [];
  }

  // 반환: {b, t} (값) 또는 {stmts:[...]} (문장)
  callAny(e, mode) {
    const { func } = e;
    // 속성 호출: obj.method(...)
    if (func.t === 'Attr') return this.methodCall(e, mode);
    if (func.t !== 'Name') this.fail('호출할 수 없는 대상입니다', e);
    return this.callByName(func.id, e, mode, null);
  }

  noKw(e, name) {
    if (e.kwargs.length) this.fail(`${name}() 는 이름 있는 인자를 받지 않습니다 (${e.kwargs[0].name}=)`, e.kwargs[0]);
  }

  argc(e, name, min, max = min) {
    const n = e.args.length;
    if (n < min || n > max) this.fail(`${name}() 인자 개수가 맞지 않습니다 (${min === max ? min : `${min}~${max}`}개 필요, ${n}개 받음)`, e);
  }

  callByName(name, e, mode, receiver) {
    // 1) 사용자 정의 함수
    if (!receiver && this.funcs.has(name)) return this.userCall(this.funcs.get(name), e, mode);
    // 2) 특수 내장
    const special = this.special(name, e, mode, receiver);
    if (special) return special;
    // 3) 별칭표 / 블록 type 이름
    const args = receiver ? [receiver, ...e.args] : e.args;
    const alias = STATEMENTS[name] || VALUES[name];
    if (alias) return this.fromSpec(alias, args, e, name);
    if (REGISTRY[name] && !receiver) return this.fromSpec([name], args, e, name);
    this.fail(`'${name}' 을(를) 알 수 없습니다. 함수/블록 이름을 확인하세요`, e);
  }

  userCall(f, e, mode) {
    this.noKw(e, f.name);
    this.argc(e, f.name, f.params.length);
    const params = e.args.map((a, i) => (f.params[i].type === 'boolean' ? this.toBool(a) : this.valueBlock(a)));
    const b = { type: `func_${f.id}`, params };
    if (f.returnsValue) {
      if (mode === 'stmt') this.fail(`함수 '${f.name}' 는 값을 돌려주는 함수입니다. 엔트리에서는 값 함수를 문장으로 쓸 수 없으니 변수에 저장하세요: x = ${f.name}(...)`, e);
      return { b, t: 'any' };
    }
    if (mode === 'value') this.fail(`함수 '${f.name}' 는 값을 돌려주지 않습니다 (마지막 줄에 return 값 을 쓰세요)`, e);
    return { stmts: [b] };
  }

  // 별칭표 항목으로 블록 만들기
  fromSpec(spec, args, e, label) {
    const [type, fixed = null, opts = {}] = spec;
    const reg = REGISTRY[type];
    if (!reg) this.fail(`내부 오류: 블록 '${type}' 이 레지스트리에 없습니다`, e);
    if (reg.k === 'n' || reg.k === 'c') this.fail(`'${label}' 블록은 코드에서 직접 쓸 수 없습니다`, e);
    if (reg.k === 'e') this.fail(`'${label}' 은(는) 이벤트입니다. when ... 으로 쓰세요`, e);
    this.noKw(e, label);
    const params = new Array(reg.p.length).fill(null);
    const argSlots = [];
    for (let i = 0; i < reg.p.length; i++) {
      if (fixed && i in fixed) params[i] = fixed[i];
      else if (SLOT_ARG.includes(reg.p[i])) argSlots.push(i);
    }
    const required = argSlots.filter(i => !(opts.defaults && i in opts.defaults)).length;
    if (args.length > argSlots.length || args.length < required) {
      this.fail(`${label}() 인자 개수가 맞지 않습니다 (${required === argSlots.length ? required : `${required}~${argSlots.length}`}개 필요, ${args.length}개 받음)`, e);
    }
    argSlots.forEach((slot, k) => {
      const a = args[k];
      if (a === undefined) { params[slot] = opts.defaults[slot]; return; }
      params[slot] = this.slotValue(type, reg, slot, a, opts, label);
    });
    const b = { type, params };
    if (reg.s) b.statements = Array.from({ length: reg.s }, () => []);
    return this.wrap(b, reg, type);
  }

  wrap(b, reg, type) {
    if (reg.k === 's') return { stmts: [b] };
    const t = reg.k === 'b' ? 'bool' : STR_TYPES.has(type) ? 'str' : 'any';
    return { b, t };
  }

  slotValue(type, reg, slot, node, opts, label) {
    const code = reg.p[slot];
    switch (code) {
      case 'B': {
        if (opts.color && opts.color.includes(slot)) {
          const raw = node.t === 'Str' ? node.v : node.t === 'Name' && !this.lookup(node.id) ? node.id : null;
          if (raw != null) {
            const c = parseColor(raw);
            if (!c) this.fail(`알 수 없는 색: ${raw} (#rrggbb 또는 red/빨강 같은 이름)`, node);
            return colorBlock(c);
          }
        }
        // 소리 이름을 받는 *_with_block 류: 소리 이름 문자열 그대로 둔다
        return this.valueBlock(node);
      }
      case 'D': case 'X': {
        const raw = this.dropdownRaw(node, label);
        const en = opts.enum && opts.enum[slot];
        if (en) {
          if (!(raw in en)) this.fail(`${label}() 에서 '${raw}' 는 쓸 수 없는 값입니다. 사용 가능: ${[...new Set(Object.keys(en))].join(', ')}`, node);
          return en[raw];
        }
        return raw;
      }
      case 'K': return this.keyOf(node);
      case 'C': { const raw = this.dropdownRaw(node, label); const c = parseColor(raw); if (!c) this.fail(`알 수 없는 색: ${raw}`, node); return c; }
      case 'A': { if (node.t !== 'Num') return this.valueBlock(node); return String(node.v); }
      case 'Y': return this.menuValue(reg.m ? reg.m[slot] : 0, node, label);
      default: return this.valueBlock(node);
    }
  }

  dropdownRaw(node, label) {
    if (node.t === 'Str') return node.v;
    if (node.t === 'Num') return String(node.v);
    if (node.t === 'Bool') return node.v ? 'True' : 'False';
    if (node.t === 'Name') return node.id;
    this.fail(`${label}() 의 이 인자는 상수여야 합니다 (문자열 또는 이름)`, node);
  }

  menuValue(menu, node, label) {
    const raw = () => {
      if (node.t === 'Str') return node.v;
      if (node.t === 'Name') return node.id;
      if (node.t === 'Num') return node.v;
      this.fail(`${label}() 의 이 인자는 이름이나 문자열이어야 합니다`, node);
    };
    const obj = this.ctx.obj;
    switch (menu) {
      case 'variables': {
        const n = raw();
        const ref = this.lookup(String(n));
        if (!ref || ref.kind === 'list') this.fail(`변수 '${n}' 를 찾을 수 없습니다`, node);
        return ref.id;
      }
      case 'lists': {
        const n = raw();
        const ref = this.lookup(String(n));
        if (!ref || ref.kind !== 'list') this.fail(`리스트 '${n}' 를 찾을 수 없습니다`, node);
        return ref.id;
      }
      case 'messages': return this.declareMessage(String(raw()));
      case 'scenes': {
        const n = String(raw());
        const sc = this.sceneByName.get(n);
        if (!sc) this.fail(`장면 '${n}' 이(가) 없습니다 (있는 장면: ${[...this.sceneByName.keys()].join(', ') || '없음'})`, node);
        return sc.id;
      }
      case 'sounds': case 'pictures': {
        if (!obj) this.fail('이 블록은 오브젝트 안에서만 쓸 수 있습니다', node);
        const map = menu === 'sounds' ? obj.soundNames : obj.pictureNames;
        const list = menu === 'sounds' ? obj.sounds : obj.pictures;
        const n = raw();
        if (typeof n === 'number') {
          const it = list[n - 1];
          if (!it) this.fail(`${n}번째 ${menu === 'sounds' ? '소리' : '모양'}이 없습니다`, node);
          return it.id;
        }
        if (!map.has(n)) this.fail(`${menu === 'sounds' ? '소리' : '모양'} '${n}' 이(가) 없습니다 (있는 것: ${[...map.keys()].join(', ') || '없음'})`, node);
        return map.get(n);
      }
      case 'sprites': case 'spritesWithMouse': case 'spritesWithSelf': case 'allSprites':
      case 'collision': case 'clone': case 'textBoxWithSelf': case 'objectSequence': {
        const n = String(raw());
        const withSelf = menu === 'spritesWithSelf' || menu === 'clone' || menu === 'textBoxWithSelf';
        const withMouse = menu === 'spritesWithMouse' || menu === 'collision';
        if (n === 'self' && withSelf) return 'self';
        if (n === 'mouse' && withMouse) return 'mouse';
        if (menu === 'collision' && /^wall(_up|_down|_left|_right)?$/.test(n)) return n;
        const o = this.objectByName.get(n);
        if (!o) this.fail(`오브젝트 '${n}' 이(가) 없습니다`, node);
        return o.id;
      }
      default: return raw();
    }
  }

  // ── 메서드 호출 (점 표기) ─────────────────────────────────
  methodCall(e, mode) {
    const { obj, name } = e.func;
    // 모듈: math.sqrt / random.randint / time.sleep
    if (obj.t === 'Name' && !this.lookup(obj.id)) {
      const mod = obj.id;
      if (mod === 'math' || mod === 'random') return this.callByName(name === 'random' ? 'rand01' : name, e, mode, null);
      if (mod === 'time') {
        if (name === 'sleep') return this.callByName('wait', e, mode, null);
        this.fail(`time.${name} 은(는) 지원하지 않습니다 (time.sleep 만 가능)`, e);
      }
      if (mod === 'self') return this.callByName(name, e, mode, null);
      if (mod === 'timer') {
        const map = { start: 'timer_start', stop: 'timer_stop', reset: 'timer_reset', show: 'show_timer', hide: 'hide_timer' };
        if (map[name]) return this.callByName(map[name], e, mode, null);
        this.fail(`timer.${name}() 을(를) 알 수 없습니다 (start, stop, reset, show, hide)`, e);
      }
      if (mod === 'answer') {
        if (name === 'show' || name === 'hide') return this.callByName(`${name}_answer`, e, mode, null);
      }
    }
    // 변수 / 리스트 메서드
    if (obj.t === 'Name') {
      const ref = this.lookup(obj.id);
      if (ref && ref.kind === 'list') return this.listMethod(ref, name, e, mode);
      if (ref && ref.scope !== 'param' && (name === 'show' || name === 'hide')) {
        return { stmts: [this.mk(`${name}_variable`, { 0: ref.id })] };
      }
    }
    // 오브젝트 이름.메서드 → 지원 안 함
    if (obj.t === 'Name' && this.objectByName.has(obj.id)) {
      this.fail(`다른 오브젝트('${obj.id}')의 동작은 직접 호출할 수 없습니다. send("신호") 로 알리세요`, e);
    }
    // 문자열 메서드: s.upper() → upper(s)
    const STR_METHODS = { upper: 'upper', lower: 'lower', replace: 'replace', find: 'find', count: 'count', reverse: 'reverse' };
    if (STR_METHODS[name]) return this.callByName(STR_METHODS[name], e, mode, obj);
    this.fail(`메서드 '.${name}()' 을(를) 알 수 없습니다`, e);
  }

  listMethod(ref, name, e, mode) {
    this.noKw(e, name);
    switch (name) {
      case 'append': this.argc(e, 'append', 1); return { stmts: [this.mk('add_value_to_list', { 0: this.valueBlock(e.args[0]), 1: ref.id })] };
      case 'insert': this.argc(e, 'insert', 2); return { stmts: [this.mk('insert_value_to_list', { 0: this.valueBlock(e.args[1]), 1: ref.id, 2: this.valueBlock(e.args[0]) })] };
      case 'pop': case 'remove_at': {
        this.argc(e, name, 0, 1);
        const idx = e.args[0] ? this.valueBlock(e.args[0]) : this.mk('length_of_list', { 1: ref.id });
        return { stmts: [this.mk('remove_value_from_list', { 0: idx, 1: ref.id })] };
      }
      case 'clear': this.argc(e, 'clear', 0); return { stmts: this.clearList(ref) };
      case 'show': return { stmts: [this.mk('show_list', { 0: ref.id })] };
      case 'hide': return { stmts: [this.mk('hide_list', { 0: ref.id })] };
      case 'contains': this.argc(e, 'contains', 1); return { b: this.mk('is_included_in_list', { 1: ref.id, 3: this.valueBlock(e.args[0]) }), t: 'bool' };
    }
    this.fail(`리스트 메서드 '.${name}()' 을(를) 알 수 없습니다 (append, insert, pop, clear, show, hide)`, e);
  }

  // ── 특수 내장 함수 ───────────────────────────────────────
  special(name, e, mode, receiver) {
    const a = receiver ? [receiver, ...e.args] : e.args;
    const need = (min, max = min) => { if (a.length < min || a.length > max) this.fail(`${name}() 인자 개수가 맞지 않습니다 (${min === max ? min : `${min}~${max}`}개 필요, ${a.length}개 받음)`, e); };
    const val = i => this.valueBlock(a[i]);
    switch (name) {
      case 'print': case 'say_text':
        need(1); this.noKw(e, name);
        return { stmts: [this.mk('dialog', { 0: val(0), 1: 'speak' })] };
      case 'input':
        if (mode === 'value') this.fail('input() 은 `x = input("질문")` 처럼 대입문에서 쓰세요', e);
        need(0, 1);
        return { stmts: [this.mk('ask_and_wait', { 0: a[0] ? val(0) : txt('') })] };
      case 'len': {
        need(1);
        if (a[0].t === 'Name') {
          const ref = this.lookup(a[0].id);
          if (ref && ref.kind === 'list') return { b: this.mk('length_of_list', { 1: ref.id }), t: 'num' };
        }
        return { b: this.mk('length_of_string', { 1: val(0) }), t: 'num' };
      }
      case 'str': need(1); return { b: this.mk('combine_something', { 1: val(0), 3: txt('') }), t: 'str' };
      case 'float': need(1); return this.expr(a[0]);
      case 'bool': need(1); return { b: this.toBool(a[0]), t: 'bool' };
      case 'abs': case 'round': case 'int': case 'floor': case 'ceil': case 'sqrt': case 'sin': case 'cos': case 'tan':
      case 'asin': case 'acos': case 'atan': case 'log': case 'log10': case 'ln': case 'factorial': case 'frac': case 'root': case 'square':
        need(1); this.noKw(e, name);
        return { b: this.mk('calc_operation', { 1: val(0), 3: MATH_OPS[name] }), t: 'num' };
      case 'pow': {
        need(2);
        return this.binBlock('**', this.expr(a[0]), this.expr(a[1]), e);
      }
      case 'max': case 'min': {
        need(2);
        const A = val(0), B = val(1);
        const sum = this.mk('calc_basic', { 0: A, 1: 'PLUS', 2: B });
        const diff = this.mk('calc_operation', { 1: this.mk('calc_basic', { 0: structuredClone(A), 1: 'MINUS', 2: structuredClone(B) }), 3: 'abs' });
        const inner = this.mk('calc_basic', { 0: sum, 1: name === 'max' ? 'PLUS' : 'MINUS', 2: diff });
        return { b: this.mk('calc_basic', { 0: inner, 1: 'DIVIDE', 2: num(2) }), t: 'num' };
      }
      case 'rand01': this.fail('random.random() 대신 random(0, 1) 을 쓰세요', e); break;
      case 'randint': case 'random': case 'uniform': need(2); return { b: this.mk('calc_rand', { 1: val(0), 3: val(1) }), t: 'num' };
      case 'stop': {
        need(0, 1);
        let target = 'all';
        if (a[0]) {
          const raw = this.dropdownRaw(a[0], 'stop');
          if (!(raw in STOP_TARGETS)) this.fail(`stop() 에서 '${raw}' 는 쓸 수 없습니다. 사용 가능: all, self, this, others, other_objects`, a[0]);
          target = STOP_TARGETS[raw];
        }
        return { stmts: [this.mk('stop_object', { 0: target })] };
      }
      case 'stop_all': return { stmts: [this.mk('stop_object', { 0: 'all' })] };
      case 'block': case 'raw_block': return this.rawBlock(e, mode);
      case 'sum': this.fail('sum() 은 지원하지 않습니다. 반복문으로 더하세요', e); break;
      case 'range': this.fail('range() 는 for 문에서만 쓸 수 있습니다', e); break;
    }
    return null;
  }

  // block("type", 인자...) — 어떤 엔트리 블록이든 이름으로 직접 쓰는 탈출구
  rawBlock(e, mode) {
    if (!e.args.length || e.args[0].t !== 'Str') this.fail('block("블록type", 인자...) 형태로 쓰세요', e);
    const type = e.args[0].v;
    const rest = e.args.slice(1);
    if (REGISTRY[type]) {
      const r = this.fromSpec([type], rest, e, type);
      return r;
    }
    // 레지스트리에 없는 블록(확장 블록 등): 인자를 순서대로 그대로 넣는다
    const params = rest.map(a => {
      if (a.t === 'Str') return a.v;
      return this.valueBlock(a);
    });
    const b = { type, params };
    return mode === 'stmt' ? { stmts: [b] } : { b, t: 'any' };
  }

  // ═══ 모델 조립 ════════════════════════════════════════════
  buildModel() {
    const variables = [];
    const pushVar = info => variables.push(info);
    for (const v of this.globals.values()) pushVar(v);
    for (const o of this.objects) for (const v of o.locals.values()) pushVar(v);

    const functions = [...this.funcs.values()].map(f => this.functionRecord(f));
    return {
      meta: this.meta,
      scenes: this.scenes,
      messages: [...this.messages].map(([name, id]) => ({ id, name })),
      variables,
      functions,
      objects: this.objects.map(o => ({
        id: o.id, name: o.name, kind: o.kind, scene: (o.scene || this.scenes[0]).id,
        props: this.objectProps(o), pictures: o.pictures, sounds: o.sounds, script: o.script,
      })),
      warnings: this.warnings,
    };
  }

  // 오브젝트 헤더 옵션 → 속성 (shape/sound/scene 은 별도 처리)
  objectProps(o) {
    const SPRITE = ['x', 'y', 'size', 'direction', 'rotation', 'visible', 'rotate', 'lock', 'shape', 'sound', 'scene'];
    const TEXT = ['x', 'y', 'text', 'font_size', 'color', 'bg', 'align', 'width', 'height', 'bold', 'line_break', 'visible', 'direction', 'rotation', 'lock', 'sound', 'scene'];
    const allowed = o.kind === 'textbox' ? TEXT : SPRITE;
    const props = {};
    for (const kw of o.node.kwargs) {
      if (!allowed.includes(kw.name)) this.fail(`${o.kind} 에 알 수 없는 옵션: ${kw.name} (사용 가능: ${allowed.join(', ')})`, kw);
      if (['shape', 'sound', 'scene'].includes(kw.name)) continue;
      props[kw.name] = this.constAny(kw.value);
    }
    if (o.kind === 'textbox' && o.node.args[0]) props.text = String(this.constAny(o.node.args[0]));
    return props;
  }

  functionRecord(f) {
    // 매개변수 선언 사슬 (엔트리 함수 편집기가 만드는 구조)
    const fid = f.id;
    let chain = null;
    for (let i = f.params.length - 1; i >= 0; i--) {
      const p = f.params[i];
      const isBool = p.type === 'boolean';
      chain = {
        id: `${fid}_fs_${p.id}`, x: 0, y: 0,
        type: isBool ? 'function_field_boolean' : 'function_field_string',
        params: [{ id: `${fid}_p_${p.id}`, x: 0, y: 0, type: `${isBool ? 'booleanParam' : 'stringParam'}_${p.id}`, params: [] }, chain],
      };
    }
    const label = { id: `${fid}_lbl`, x: 0, y: 0, type: 'function_field_label', params: [f.name, chain] };
    const isValue = f.returnsValue;
    const def = {
      id: `${fid}_def`, x: 50, y: 30,
      type: isValue ? 'function_create_value' : 'function_create',
      params: isValue ? [label, null, null, f.compiledReturn] : [label, null],
      statements: [f.compiledBody],
    };
    const localVariables = [...f.locals.values()].map(v => ({ name: v.name, value: '', id: v.id }));
    return {
      id: fid, type: isValue ? 'value' : 'normal',
      localVariables, useLocalVariables: localVariables.length > 0,
      content: [[def]],
    };
  }
}
