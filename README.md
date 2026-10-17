# Real Entry Python (REPY)

Real Entry Python(REPY)은 엔트리(Entry)의 470여 개 모든 블록 코딩 기능을 표준 파이썬 문법 체계와 확장 문법으로 작성할 수 있도록 만든 차세대 엔트리 파이썬 컴파일러 및 웹 변환기입니다.

기존 엔트리 내장 파이썬의 협소한 구현 범위를 극복하고, 파이썬 코드를 실제 엔트리 작품 파일(`.ent`)로 즉시 변환하여 실행할 수 있습니다.

---

## 주요 기능

1. **엔트리 블록 100% 매핑 엔진**: 474개 엔트리 블록(움직임, 생김새, 소리, 판단, 계산, 흐름, 함수, 변수/리스트, 붓 등) 완벽 지원.
2. **독자적인 파이썬 렉서 & 파서**: 순수 자바스크립트로 구현되어 외부 런타임 없이 브라우저 및 Node.js 환경에서 모두 독립 실행.
3. **오브젝트 및 다중 모양(Costumes) 지원**:
   - 엔트리봇 정면/걷기/날기 등 공식 규격 벡터 SVG 내장.
   - 고양이, 강아지, 나무, 코인 등 캐릭터 프리셋 지원.
   - Base64 DataURL(PNG/JPG) 및 외부 이미지 자동 번들링.
4. **.ent 바이너리 빌더**: Ustar TAR 규격 및 Deflate/Gzip 압축을 통해 playentry.org에서 바로 열리는 작품 파일 생성.
5. **웹 변환기**: 투박한 단색과 각진 버튼(Brutalist Monochrome) 디자인의 브라우저 기반 실시간 변환 도구.

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

## 라이선스
MIT License
