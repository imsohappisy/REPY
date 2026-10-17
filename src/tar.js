// ustar portable tar 포맷 인코더 (Uint8Array 기반, 브라우저/Node 양쪽 지원)

function writeString(buf, offset, length, str) {
  const enc = new TextEncoder().encode(str);
  buf.set(enc.subarray(0, length), offset);
}

function writeOctal(buf, offset, length, val) {
  const s = Math.floor(val).toString(8).padStart(length - 1, '0') + ' ';
  for (let i = 0; i < s.length; i++) {
    buf[offset + i] = s.charCodeAt(i);
  }
}

export function createTarHeader(name, size, typeflag = '0', mtime = Math.floor(Date.now() / 1000)) {
  const h = new Uint8Array(512);
  const isDir = typeflag === '5';

  // name (100)
  writeString(h, 0, 100, name);
  // mode (8)
  writeString(h, 100, 8, isDir ? '000755 \0' : '000644 \0');
  // uid (8) & gid (8)
  writeString(h, 108, 8, '000000 \0');
  writeString(h, 116, 8, '000000 \0');
  // size (12)
  writeOctal(h, 124, 12, isDir ? 0 : size);
  // mtime (12)
  if (!isDir && mtime) {
    writeOctal(h, 136, 12, mtime);
  } else {
    writeString(h, 136, 12, '00000000000 \0');
  }
  // checksum placeholder (8 spaces)
  for (let i = 148; i < 156; i++) h[i] = 32;
  // typeflag (1)
  h[156] = typeflag.charCodeAt(0);
  // magic (6) "ustar\0"
  writeString(h, 257, 6, 'ustar\0');
  // version (2) "00"
  writeString(h, 263, 2, '00');

  // calculate checksum
  let sum = 0;
  for (let i = 0; i < 512; i++) sum += h[i];
  const sumStr = sum.toString(8).padStart(6, '0') + '\0 ';
  for (let i = 0; i < sumStr.length; i++) {
    h[148 + i] = sumStr.charCodeAt(i);
  }

  return h;
}

export function buildTar(files) {
  const chunks = [];
  let totalLength = 0;

  for (const f of files) {
    const data = f.data instanceof Uint8Array ? f.data : new Uint8Array(f.data || 0);
    const isDir = f.typeflag === '5';
    const header = createTarHeader(f.name, data.length, f.typeflag || '0', f.mtime);
    chunks.push(header);
    totalLength += 512;

    if (!isDir && data.length > 0) {
      chunks.push(data);
      totalLength += data.length;
      const pad = (512 - (data.length % 512)) % 512;
      if (pad > 0) {
        chunks.push(new Uint8Array(pad));
        totalLength += pad;
      }
    }
  }

  // End of archive marker: 1024 zero bytes
  chunks.push(new Uint8Array(1024));
  totalLength += 1024;

  const out = new Uint8Array(totalLength);
  let offset = 0;
  for (const c of chunks) {
    out.set(c, offset);
    offset += c.length;
  }
  return out;
}
