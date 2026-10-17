# Real Entry Python (REPY)

Real Entry Python(REPY)은 엔트리(Entry)의 470여 개 모든 블록 코딩 기능을 표준 파이썬 문법 체계와 확장 문법으로 작성할 수 있도록 만든 차세대 엔트리 파이썬 컴파일러 및 웹 변환기입니다.

기존 엔트리 내장 파이썬의 협소한 구현 범위를 극복하고, 파이썬 코드를 실제 엔트리 작품 파일(`.ent`)로 즉시 변환하여 실행할 수 있습니다.

- **온라인 웹 변환기 바로가기**: [https://imsohappisy.github.io/REPY/](https://imsohappisy.github.io/REPY/)

---

## 주요 기능

1. **엔트리 블록 100% 매핑 엔진**: 474개 엔트리 블록(움직임, 생김새, 소리, 판단, 계산, 흐름, 함수, 변수/리스트, 붓 등) 완벽 지원.
2. **독자적인 파이썬 렉서 & 파서**: 순수 자바스크립트로 구현되어 외부 런타임 없이 브라우저 및 Node.js 환경에서 모두 독립 실행.
3. **오브젝트 및 다중 모양(Costumes) 지원**:
   - 엔트리봇 정면/걷기/날기 등 공식 규격 벡터 SVG 내장.
   - 고양이, 강아지, 나무, 코인 등 캐릭터 프리셋 지원.
   - Base64 DataURL(PNG/JPG) 및 외부 이미지 자동 번들링.
4. **.ent 바이너리 빌더**: Ustar TAR 규격 및 Deflate/Gzip 압축을 통해 playentry.org에서 바로 열리는 작품 파일 생성.

---

## REPY 문법 안내

### 1. 프로젝트 및 오브젝트 정의
```python
project(name="엔트리봇 모험")

# 엔트리봇 기본 모양 지정
object "주인공"(shape="entrybot", x=0, y=0):
    when run:
        say("안녕하세요, REPY!")

# 글상자(TextBox)
textbox "점수판"(text="점수: 0", font_size=20, x=0, y=120)
```

### 2. 다중 모양(Shapes) 등록 및 교체
```python
object "캐릭터"(x=0, y=0):
    shapes = [
        shape("대기", "entrybot"),
        shape("걷기1", "entrybot_walk1"),
        shape("걷기2", "entrybot_walk2")
    ]

    when run:
        while True:
            next_shape()   # 다음 모양으로 바꾸기
            wait(0.2)
```

### 3. 이벤트 핸들러 (`when`)
```python
when run:
    # 시작하기 버튼을 클릭했을 때

when key("space"):
    # 스페이스 키를 눌렀을 때
    move_y(30)

when click:
    # 오브젝트를 클릭했을 때

when clone:
    # 복제본이 처음 생성되었을 때
```

### 4. 변수, 리스트, 함수
```python
# 전역 변수 및 리스트
score = 0
inventory = list(["검", "방패"])

# 사용자 정의 함수
def add_score(amount):
    global score
    score += amount

object "아이템":
    when click:
        add_score(10)
        delete_clone()
```

---

## 구현된 블록 설명서

REPY는 엔트리의 474개 모든 블록을 파이썬 함수로 지원하며 한글 별칭도 사용할 수 있습니다.
자세한 전수 설명서는 **[docs/blocks.md](docs/blocks.md)** 문서를 참조하세요.

### 주요 카테고리별 대표 블록 요약

| 분류 | 영문 함수명 | 한글 별칭 | 설명 |
|---|---|---|---|
| **시작** | `when run:`, `when key("space"):` | `when 시작:`, `when 키("space"):` | 시작 클릭, 키 입력, 마우스 클릭 이벤트 |
| **움직임** | `move(10)`, `goto(x, y)`, `glide(1, x, y)` | `움직이기(10)`, `이동하기(x, y)` | 이동, 좌표 지정, 부드럽게 이동 |
| **움직임** | `rotate(15)`, `turn(90)`, `bounce()` | `회전하기(15)`, `방향돌리기(90)` | 회전, 방향 회전, 화면 끝에 튕기기 |
| **생김새** | `show()`, `hide()`, `say("안녕")` | `보이기()`, `숨기기()`, `말하기("안녕")` | 표시, 숨기기, 말풍선 대사 |
| **생김새** | `next_shape()`, `set_shape("걷기")` | `다음모양()`, `모양바꾸기("걷기")` | 다중 모양 순환 및 특정 모양 변경 |
| **소리** | `play_sound("이름")`, `stop_sounds()` | `소리재생("이름")` | 소리 재생, 모두 멈추기, 볼륨 조절 |
| **판단** | `touch("벽")`, `pressed("space")` | `닿았는가("벽")`, `눌렀는가("space")` | 충돌 감지, 키 입력 상태 확인 |
| **계산** | `random(1, 10)`, `sqrt(n)`, `abs(n)` | `무작위수(1, 10)` | 난수, 제곱근, 삼각함수, 문자열 처리 |
| **흐름** | `wait(0.5)`, `create_clone("self")` | `기다리기(0.5)`, `복제본만들기()` | 대기, 복제본 생성, 복제본 삭제 |
| **신호/장면** | `send("신호")`, `start_scene("2")` | `신호보내기("신호")`, `장면시작("2")` | 신호 송수신, 장면 전환 |
| **붓** | `start_drawing()`, `set_pen_color(c)` | `도장찍기()`, `stamp()` | 그리기, 굵기/색상 지정, 도장 찍기 |
| **글상자** | `write("텍스트")`, `append("이어쓰기")` | - | 글상자 텍스트 쓰기, 스타일 지정 |
| **전체 블록** | `block("block_name", ...)` | - | 엔트리 474개 모든 블록 타입 직접 호출 |

---

## 실행 및 사용법

### 1. 의존성 설치
```bash
npm install
```

### 2. 웹 변환기 실행
```bash
npm start
# 브라우저에서 http://localhost:3000 접속
```
REPY 코드를 작성한 뒤 `[ .ENT 변환 및 다운로드 ]` 버튼을 누르면 즉시 `.ent` 파일이 생성되어 다운로드됩니다.

### 3. CLI 빌드
```bash
# REPY 소스코드를 .ent 파일로 컴파일
node tools/cli.mjs build input.repy output.ent

# 컴파일된 project.json 확인
node tools/cli.mjs dump input.repy
```

### 4. 테스트 실행
```bash
npm test
```

---

## 프로젝트 구조

```
realentrypython/
├── src/                  # 컴파일러 핵심 모듈
│   ├── index.js          # 통합 엔트리포인트 (compileToEnt)
│   ├── lexer.js          # 파이썬 인덴트 기반 렉서
│   ├── parser.js         # REPY 파서 (AST 생성)
│   ├── compiler.js       # AST -> 엔트리 모델 변환기
│   ├── blocks-table.js   # 474개 블록 매핑 테이블
│   ├── registry.js       # 엔트리 블록 명세 레지스트리
│   ├── shapes.js         # 벡터 SVG 및 엔트리봇 프리셋
│   ├── pack.js           # .ent (tar.gz) 패커
│   └── tar.js            # 순수 JS ustar tar 아카이버
├── web/                  # 웹 변환기 프론트엔드
│   ├── index.html
│   ├── style.css
│   └── app.js
├── tools/                # CLI 및 유틸리티 도구
│   ├── cli.mjs
│   ├── serve.mjs
│   └── build-registry.mjs
├── tests/                # 단위 테스트
└── package.json
```

---

## 참고 및 크레딧 (References & Credits)

본 프로젝트는 다음 오픈소스 프로젝트 및 기술 자료들을 참고하여 개발되었습니다:

- **[entry-vibe-coding](https://github.com/205sla/entry-vibe-coding)**: 엔트리 블록 명세 분석, `.ent` 프로젝트 모델 규격 및 바이너리 패킹 설계 참고
- **[entryjs](https://github.com/entrylabs/entryjs)**: 엔트리 공식 오픈소스 엔진 (엔트리 블록 및 모델 규격)
- **[fflate](https://github.com/101arrowz/fflate)**: 고속 순수 자바스크립트 Deflate/Gzip 압축 라이브러리

---

## 라이선스
MIT License
