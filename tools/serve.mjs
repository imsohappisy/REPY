#!/usr/bin/env node
// REPY 로컬 웹 서버
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import url from 'node:url';

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const PORT = process.env.PORT || 3000;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.mjs': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ent': 'application/octet-stream',
};

const server = http.createServer((req, res) => {
  const parsed = url.parse(req.url);
  let pathname = decodeURIComponent(parsed.pathname);
  if (pathname === '/' || pathname === '/index.html') {
    pathname = '/index.html';
  }

  const cleanPath = pathname.replace(/^\//, '');
  const candidate1 = path.join(ROOT, 'web', cleanPath);
  const candidate2 = path.join(ROOT, cleanPath);

  let targetPath = null;
  if (fs.existsSync(candidate1) && fs.statSync(candidate1).isFile()) {
    targetPath = candidate1;
  } else if (fs.existsSync(candidate2) && fs.statSync(candidate2).isFile()) {
    targetPath = candidate2;
  }

  if (!targetPath || !targetPath.startsWith(ROOT)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Not Found: ' + pathname);
    return;
  }

  const ext = path.extname(targetPath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(targetPath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`[REPY Web Server] http://localhost:${PORT}`);
  console.log(`브라우저에서 접속하여 REPY 코드를 .ent 로 변환하세요.`);
});
