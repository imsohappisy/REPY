// REPY 에서 쓰는 이름 → 엔트리 블록 연결표.
//
// 형식:  이름: [블록type, 고정값{슬롯번호: 값}?, 옵션?]
//   - 고정값: 사용자에게 보이지 않고 컴파일러가 채워 넣는 드롭다운 값 (예: say → dialog 의 'speak')
//   - 옵션.enum   : {슬롯번호: {별칭: 실제값}}  드롭다운 값 별칭(한글 포함)
//   - 옵션.color  : [슬롯번호...]  문자열 상수가 색이면 color 블록으로 감싼다
//   - 옵션.defaults: {슬롯번호: 값}  인자를 생략했을 때 기본값
// 사용자가 쓰는 인자는 "고정되지 않은 입력 슬롯"을 왼쪽부터 차례로 채운다.
// 여기에 없는 블록도 `block("type", ...)` 이나 type 이름 그대로 호출해 쓸 수 있다.

export const EFFECTS = {
  color: 'color', 색깔: 'color', 색: 'color',
  brightness: 'brightness', 밝기: 'brightness',
  transparency: 'transparency', 투명도: 'transparency',
};

export const STOP_TARGETS = {
  all: 'all', 모두: 'all', 전체: 'all',
  self: 'thisOnly', 자신: 'thisOnly',
  this: 'thisThread', 이코드: 'thisThread',
  others: 'otherThread', 다른코드: 'otherThread',
  other_objects: 'other_objects', 다른오브젝트: 'other_objects',
};

export const DATE_PARTS = {
  year: 'YEAR', month: 'MONTH', day: 'DAY', hour: 'HOUR', minute: 'MINUTE', second: 'SECOND',
  weekday: 'DAY_OF_WEEK', 년: 'YEAR', 월: 'MONTH', 일: 'DAY', 시: 'HOUR', 분: 'MINUTE', 초: 'SECOND', 요일: 'DAY_OF_WEEK',
};

export const TEXT_EFFECTS = {
  strike: 'strike', underline: 'underLine', italic: 'fontItalic', bold: 'fontBold',
  취소선: 'strike', 밑줄: 'underLine', 기울임: 'fontItalic', 굵게: 'fontBold',
};
export const ON_OFF = { on: 'on', off: 'off', True: 'on', False: 'off', 켜기: 'on', 끄기: 'off' };

// 수학 함수 → calc_operation 의 드롭다운 값
export const MATH_OPS = {
  sqrt: 'root', root: 'root', square: 'square',
  sin: 'sin', cos: 'cos', tan: 'tan',
  asin: 'asin_radian', acos: 'acos_radian', atan: 'atan_radian',
  log: 'log', log10: 'log', ln: 'ln',
  floor: 'floor', ceil: 'ceil', round: 'round', int: 'floor',
  factorial: 'factorial', abs: 'abs', frac: 'unnatural',
};

export const EVENTS = {
  // 이름: [블록 type, 인자 종류]
  run: ['when_run_button_click'],
  start: ['when_run_button_click', null, { sceneStart: true }], // 시작 버튼 + 장면 시작
  scene_start: ['when_scene_start'],
  click: ['when_object_click'],
  click_end: ['when_object_click_canceled'],
  mouse_down: ['mouse_clicked'],
  mouse_up: ['mouse_click_cancled'],
  clone: ['when_clone_start'],
  key: ['when_some_key_pressed', 'key'],
  message: ['when_message_cast', 'message'],
  // 한글 별칭
  시작: ['when_run_button_click', null, { sceneStart: true }],
  장면시작: ['when_scene_start'],
  클릭: ['when_object_click'],
  클릭해제: ['when_object_click_canceled'],
  마우스누름: ['mouse_clicked'],
  마우스뗌: ['mouse_click_cancled'],
  복제본: ['when_clone_start'],
  키: ['when_some_key_pressed', 'key'],
  신호: ['when_message_cast', 'message'],
};
EVENTS.receive = EVENTS.message;
EVENTS.key_pressed = EVENTS.key;
EVENTS.flag = EVENTS.start;

export const STATEMENTS = {
  // ── 움직임 ──
  move: ['move_direction'], move_x: ['move_x'], move_y: ['move_y'],
  move_xy_for: ['move_xy_time'],
  goto: ['locate_xy'], set_x: ['locate_x'], set_y: ['locate_y'],
  glide: ['locate_xy_time'],
  goto_object: ['locate'], glide_to_object: ['locate_object_time'],
  rotate: ['rotate_relative'], rotate_to: ['rotate_absolute'],
  turn: ['direction_relative'], turn_to: ['direction_absolute'],
  rotate_for: ['rotate_by_time'], turn_for: ['direction_relative_duration'],
  look_at: ['see_angle_object'], move_toward: ['move_to_angle'], bounce: ['bounce_wall'],
  // ── 생김새 ──
  show: ['show'], hide: ['hide'],
  say: ['dialog', { 1: 'speak' }], think: ['dialog', { 1: 'think' }], yell: ['dialog', { 1: 'yell' }],
  say_for: ['dialog_time', { 2: 'speak' }], think_for: ['dialog_time', { 2: 'think' }], yell_for: ['dialog_time', { 2: 'yell' }],
  remove_dialog: ['remove_dialog'],
  set_shape: ['change_to_some_shape'], set_picture: ['change_to_some_shape'], 모양_바꾸기: ['change_to_some_shape'], 모양바꾸기: ['change_to_some_shape'],
  next_shape: ['change_to_next_shape', { 0: 'next' }], next_picture: ['change_to_next_shape', { 0: 'next' }],
  prev_shape: ['change_to_next_shape', { 0: 'prev' }], prev_picture: ['change_to_next_shape', { 0: 'prev' }],
  다음_모양: ['change_to_next_shape', { 0: 'next' }], 다음모양: ['change_to_next_shape', { 0: 'next' }],
  이전_모양: ['change_to_next_shape', { 0: 'prev' }], 이전모양: ['change_to_next_shape', { 0: 'prev' }],
  change_to_next_shape: ['change_to_next_shape', null, { defaults: { 0: 'next' } }],
  add_effect: ['add_effect_amount', null, { enum: { 0: EFFECTS } }],
  set_effect: ['change_effect_amount', null, { enum: { 0: EFFECTS } }],
  clear_effects: ['erase_all_effects'],
  change_size: ['change_scale_size'], set_size: ['set_scale_size'],
  stretch: ['stretch_scale_size', null, { enum: { 0: { width: 'WIDTH', height: 'HEIGHT', 가로: 'WIDTH', 세로: 'HEIGHT' } } }],
  reset_size: ['reset_scale_size'], flip_x: ['flip_x'], flip_y: ['flip_y'],
  bring_to_front: ['change_object_index', { 0: 'FRONT' }], bring_forward: ['change_object_index', { 0: 'FORWARD' }],
  send_backward: ['change_object_index', { 0: 'BACKWARD' }], send_to_back: ['change_object_index', { 0: 'BACK' }],
  // ── 소리 ──
  play_sound: ['sound_something'], play_sound_for: ['sound_something_second'],
  play_sound_wait: ['sound_something_wait'], play_sound_for_wait: ['sound_something_second_wait'],
  play_sound_range: ['sound_from_to'], play_sound_range_wait: ['sound_from_to_and_wait'],
  set_volume: ['sound_volume_set'], change_volume: ['sound_volume_change'],
  set_sound_speed: ['sound_speed_set'], change_sound_speed: ['sound_speed_change'],
  stop_sounds: ['sound_silent_all', { 0: 'all' }],
  // ── 흐름 ──
  wait: ['wait_second'], wait_until: ['wait_until_true'], restart: ['restart_project'],
  create_clone: ['create_clone', null, { defaults: { 0: 'self' } }],
  delete_clone: ['delete_clone'], remove_all_clones: ['remove_all_clones'],
  send: ['message_cast'], send_wait: ['message_cast_wait'],
  start_scene: ['start_scene'],
  next_scene: ['start_neighbor_scene', { 0: 'next' }], prev_scene: ['start_neighbor_scene', { 0: 'prev' }],
  // ── 변수/입력 ──
  ask: ['ask_and_wait'],
  show_variable: ['show_variable'], hide_variable: ['hide_variable'],
  show_list: ['show_list'], hide_list: ['hide_list'],
  show_answer: ['set_visible_answer', { 0: 'SHOW' }], hide_answer: ['set_visible_answer', { 0: 'HIDE' }],
  // ── 초시계 ──
  timer_start: ['choose_project_timer_action', { 1: 'START' }],
  timer_stop: ['choose_project_timer_action', { 1: 'STOP' }],
  timer_reset: ['choose_project_timer_action', { 1: 'RESET' }],
  show_timer: ['set_visible_project_timer', { 1: 'SHOW' }],
  hide_timer: ['set_visible_project_timer', { 1: 'HIDE' }],
  // ── 붓 ──
  start_drawing: ['start_drawing'], stop_drawing: ['stop_drawing'], stamp: ['brush_stamp'],
  start_fill: ['start_fill'], stop_fill: ['stop_fill'], clear_drawing: ['brush_erase_all'],
  set_pen_color: ['set_color', null, { color: [0] }], set_fill_color: ['set_fill_color', null, { color: [0] }],
  random_pen_color: ['set_random_color'],
  set_pen_size: ['set_thickness'], change_pen_size: ['change_thickness'],
  set_pen_opacity: ['set_brush_tranparency'], change_pen_opacity: ['change_brush_transparency'],
  // ── 글상자 ──
  write: ['text_write'], append: ['text_append'], prepend: ['text_prepend'], clear_text: ['text_flush'],
  set_text_color: ['text_change_font_color', null, { color: [0] }],
  set_text_bg: ['text_change_bg_color', null, { color: [0] }],
  set_font: ['text_change_font'],
  text_effect: ['text_change_effect', null, { enum: { 0: TEXT_EFFECTS, 1: ON_OFF } }],
};

export const VALUES = {
  random: ['calc_rand'], randint: ['calc_rand'],
  distance: ['distance_something'],
  touch: ['reach_something'],
  pressed: ['is_press_some_key'],
  mouse_down: ['is_clicked'], object_clicked: ['is_object_clicked'],
  is_number: ['is_type', { 2: 'number' }], is_english: ['is_type', { 2: 'en' }], is_korean: ['is_type', { 2: 'ko' }],
  username: ['get_user_name'], nickname: ['get_nickname'],
  reverse: ['reverse_of_string'],
  upper: ['change_string_case', { 3: 'toUpperCase' }], lower: ['change_string_case', { 3: 'toLowerCase' }],
  replace: ['replace_string'], find: ['index_of_string'], count: ['count_match_string'],
  char_at: ['char_at'], substring: ['substring'],
  rgb: ['change_rgb_to_hex'],
  volume: ['get_sound_volume'], sound_speed: ['get_sound_speed'], sound_length: ['get_sound_duration'],
  timer_value: ['get_project_timer_value'],
};

// 한글 별칭 (자주 쓰는 블록만)
const KO = {
  움직이기: 'move', 이동하기: 'goto', 기다리기: 'wait', 말하기: 'say', 생각하기: 'think',
  보이기: 'show', 숨기기: 'hide', 신호보내기: 'send', 복제본만들기: 'create_clone', 복제본삭제: 'delete_clone',
  묻기: 'ask', 회전하기: 'rotate', 방향돌리기: 'turn', 소리재생: 'play_sound', 모양바꾸기: 'set_shape',
  다음모양: 'next_shape', 크기정하기: 'set_size', 도장찍기: 'stamp', 장면시작: 'start_scene',
};
for (const [ko, en] of Object.entries(KO)) STATEMENTS[ko] = STATEMENTS[en];
const KO_V = { 무작위수: 'random', 거리: 'distance', 닿았는가: 'touch', 눌렀는가: 'pressed' };
for (const [ko, en] of Object.entries(KO_V)) VALUES[ko] = VALUES[en];

// 키 이름 → 키 코드
const KEY_NAMES = {
  arrowleft: 37, left: 37, 왼쪽: 37, arrowup: 38, up: 38, 위: 38, arrowright: 39, right: 39, 오른쪽: 39,
  arrowdown: 40, down: 40, 아래: 40, space: 32, 스페이스: 32, enter: 13, 엔터: 13, escape: 27, esc: 27,
  tab: 9, backspace: 8, shift: 16, control: 17, ctrl: 17, alt: 18,
};
export function keyCode(key) {
  const s = String(key).trim();
  if (s === '') return null;
  if (/^\d+$/.test(s) && s.length > 2) return s;               // 이미 코드
  if (KEY_NAMES[s.toLowerCase()] !== undefined) return String(KEY_NAMES[s.toLowerCase()]);
  if (/^[a-z]$/i.test(s)) return String(s.toUpperCase().charCodeAt(0));
  if (/^[0-9]$/.test(s)) return String(48 + Number(s));
  const f = /^f([1-9]|1[0-2])$/i.exec(s);
  if (f) return String(111 + Number(f[1]));
  return null;
}

// 색 이름 → hex
export const COLOR_NAMES = {
  red: '#ff0000', green: '#00a800', blue: '#0000ff', yellow: '#ffff00', orange: '#ffa500', purple: '#800080',
  pink: '#ffc0cb', black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080', brown: '#8b4513',
  cyan: '#00ffff', magenta: '#ff00ff', lime: '#00ff00', navy: '#000080', skyblue: '#87ceeb', gold: '#ffd700',
  빨강: '#ff0000', 초록: '#00a800', 파랑: '#0000ff', 노랑: '#ffff00', 주황: '#ffa500', 보라: '#800080',
  분홍: '#ffc0cb', 검정: '#000000', 하양: '#ffffff', 회색: '#808080', 갈색: '#8b4513', 하늘: '#87ceeb',
};
export function parseColor(s) {
  const v = String(s).trim();
  if (/^#[0-9a-f]{6}$/i.test(v)) return v.toLowerCase();
  if (/^#[0-9a-f]{3}$/i.test(v)) return ('#' + [...v.slice(1)].map(c => c + c).join('')).toLowerCase();
  const n = COLOR_NAMES[v.toLowerCase()] || COLOR_NAMES[v];
  return n || null;
}
