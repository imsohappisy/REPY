// REPY 오류 — 줄/칸 위치를 가진다.
export class ReprError extends Error {
  constructor(message, line = 0, col = 0, kind = 'error') {
    super(message);
    this.name = 'ReprError';
    this.line = line;
    this.col = col;
    this.kind = kind; // 'syntax' | 'compile' | 'asset'
  }
}
