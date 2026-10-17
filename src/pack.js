// REPY .ent 패커 — compileModule 모델을 .ent (tar.gz) 바이너리로 조립
import { gzipSync } from 'fflate';
import { buildTar } from './tar.js';
import { createShapeSvg, defaultPlaceholderSvg } from './shapes.js';

// 32글자 base36 해시 생성기 (엔트리 공식 규격과 호환)
export function entryHash() {
  const chars = '0123456789abcdefghijklmnopqrstuvwxyz';
  let str = '';
  for (let i = 0; i < 32; i++) {
    str += chars[Math.floor(Math.random() * chars.length)];
  }
  return str;
}

export function decodeBase64(b64) {
  if (typeof Buffer !== 'undefined') {
    return new Uint8Array(Buffer.from(b64, 'base64'));
  }
  const bin = atob(b64);
  const len = bin.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = bin.charCodeAt(i);
  }
  return bytes;
}

export function packEnt(model, externalAssets = new Map()) {
  const tarFiles = [];
  const dirs = new Set();

  function addDir(dirPath) {
    if (!dirPath.endsWith('/')) dirPath += '/';
    if (dirs.has(dirPath)) return;
    dirs.add(dirPath);
    tarFiles.push({ name: dirPath, data: new Uint8Array(0), typeflag: '5' });
  }

  addDir('temp/');

  // 1. 오브젝트 및 에셋 준비
  const objects = [];
  const encoder = new TextEncoder();

  for (const obj of model.objects) {
    const isTextBox = obj.kind === 'textbox';
    const props = obj.props || {};
    const pictures = [];
    const sounds = [];

    // 스프라이트 에셋
    if (!isTextBox) {
      const picList = obj.pictures.length > 0 ? obj.pictures : [{ kind: 'default', name: '기본' }];

      for (const p of picList) {
        let imgBytes, imageType = 'svg', dim;
        const hash = entryHash();
        const d1 = hash.slice(0, 2), d2 = hash.slice(2, 4);

        if (p.kind === 'shape') {
          const res = createShapeSvg(p.shape, p.args, p.kwargs);
          imgBytes = encoder.encode(res.svg);
          dim = { width: res.width, height: res.height };
          imageType = 'svg';
        } else if (p.kind === 'image' || p.kind === 'file') {
          const src = p.src || p.file || '';
          if (src.startsWith('data:image/')) {
            const m = src.match(/^data:image\/([a-zA-Z0-9\+\-]+);base64,(.*)$/);
            if (m) {
              const mime = m[1].toLowerCase();
              imageType = mime.includes('svg') ? 'svg' : 'png';
              imgBytes = decodeBase64(m[2]);
              dim = { width: p.width || 100, height: p.height || 100 };
            } else if (src.startsWith('data:image/svg+xml')) {
              const svgText = decodeURIComponent(src.split(',')[1] || '');
              imageType = 'svg';
              imgBytes = encoder.encode(svgText);
              dim = { width: p.width || 100, height: p.height || 100 };
            }
          } else if (src.trim().startsWith('<svg') || src.trim().startsWith('<?xml')) {
            imageType = 'svg';
            imgBytes = encoder.encode(src);
            dim = { width: p.width || 100, height: p.height || 100 };
          } else if (externalAssets.has(src)) {
            const raw = externalAssets.get(src);
            if (typeof raw === 'string') {
              imageType = raw.trim().startsWith('<svg') ? 'svg' : 'png';
              imgBytes = encoder.encode(raw);
            } else {
              imageType = src.endsWith('.svg') ? 'svg' : 'png';
              imgBytes = new Uint8Array(raw);
            }
            dim = { width: p.width || 100, height: p.height || 100 };
          } else {
            // 내장 프리셋 여부 확인 및 SVG 생성
            const res = createShapeSvg(src, p.args, p.kwargs);
            imgBytes = encoder.encode(res.svg);
            dim = { width: res.width, height: res.height };
            imageType = 'svg';
          }
        } else {
          const res = defaultPlaceholderSvg();
          imgBytes = encoder.encode(res.svg);
          dim = { width: res.width, height: res.height };
          imageType = 'svg';
        }

        const ext = imageType === 'png' ? 'png' : 'svg';

        addDir(`temp/${d1}/`);
        addDir(`temp/${d1}/${d2}/`);
        addDir(`temp/${d1}/${d2}/image/`);
        addDir(`temp/${d1}/${d2}/thumb/`);

        const imgPath = `temp/${d1}/${d2}/image/${hash}.${ext}`;
        const thumbPath = `temp/${d1}/${d2}/thumb/${hash}.${ext}`;

        tarFiles.push({ name: imgPath, data: imgBytes, typeflag: '0' });
        tarFiles.push({ name: thumbPath, data: imgBytes, typeflag: '0' });

        pictures.push({
          id: p.id || entryHash().slice(0, 4),
          name: p.name || 'shape',
          dimension: dim,
          filename: hash,
          fileurl: imgPath,
          imageType: ext,
        });
      }
    }

    // 엔티티 구성
    let entity;
    const firstPic = pictures[0];
    const pw = firstPic ? firstPic.dimension.width : 100;
    const ph = firstPic ? firstPic.dimension.height : 100;

    if (isTextBox) {
      const textVal = props.text ?? obj.name ?? '';
      const fontSize = Number(props.font_size ?? 20);
      const w = Number(props.width ?? Math.max(160, textVal.length * fontSize * 0.9));
      const h = Number(props.height ?? fontSize * 2.2);
      const isBold = props.bold ? 'bold ' : '';
      const fontStr = `${isBold}${fontSize}px NanumGothic`;

      entity = {
        x: Number(props.x ?? 0),
        y: Number(props.y ?? 0),
        regX: 0,
        regY: 0,
        scaleX: 1,
        scaleY: 1,
        rotation: Number(props.rotation ?? 0),
        direction: Number(props.direction ?? 90),
        width: w,
        height: h,
        font: fontStr,
        fontSize: fontSize,
        textAlign: props.align === 'left' ? 1 : props.align === 'right' ? 2 : 0, // 0=가운데, 1=왼쪽, 2=오른쪽
        lineBreak: props.line_break ?? true,
        colour: props.color || '#000000',
        bgColor: props.bg || 'transparent',
        underLine: false,
        strike: false,
        text: textVal,
        visible: props.visible ?? true,
      };
    } else {
      const scale = props.size !== undefined ? Number(props.size) / 100 : (120 / pw);
      entity = {
        x: Number(props.x ?? 0),
        y: Number(props.y ?? 0),
        regX: pw / 2,
        regY: ph / 2,
        scaleX: scale,
        scaleY: scale,
        rotation: Number(props.rotation ?? 0),
        direction: Number(props.direction ?? 90),
        width: pw,
        height: ph,
        font: 'undefinedpx ',
        visible: props.visible ?? true,
      };
    }

    objects.push({
      id: obj.id,
      name: obj.name,
      script: JSON.stringify(obj.script), // 이중 직렬화 필수
      selectedPictureId: pictures[0] ? pictures[0].id : undefined,
      objectType: isTextBox ? 'textBox' : 'sprite',
      rotateMethod: props.rotate || 'free',
      scene: obj.scene,
      sprite: { pictures, sounds },
      entity,
      text: isTextBox ? entity.text : undefined,
      lock: !!props.lock,
    });
  }

  // 2. 변수 배열 구성
  const variables = model.variables.map(v => {
    const vt = v.kind === 'list' ? 'list' : v.kind === 'slide' ? 'slide' : 'variable';
    const rec = {
      id: v.id,
      name: v.name,
      variableType: vt,
      value: v.value != null ? String(v.value) : '0',
      visible: v.visible !== false,
      x: v.x ?? 10,
      y: v.y ?? 10,
      array: (v.items || []).map(x => ({ data: String(x) })),
      object: v.objectId || null,
      isCloud: !!v.cloud,
    };
    if (vt === 'slide') {
      rec.minValue = v.min ?? 0;
      rec.maxValue = v.max ?? 100;
    }
    if (vt === 'list') {
      rec.width = v.width ?? 100;
      rec.height = v.height ?? 120;
    }
    return rec;
  });

  // 3. project.json 본체
  const project = {
    name: model.meta.name || 'REPY Game',
    category: model.meta.category || 'game',
    speed: model.meta.speed || 60,
    scenes: model.scenes,
    variables,
    objects,
    functions: model.functions,
    messages: model.messages,
    tables: [],
    expansionBlocks: [],
    aiUtilizeBlocks: [],
    hardwareLiteBlocks: [],
    externalModules: [],
    externalModulesLite: [],
    isPracticalCourse: false,
    interface: {
      canvasWidth: 640,
      menuWidth: 280,
      object: objects[0] ? objects[0].id : null,
    },
  };

  const projectJsonBytes = encoder.encode(JSON.stringify(project));
  tarFiles.push({
    name: 'temp/project.json',
    data: projectJsonBytes,
    typeflag: '0',
  });

  // 4. tar 묶기 및 gzip 압축
  const tarBuffer = buildTar(tarFiles);
  const gzBuffer = gzipSync(tarBuffer, { mtime: Math.floor(Date.now() / 1000), level: 6 });

  return {
    buffer: gzBuffer,
    project,
    tarSize: tarBuffer.length,
    entSize: gzBuffer.length,
  };
}
