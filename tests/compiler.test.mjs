import test from 'node:test';
import assert from 'node:assert';
import { gunzipSync } from 'fflate';
import { compileToEnt, parse, compileModule } from '../src/index.js';

test('기본 파싱 및 컴파일', () => {
  const code = `
project(name="테스트 게임", speed=60)

score = 0
items = list(["사과", "바나나"])

object "플레이어"(shape=circle(20, 'blue'), x=0, y=0):
    when run:
        score = 10
        say("게임 시작!")
        while score > 0:
            move(10)
            wait(0.5)
            score -= 1

    when key("space"):
        turn(90)
        items.append("포도")
`;

  const res = compileToEnt(code);
  assert.ok(res.buffer instanceof Uint8Array);
  assert.ok(res.buffer.length > 0);
  assert.strictEqual(res.project.name, "테스트 게임");
  assert.strictEqual(res.project.objects.length, 1);
  assert.strictEqual(res.project.objects[0].name, "플레이어");

  // .ent 바이너리 압축 해제 검증
  const decompressed = gunzipSync(res.buffer);
  assert.ok(decompressed.length > 512);

  // tar 안의 temp/project.json 내용 검증
  const str = new TextDecoder().decode(decompressed);
  assert.ok(str.includes('temp/project.json'));
});

test('글상자(textbox) 및 장면(scene) 컴파일', () => {
  const code = `
scene "시작화면":
    textbox "제목"(text="REPY 어드벤처", font_size=24, color='#ffffff', bg='#1e293b', x=0, y=80):
        when run:
            say("환영합니다!")

    object "시작버튼"(shape=rect(120, 40, 'green'), x=0, y=-50):
        when click:
            start_scene("메인게임")

scene "메인게임":
    object "주인공"(shape=star(30, 'yellow')):
        when scene_start:
            goto(0, 0)
`;

  const res = compileToEnt(code);
  assert.strictEqual(res.project.scenes.length, 2);
  assert.strictEqual(res.project.scenes[0].name, "시작화면");
  assert.strictEqual(res.project.scenes[1].name, "메인게임");
  assert.strictEqual(res.project.objects.length, 3);
  assert.strictEqual(res.project.objects[0].objectType, "textBox");
  assert.strictEqual(res.project.objects[1].objectType, "sprite");
});

test('사용자 정의 함수(def) 및 for 루프 컴파일', () => {
  const code = `
total = 0

def add_bonus(amount):
    global total
    total += amount

object "봇":
    when run:
        for i in range(5):
            add_bonus(10)
        say(f"총 점수: {total}")
`;

  const res = compileToEnt(code);
  assert.strictEqual(res.project.functions.length, 1);
  assert.strictEqual(res.project.functions[0].type, "normal");
  assert.ok(res.project.objects[0].script.length > 0);
});
