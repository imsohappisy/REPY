#!/usr/bin/env node
// REPY 명령줄 도구
import fs from 'node:fs';
import path from 'node:path';
import { compileToEnt } from '../src/index.js';

const [cmd, ...args] = process.argv.slice(2);

function printHelp() {
  console.log(`
REPY (Real Entry Python) CLI
엔트리의 모든 블록을 파이썬으로 작성하고 .ent 작품 파일로 변환합니다.

사용법:
  node tools/cli.mjs build <input.repy> [output.ent]   REPY 코드를 .ent 로 컴파일
  node tools/cli.mjs dump <input.repy>                컴파일된 project.json 확인

옵션:
  -h, --help                                          도움말 출력
`);
}

if (!cmd || cmd === '-h' || cmd === '--help') {
  printHelp();
  process.exit(0);
}

if (cmd === 'build') {
  const inPath = args[0];
  if (!inPath) {
    console.error('오류: 입력 파일 경로를 지정하세요.');
    process.exit(1);
  }
  const outPath = args[1] || inPath.replace(/\.[^.]+$/, '') + '.ent';
  try {
    const code = fs.readFileSync(inPath, 'utf8');
    const res = compileToEnt(code);
    fs.writeFileSync(outPath, res.buffer);
    console.log(`[REPY] ${inPath} -> ${outPath} (${(res.entSize / 1024).toFixed(1)} KB) 컴파일 완료!`);
    if (res.warnings.length) {
      console.warn(`경고 ${res.warnings.length}건:`);
      for (const w of res.warnings) console.warn(`  - [줄 ${w.line}] ${w.message}`);
    }
  } catch (err) {
    console.error(`[컴파일 실패] ${err.line ? `(줄 ${err.line}, 칸 ${err.col}) ` : ''}${err.message}`);
    process.exit(1);
  }
  process.exit(0);
}

if (cmd === 'dump') {
  const inPath = args[0];
  const code = fs.readFileSync(inPath, 'utf8');
  const res = compileToEnt(code);
  console.log(JSON.stringify(res.project, null, 2));
  process.exit(0);
}

console.error(`알 수 없는 명령어: ${cmd}`);
printHelp();
process.exit(1);
