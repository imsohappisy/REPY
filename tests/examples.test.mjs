import test from 'node:test';
import assert from 'node:assert';
import { EXAMPLES } from '../src/examples.js';
import { compileToEnt } from '../src/index.js';

test('모든 내장 예제 컴파일 검증', () => {
  for (const [key, item] of Object.entries(EXAMPLES)) {
    const res = compileToEnt(item.code);
    assert.ok(res.buffer.length > 0, `${key} 버퍼 생성 실패`);
    assert.ok(res.project.objects.length > 0, `${key} 오브젝트 없음`);
    assert.ok(res.entSize > 0, `${key} entSize 비정상`);
  }
});
