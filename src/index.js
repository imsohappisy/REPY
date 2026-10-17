// Real Entry Python (REPY) — Main Entry Point
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { compileModule } from './compiler.js';
import { packEnt } from './pack.js';
import { ReprError } from './errors.js';
import { createShapeSvg, isKnownPresetShape } from './shapes.js';
import { rasterizeSvg } from './png.js';

export { tokenize, parse, compileModule, packEnt, ReprError };

/**
 * REPY 소스 코드를 엔트리 .ent 바이너리 및 프로젝트 데이터로 변환 (동기)
 * @param {string} sourceCode REPY 파이썬 소스 코드
 * @param {object} options 컴파일 옵션 { name, externalAssets }
 * @returns {{ buffer: Uint8Array, project: object, warnings: Array }}
 */
export function compileToEnt(sourceCode, options = {}) {
  const ast = parse(sourceCode);
  const model = compileModule(ast, options);
  const packed = packEnt(model, options.externalAssets);
  return {
    buffer: packed.buffer,
    project: packed.project,
    warnings: model.warnings,
    tarSize: packed.tarSize,
    entSize: packed.entSize,
  };
}

/**
 * REPY 소스 코드를 엔트리 .ent 바이너리로 변환 (비동기, 브라우저 Canvas 래스터라이즈 지원)
 * @param {string} sourceCode REPY 파이썬 소스 코드
 * @param {object} options 컴파일 옵션
 * @returns {Promise<{ buffer: Uint8Array, project: object, warnings: Array }>}
 */
export async function compileToEntAsync(sourceCode, options = {}) {
  const ast = parse(sourceCode);
  const model = compileModule(ast, options);

  // 브라우저 캔버스를 통해 각 오브젝트의 SVG를 실제 고품질 PNG 바이너리로 래스터라이즈
  for (const obj of model.objects) {
    if (obj.kind !== 'textbox') {
      for (const p of obj.pictures) {
        let svg = null, w = 100, h = 100;
        if (p.kind === 'shape') {
          const res = createShapeSvg(p.shape, p.args, p.kwargs);
          svg = res.svg;
          w = res.width;
          h = res.height;
        } else if (p.kind === 'file' || p.kind === 'image') {
          const src = p.src || p.file || '';
          if (isKnownPresetShape(src)) {
            const res = createShapeSvg(src, p.args, p.kwargs);
            svg = res.svg;
            w = res.width;
            h = res.height;
          } else if (src.trim().startsWith('<svg')) {
            svg = src;
            w = p.width || 100;
            h = p.height || 100;
          }
        }
        if (svg) {
          p.pngBytes = await rasterizeSvg(svg, w, h);
        }
      }
    }
  }

  const packed = packEnt(model, options.externalAssets);
  return {
    buffer: packed.buffer,
    project: packed.project,
    warnings: model.warnings,
    tarSize: packed.tarSize,
    entSize: packed.entSize,
  };
}
