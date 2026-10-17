#!/usr/bin/env node
// GitHub Pages 배포용 정적 사이트 빌더
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const WEB = path.join(ROOT, 'web');
const SRC = path.join(ROOT, 'src');

console.log('[BUILD] GitHub Pages 배포 빌드를 시작합니다...');

// 1. dist 디렉터리 준비
if (fs.existsSync(DIST)) {
  fs.rmSync(DIST, { recursive: true, force: true });
}
fs.mkdirSync(DIST, { recursive: true });

// 2. web/ 복사
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

copyDir(WEB, DIST);

// 3. src/ 복사
copyDir(SRC, path.join(DIST, 'src'));

// 4. index.html importmap 경로 수정
const indexPath = path.join(DIST, 'index.html');
let indexHtml = fs.readFileSync(indexPath, 'utf-8');
indexHtml = indexHtml.replace('"repy/": "../src/"', '"repy/": "./src/"');
fs.writeFileSync(indexPath, indexHtml, 'utf-8');

// 5. GitHub Pages jekyll 비활성화 (.nojekyll)
fs.writeFileSync(path.join(DIST, '.nojekyll'), '', 'utf-8');

console.log(`[BUILD] 빌드 완료: ${DIST}`);
