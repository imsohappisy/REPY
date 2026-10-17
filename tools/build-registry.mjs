// block-registry.source.json (entryjs 에서 추출한 블록 정의) → src/registry.js (슬림 버전)
// 사용: npm run build:registry
//
// 슬롯 코드:
//   B 블록 입력   D 고정 드롭다운   Y 동적 드롭다운(메뉴 이름 별도)   K 키보드
//   X 텍스트 입력  C 색상           A 각도                          I 인디케이터
//   T 라벨 텍스트  L 줄바꿈         O 출력(함수 필드)               N 기타/null
// 종류(k):  s 문장 블록 · e 이벤트(시작) · v 값 블록 · b 불리언 블록 · c 정의 블록 · n 사용 불가
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const here = path.dirname(url.fileURLToPath(import.meta.url));
const src = JSON.parse(fs.readFileSync(path.join(here, 'block-registry.source.json'), 'utf8')).blocks;

const CODE = {
  Block: 'B', Dropdown: 'D', DropdownDynamic: 'Y', Keyboard: 'K', TextInput: 'X', Color: 'C',
  Angle: 'A', angle: 'A', Indicator: 'I', Text: 'T', TextDynamic: 'T', LineBreak: 'L', Output: 'O',
  Image: 'N',
};
const KIND = {
  basic: 's', basic_loop: 's', basic_double_loop: 's', basic_without_next: 's', pebble_basic: 's',
  pebble_loop: 's', basic_event: 'e', pebble_event: 'e', basic_string_field: 'v',
  basic_boolean_field: 'b', basic_create: 'c', basic_create_value: 'c', basic_define: 'c',
  basic_param: 'n', basic_button: 'n', clickable_text: 'n', basic_text: 'n', basic_text_light: 'n',
};

const out = {};
for (const [type, v] of Object.entries(src)) {
  const params = (v.params || []).map(p => (p ? (CODE[p.type] || 'N') : 'N')).join('');
  const menus = (v.params || []).map(p => (p && p.menu) || '');
  const rec = { p: params, s: v.statementCount || 0, k: KIND[v.skeleton] || 'n' };
  if (menus.some(Boolean)) rec.m = menus.map(m => m || 0);
  out[type] = rec;
}

const body = JSON.stringify(out);
const text = `// 자동 생성 파일 — 직접 고치지 마세요. (tools/build-registry.mjs)
// 출처: entryjs 블록 정의 (MIT, https://github.com/205sla/entry-vibe-coding 의 block-registry 기반)
// p=슬롯 코드, s=문장(내부 블록열) 개수, k=종류, m=동적 드롭다운 메뉴 이름
export const REGISTRY = ${body};
`;
fs.writeFileSync(path.join(here, '..', 'src', 'registry.js'), text);
console.log(`registry: ${Object.keys(out).length} blocks, ${text.length} bytes`);
