// 순수 JS 기반 경량 PNG 인코더 및 SVG 래스터라이저
import { deflateSync } from 'fflate';

function makeCrcTable() {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c;
  }
  return table;
}

const CRC_TABLE = makeCrcTable();

function crc32(buf, offset = 0, length = buf.length) {
  let crc = 0xffffffff;
  for (let i = offset; i < offset + length; i++) {
    crc = (crc >>> 8) ^ CRC_TABLE[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function writeChunk(type, data) {
  const chunk = new Uint8Array(12 + data.length);
  const view = new DataView(chunk.buffer);
  view.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) chunk[4 + i] = type.charCodeAt(i);
  chunk.set(data, 8);
  view.setUint32(8 + data.length, crc32(chunk, 4, 4 + data.length));
  return chunk;
}

export function encodeRgbaToPng(w, h, rgba) {
  w = Math.max(1, Math.floor(w));
  h = Math.max(1, Math.floor(h));
  const stride = w * 4;
  const raw = new Uint8Array(h * (stride + 1));

  for (let y = 0; y < h; y++) {
    raw[y * (stride + 1)] = 0; // Filter 0 (None)
    const srcStart = y * stride;
    const srcEnd = srcStart + stride;
    raw.set(rgba.subarray(srcStart, srcEnd), y * (stride + 1) + 1);
  }

  const def = deflateSync(raw);
  const ihdr = new Uint8Array(13);
  const iv = new DataView(ihdr.buffer);
  iv.setUint32(0, w);
  iv.setUint32(4, h);
  ihdr[8] = 8;  // bit depth
  ihdr[9] = 6;  // RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const sig = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
  const c1 = writeChunk('IHDR', ihdr);
  const c2 = writeChunk('IDAT', def);
  const c3 = writeChunk('IEND', new Uint8Array(0));

  const total = sig.length + c1.length + c2.length + c3.length;
  const out = new Uint8Array(total);
  let pos = 0;
  out.set(sig, pos); pos += sig.length;
  out.set(c1, pos); pos += c1.length;
  out.set(c2, pos); pos += c2.length;
  out.set(c3, pos); pos += c3.length;
  return out;
}

// 브라우저 캔버스를 이용한 SVG → PNG 변환기
export async function rasterizeSvg(svgString, width = 100, height = 100) {
  width = Math.max(1, Math.floor(width || 100));
  height = Math.max(1, Math.floor(height || 100));

  if (typeof document !== 'undefined' && typeof Image !== 'undefined') {
    return new Promise((resolve) => {
      try {
        const img = new Image();
        const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            URL.revokeObjectURL(url);
            canvas.toBlob((b) => {
              if (b) {
                b.arrayBuffer().then(ab => resolve(new Uint8Array(ab)));
              } else {
                resolve(createDefaultSpritePng(width, height));
              }
            }, 'image/png');
          } catch (e) {
            URL.revokeObjectURL(url);
            resolve(createDefaultSpritePng(width, height));
          }
        };
        img.onerror = () => {
          URL.revokeObjectURL(url);
          resolve(createDefaultSpritePng(width, height));
        };
        img.src = url;
      } catch (e) {
        resolve(createDefaultSpritePng(width, height));
      }
    });
  }

  // Node.js 등 DOM 없는 환경 폴백: 유효한 엔트리봇 블루 사각형 PNG 반환
  return createDefaultSpritePng(width, height);
}

export function createDefaultSpritePng(w = 100, h = 100) {
  w = Math.max(1, Math.floor(w));
  h = Math.max(1, Math.floor(h));
  const rgba = new Uint8Array(w * h * 4);
  // 엔트리봇 고유 블루(#00b4d8) 기본 스프라이트 픽셀 채우기
  for (let i = 0; i < w * h; i++) {
    const idx = i * 4;
    rgba[idx] = 0;
    rgba[idx + 1] = 180;
    rgba[idx + 2] = 216;
    rgba[idx + 3] = 255;
  }
  return encodeRgbaToPng(w, h, rgba);
}
