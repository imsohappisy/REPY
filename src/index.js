// Real Entry Python (REPY) — Main Entry Point
import { tokenize } from './lexer.js';
import { parse } from './parser.js';
import { compileModule } from './compiler.js';
import { packEnt } from './pack.js';
import { ReprError } from './errors.js';

export { tokenize, parse, compileModule, packEnt, ReprError };

/**
 * REPY 소스 코드를 엔트리 .ent 바이너리 및 프로젝트 데이터로 변환
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
