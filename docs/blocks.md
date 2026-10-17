# REPY 블록 함수 및 문법 상세 설명서

REPY(Real Entry Python)는 엔트리의 474개 모든 블록을 파이썬 함수 및 문법으로 1:1 매핑하여 제공합니다.
영문 함수명뿐만 아니라 직관적인 한글 별칭도 동시에 지원합니다.

---

## 목차
1. [이벤트 핸들러 (시작)](#1-이벤트-핸들러-시작)
2. [움직임 (Motion)](#2-움직임-motion)
3. [생김새 (Looks)](#3-생김새-looks)
4. [소리 (Sound)](#4-소리-sound)
5. [판단 & 조건 (Sensing & Conditions)](#5-판단--조건-sensing--conditions)
6. [계산 & 수학 (Math & Operations)](#6-계산--수학-math--operations)
7. [흐름 제어 (Control & Flow)](#7-흐름-제어-control--flow)
8. [변수, 리스트, 입출력 (Variables & Lists)](#8-변수-리스트-입출력-variables--lists)
9. [붓 / 그리기 (Brush & Pen)](#9-붓--그리기-brush--pen)
10. [글상자 (TextBox)](#10-글상자-textbox)
11. [엔트리 모든 블록 직접 호출 (Direct Block Call)](#11-엔트리-모든-블록-직접-호출-direct-block-call)

---

## 1. 이벤트 핸들러 (시작)

`when <이벤트>:` 형태로 오브젝트 본문 내에 작성합니다.

| REPY 구문 | 한글 별칭 | 엔트리 블록 | 설명 |
|---|---|---|---|
| `when run:` | `when 시작:` | `when_run_button_click` | 시작하기 버튼을 클릭했을 때 |
| `when scene_start:` | `when 장면시작:` | `when_scene_start` | 해당 장면이 시작되었을 때 |
| `when key("space"):` | `when 키("space"):` | `when_some_key_pressed` | 특정 키를 눌렀을 때 (`left`, `right`, `a`, `1` 등) |
| `when click:` | `when 클릭:` | `when_object_click` | 오브젝트를 마우스로 클릭했을 때 |
| `when click_end:` | `when 클릭해제:` | `when_object_click_canceled` | 오브젝트 클릭을 해제했을 때 |
| `when mouse_down:` | `when 마우스누름:` | `mouse_clicked` | 마우스를 클릭했을 때 |
| `when mouse_up:` | `when 마우스뗌:` | `mouse_click_cancled` | 마우스 클릭을 해제했을 때 |
| `when clone:` | `when 복제본:` | `when_clone_start` | 복제본이 처음 생성되었을 때 |
| `when message("신호"):` | `when 신호("신호"):` | `when_message_cast` | 지정한 신호를 받았을 때 |

---

## 2. 움직임 (Motion)

오브젝트의 위치, 각도, 방향 및 회전을 제어합니다.

| 함수명 | 한글 별칭 | 엔트리 블록 | 설명 및 인자 |
|---|---|---|---|
| `move(steps)` | `움직이기(steps)` | `move_direction` | 이동 방향으로 steps만큼 이동 |
| `move_x(val)` | - | `move_x` | x좌표를 val만큼 바꾸기 |
| `move_y(val)` | - | `move_y` | y좌표를 val만큼 바꾸기 |
| `goto(x, y)` | `이동하기(x, y)` | `locate_xy` | x, y 좌표 위치로 즉시 이동 |
| `set_x(x)` | - | `locate_x` | x좌표를 x 위치로 정하기 |
| `set_y(y)` | - | `locate_y` | y좌표를 y 위치로 정하기 |
| `glide(sec, x, y)` | - | `locate_xy_time` | sec초 동안 x, y 좌표로 부드럽게 이동 |
| `goto_object("이름")` | - | `locate` | 마우스포인터 또는 다른 오브젝트 위치로 이동 |
| `glide_to_object(sec, "이름")` | - | `locate_object_time` | sec초 동안 특정 오브젝트 위치로 이동 |
| `rotate(deg)` | `회전하기(deg)` | `rotate_relative` | 현재 각도에서 deg만큼 회전하기 |
| `rotate_to(deg)` | - | `rotate_absolute` | 각도를 deg로 정하기 |
| `turn(deg)` | `방향돌리기(deg)` | `direction_relative` | 이동 방향을 deg만큼 회전하기 |
| `turn_to(deg)` | - | `direction_absolute` | 이동 방향을 deg로 정하기 |
| `rotate_for(sec, deg)` | - | `rotate_by_time` | sec초 동안 deg만큼 회전하기 |
| `turn_for(sec, deg)` | - | `direction_relative_duration` | sec초 동안 이동 방향을 deg만큼 회전하기 |
| `look_at("이름")` | - | `see_angle_object` | 특정 오브젝트 또는 마우스포인터 쪽 바라보기 |
| `move_toward(deg, steps)` | - | `move_to_angle` | 특정 각도 방향으로 steps만큼 이동하기 |
| `bounce()` | - | `bounce_wall` | 화면 끝에 닿으면 튕기기 |

---

## 3. 생김새 (Looks)

오브젝트의 표시, 크기, 대사, 효과 및 모양(Picture)을 제어합니다.

| 함수명 | 한글 별칭 | 엔트리 블록 | 설명 및 인자 |
|---|---|---|---|
| `show()` | `보이기()` | `show` | 오브젝트 보이기 |
| `hide()` | `숨기기()` | `hide` | 오브젝트 숨기기 |
| `say(text)` | `말하기(text)` | `dialog(speak)` | 말풍선으로 대사 말하기 |
| `say_for(sec, text)` | - | `dialog_time(speak)` | sec초 동안 대사 말하기 |
| `think(text)` | `생각하기(text)` | `dialog(think)` | 생각 풍선 띄우기 |
| `think_for(sec, text)` | - | `dialog_time(think)` | sec초 동안 생각 풍선 띄우기 |
| `remove_dialog()` | - | `remove_dialog` | 말풍선 지우기 |
| `set_shape("모양명")` | `모양바꾸기("모양명")` | `change_to_some_shape` | 지정한 모양으로 바꾸기 |
| `next_shape()` | `다음모양()` | `change_to_next_shape(next)` | 다음 모양으로 바꾸기 |
| `prev_shape()` | `이전모양()` | `change_to_next_shape(prev)` | 이전 모양으로 바꾸기 |
| `set_size(percent)` | `크기정하기(percent)` | `set_scale_size` | 크기를 percent%로 정하기 |
| `change_size(percent)` | - | `change_scale_size` | 크기를 percent%만큼 바꾸기 |
| `reset_size()` | - | `reset_scale_size` | 원래 크기로 되돌리기 |
| `flip_x()` | - | `flip_x` | 좌우 모양 뒤집기 |
| `flip_y()` | - | `flip_y` | 상하 모양 뒤집기 |
| `set_effect(kind, val)` | - | `change_effect_amount` | 효과를 val로 정하기 (`color`, `brightness`, `transparency`) |
| `add_effect(kind, val)` | - | `add_effect_amount` | 효과를 val만큼 더하기 |
| `clear_effects()` | - | `erase_all_effects` | 모든 그래픽 효과 지우기 |
| `bring_to_front()` | - | `change_object_index(FRONT)` | 맨 앞으로 순서 가져오기 |
| `send_to_back()` | - | `change_object_index(BACK)` | 맨 뒤로 순서 보내기 |

---

## 4. 소리 (Sound)

| 함수명 | 한글 별칭 | 엔트리 블록 | 설명 및 인자 |
|---|---|---|---|
| `play_sound("이름")` | `소리재생("이름")` | `sound_something` | 지정 소리 재생하기 |
| `play_sound_wait("이름")` | - | `sound_something_wait` | 소리를 재생하고 끝날 때까지 기다리기 |
| `play_sound_for(sec, "이름")` | - | `sound_something_second` | 지정 소리를 sec초 동안 재생하기 |
| `play_sound_for_wait(...)` | - | `sound_something_second_wait` | sec초 동안 재생하고 기다리기 |
| `stop_sounds()` | - | `sound_silent_all` | 모든 소리 멈추기 |
| `set_volume(vol)` | - | `sound_volume_set` | 소리 크기를 vol%로 정하기 |
| `change_volume(vol)` | - | `sound_volume_change` | 소리 크기를 vol%만큼 바꾸기 |
| `set_sound_speed(spd)` | - | `sound_speed_set` | 소리 속도를 spd%로 정하기 |
| `change_sound_speed(spd)` | - | `sound_speed_change` | 소리 속도를 spd%만큼 바꾸기 |

---

## 5. 판단 & 조건 (Sensing & Conditions)

조건식 및 if 문 내에서 사용하는 판단 함수들입니다.

| 함수명 | 한글 별칭 | 반환값 | 설명 |
|---|---|---|---|
| `touch("오브젝트명")` | `닿았는가("이름")` | Boolean | 마우스포인터, 벽, 다른 오브젝트에 닿았는지 여부 |
| `pressed("key")` | `눌렀는가("key")` | Boolean | 특정 키보드 키가 눌려있는지 여부 (`space`, `left` 등) |
| `mouse_down()` | - | Boolean | 마우스 버튼이 클릭되어 있는지 여부 |
| `object_clicked()` | - | Boolean | 현재 오브젝트가 클릭되었는지 여부 |
| `is_number(val)` | - | Boolean | 값이 숫자인지 확인 |
| `is_korean(val)` | - | Boolean | 값이 한글인지 확인 |
| `is_english(val)` | - | Boolean | 값이 영문인지 확인 |

---

## 6. 계산 & 수학 (Math & Operations)

| 함수 / 연산자 | 엔트리 블록 | 설명 |
|---|---|---|
| `+`, `-`, `*`, `/` | `calc_plus`, `calc_minus`, `calc_times`, `calc_divide` | 기본 사칙연산 |
| `%`, `//` | `quotient_and_mod` | 나머지 및 몫 |
| `random(min, max)` / `randint(min, max)` | `calc_rand` | min과 max 사이의 무작위수 |
| `distance("오브젝트명")` | `distance_something` | 대상 오브젝트와의 거리 |
| `sqrt(n)`, `abs(n)`, `round(n)` | `calc_operation` | 제곱근, 절댓값, 반올림 |
| `sin(n)`, `cos(n)`, `tan(n)` | `calc_operation` | 삼각함수 |
| `floor(n)`, `ceil(n)` | `calc_operation` | 버림, 올림 |
| `reverse(str)` | `reverse_of_string` | 문자열 뒤집기 |
| `len(str)` | `length_of_string` | 문자열 길이 구하기 |
| `char_at(index, str)` | `char_at` | 문자열의 index번째 글자 |
| `substring(start, end, str)` | `substring` | 부분 문자열 추출 |
| `replace(old, new, str)` | `replace_string` | 문자열 바꾸기 |
| `timer_value()` | `get_project_timer_value` | 프로젝트 초시계 값 |

---

## 7. 흐름 제어 (Control & Flow)

| REPY 문법 | 엔트리 블록 | 설명 |
|---|---|---|
| `wait(sec)` | `wait_second` | sec초 동안 기다리기 |
| `wait_until(조건)` | `wait_until_true` | 조건이 참이 될 때까지 기다리기 |
| `restart()` | `restart_project` | 처음부터 다시 실행하기 |
| `while 조건:` | `repeat_while_true` | 조건이 참인 동안 반복하기 |
| `while True:` | `repeat_inf` | 무한 반복하기 |
| `for _ in range(n):` | `repeat_basic` | n번 반복하기 |
| `break` / `continue` | `stop_repeat`, `continue_repeat` | 반복 중단 및 다음 반복 진행 |
| `if 조건:` / `elif:` / `else:` | `_if`, `if_else` | 조건 분기문 |
| `create_clone("self")` | `create_clone` | 오브젝트 복제본 만들기 |
| `delete_clone()` | `delete_clone` | 복제본 삭제하기 |
| `remove_all_clones()` | `remove_all_clones` | 모든 복제본 삭제 |
| `send("신호명")` | `message_cast` | 신호 보내기 |
| `send_wait("신호명")` | `message_cast_wait` | 신호 보내고 끝날 때까지 기다리기 |
| `start_scene("장면명")` | `start_scene` | 다른 장면으로 전환 |
| `next_scene()` | `start_neighbor_scene(next)` | 다음 장면 시작하기 |

---

## 8. 변수, 리스트, 입출력 (Variables & Lists)

```python
# 1. 일반 변수
score = 0
name = "플레이어"

# 2. 리스트 변수
items = list(["검", "방패"])
items.append("물약")          # 리스트에 추가
items.pop()                  # 마지막 항목 삭제
items.remove(1)              # 1번째 항목 삭제
items[1] = "강철검"           # 1번째 항목 값 변경

# 3. 사용자 묻고 기다리기
ask("이름이 무엇인가요?")
# 답변은 canvas_input_value 블록과 연동

# 4. 변수 보이기/숨기기
show_variable("score")
hide_variable("score")
show_list("items")
hide_list("items")
```

---

## 9. 붓 / 그리기 (Brush & Pen)

| 함수명 | 엔트리 블록 | 설명 |
|---|---|---|
| `start_drawing()` | `start_drawing` | 그리기 시작하기 |
| `stop_drawing()` | `stop_drawing` | 그리기 멈추기 |
| `clear_drawing()` | `brush_erase_all` | 모든 그림 지우기 |
| `stamp()` | `brush_stamp` | 현재 모양을 도장 찍기 |
| `set_pen_color("#ff0000")` | `set_color` | 붓 색상 변경 (Hex 또는 색상명) |
| `random_pen_color()` | `set_random_color` | 붓 색상을 무작위로 변경 |
| `set_pen_size(px)` | `set_thickness` | 붓 굵기 설정 |
| `change_pen_size(px)` | `change_thickness` | 붓 굵기 변경 |
| `set_pen_opacity(val)` | `set_brush_tranparency` | 붓 투명도 설정 |

---

## 10. 글상자 (TextBox)

글상자 오브젝트(`textbox`)를 조작하는 전용 함수입니다.

```python
textbox "안내판"(text="환영합니다", font_size=24, x=0, y=100):
    when run:
        write("새로운 안내 내용")     # 텍스트 다시 쓰기
        append(" [추가 텍스트]")      # 뒤에 이어 쓰기
        prepend("[공지] ")           # 앞에 덧붙이기
        set_text_color("#ffffff")   # 글자 색 변경
        set_text_bg("#000000")      # 배경 색 변경
        text_effect("bold", "on")   # 굵게 효과 적용
        clear_text()                # 글자 모두 지우기
```

---

## 11. 엔트리 모든 블록 직접 호출 (Direct Block Call)

REPY 테이블에 정의되지 않은 엔트리 고유 블록 또는 인공지능/확장 블록(474개 전수)은 블록 타입명으로 직접 호출할 수 있습니다.

```python
# 엔트리 블록 타입명을 그대로 함수로 호출
change_opacity(50)
set_visible_project_timer("SHOW")

# 또는 block() 빌트인을 사용
block("change_opacity", 50)
```
엔트리의 모든 내부 블록 스펙은 `tools/block-registry.source.json` 및 `src/registry.js`에 내장되어 있어 크래시 없이 안전하게 컴파일됩니다.
