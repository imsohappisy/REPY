import test from 'node:test';
import assert from 'node:assert/strict';
import { compileToEnt } from '../src/index.js';
import { unzlibSync } from 'fflate';

test('오브젝트 엔트리봇 프리셋 및 다중 모양(shapes) 컴파일 검증', () => {
  const code = `
project(name="모양 테스트")

object "엔트리봇":
    shapes = [
        shape("대기", "entrybot"),
        shape("걷기", "entrybot_walk1")
    ]
    when run:
        while True:
            change_to_next_shape()
            wait(0.2)
`;

  const res = compileToEnt(code);
  assert.ok(res.buffer.length > 0, '.ent 파일이 생성되어야 합니다');
  assert.equal(res.project.objects.length, 1);
  const obj = res.project.objects[0];
  assert.equal(obj.name, '엔트리봇');
  assert.equal(obj.sprite.pictures.length, 2);
  assert.equal(obj.sprite.pictures[0].name, '대기');
  assert.equal(obj.sprite.pictures[1].name, '걷기');
  assert.equal(obj.sprite.pictures[0].imageType, 'png');
  assert.equal(obj.sprite.pictures[1].imageType, 'png');
});

test('오브젝트 Base64 PNG 이미지 지정 및 단일 shape 지정 검증', () => {
  // 1x1 투명 PNG Base64
  const tinyPng = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";

  const code = `
project(name="이미지 테스트")

object "커스텀이미지"(shape=image("${tinyPng}", width=64, height=64), x=10, y=20):
    when run:
        say("이미지 로드 완료")
`;

  const res = compileToEnt(code);
  assert.ok(res.buffer.length > 0);
  const obj = res.project.objects[0];
  assert.equal(obj.name, '커스텀이미지');
  assert.equal(obj.sprite.pictures.length, 1);
  assert.equal(obj.sprite.pictures[0].imageType, 'png');
  assert.equal(obj.sprite.pictures[0].dimension.width, 64);
  assert.equal(obj.sprite.pictures[0].dimension.height, 64);
});
