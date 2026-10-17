import { compileToEnt, ReprError } from 'repy/index.js';

const editor = document.getElementById('code-editor');
const lineNumbers = document.getElementById('line-numbers');
const btnConvert = document.getElementById('btn-convert');
const btnNew = document.getElementById('btn-new');
const btnCopy = document.getElementById('btn-copy');
const fileUpload = document.getElementById('file-upload');
const logOutput = document.getElementById('log-output');
const statusIndicator = document.getElementById('status-indicator');

// 통계 지표
const statScenes = document.getElementById('stat-scenes');
const statObjects = document.getElementById('stat-objects');
const statVars = document.getElementById('stat-vars');
const statFuncs = document.getElementById('stat-funcs');

// 레퍼런스 토글
const refToggle = document.getElementById('ref-toggle');
const refContent = document.getElementById('ref-content');
const refIcon = document.getElementById('ref-icon');

const DEFAULT_CODE = `# [REPY] 프로젝트 시작하기
project(name="작품1")

object "엔트리봇"(shape="entrybot", x=0, y=0):
    when run:
        say("안녕하세요, REPY!")
`;

// 1. 에디터 줄 번호 및 탭(Tab) 지원
function updateLineNumbers() {
  const lines = editor.value.split('\n').length;
  let nums = '';
  for (let i = 1; i <= lines; i++) {
    nums += i + '\n';
  }
  lineNumbers.textContent = nums;
}

editor.addEventListener('input', updateLineNumbers);

editor.addEventListener('scroll', () => {
  lineNumbers.scrollTop = editor.scrollTop;
});

editor.addEventListener('keydown', (e) => {
  if (e.key === 'Tab') {
    e.preventDefault();
    const start = editor.selectionStart;
    const end = editor.selectionEnd;
    editor.value = editor.value.substring(0, start) + '    ' + editor.value.substring(end);
    editor.selectionStart = editor.selectionEnd = start + 4;
    updateLineNumbers();
  }
});

// 2. 툴바 기능들
btnNew.addEventListener('click', () => {
  if (editor.value.trim() && !confirm('현재 작업 중인 코드를 비우시겠습니까?')) return;
  editor.value = DEFAULT_CODE;
  updateLineNumbers();
  setLog('새 문서가 준비되었습니다.', 'normal');
});

btnCopy.addEventListener('click', async () => {
  try {
    await navigator.clipboard.writeText(editor.value);
    btnCopy.textContent = '복사 완료!';
    setTimeout(() => { btnCopy.textContent = '코드 복사'; }, 1200);
  } catch (err) {
    alert('클립보드 복사 실패: ' + err.message);
  }
});

fileUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (evt) => {
    editor.value = evt.target.result;
    updateLineNumbers();
    setLog(`파일 [${file.name}] 불러오기 완료.`, 'normal');
  };
  reader.readAsText(file);
});

// 4. 레퍼런스 드로어 토글
refToggle.addEventListener('click', () => {
  const isOpen = refContent.classList.toggle('open');
  refIcon.textContent = isOpen ? '[-]' : '[+]';
});

// 5. 로그 출력 헬퍼
function setLog(msg, type = 'normal') {
  logOutput.textContent = msg;
  logOutput.className = 'log-box';
  if (type === 'error') {
    logOutput.classList.add('error');
    statusIndicator.textContent = '[ ERROR ]';
    statusIndicator.style.color = '#cc0000';
  } else if (type === 'success') {
    logOutput.classList.add('success');
    statusIndicator.textContent = '[ SUCCESS ]';
    statusIndicator.style.color = '#008800';
  } else {
    statusIndicator.textContent = '[ IDLE ]';
    statusIndicator.style.color = '#666';
  }
}

// 6. 변환 및 다운로드
btnConvert.addEventListener('click', () => {
  const code = editor.value;
  if (!code.trim()) {
    setLog('오류: 변환할 코드가 비어 있습니다.', 'error');
    return;
  }

  const startTime = performance.now();
  try {
    const res = compileToEnt(code);
    const elapsed = (performance.now() - startTime).toFixed(1);

    // 메트릭 갱신
    statScenes.textContent = res.project.scenes.length;
    statObjects.textContent = res.project.objects.length;
    statVars.textContent = res.project.variables.length;
    statFuncs.textContent = res.project.functions.length;

    // 다운로드 트리거
    const blob = new Blob([res.buffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const filename = `${res.project.name || 'project'}.ent`;
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    let logMsg = `[컴파일 성공!] (${elapsed}ms 소요)\n`;
    logMsg += `* 작품 이름: ${res.project.name}\n`;
    logMsg += `* 장면 수: ${res.project.scenes.length}개\n`;
    logMsg += `* 오브젝트 수: ${res.project.objects.length}개\n`;
    logMsg += `* 변수/리스트: ${res.project.variables.length}개\n`;
    logMsg += `* 함수: ${res.project.functions.length}개\n`;
    logMsg += `* 파일 크기: ${(res.entSize / 1024).toFixed(1)} KB (압축 전 tar: ${(res.tarSize / 1024).toFixed(1)} KB)\n`;
    logMsg += `\n>> '${filename}' 다운로드가 시작되었습니다.`;

    if (res.warnings && res.warnings.length) {
      logMsg += `\n\n[경고 ${res.warnings.length}건]\n`;
      for (const w of res.warnings) {
        logMsg += `  - (줄 ${w.line}) ${w.message}\n`;
      }
    }

    setLog(logMsg, 'success');
  } catch (err) {
    let errMsg = `[컴파일 실패]\n`;
    if (err instanceof ReprError) {
      errMsg += `종류: ${err.kind.toUpperCase()} ERROR\n`;
      errMsg += `위치: 줄 ${err.line}, 칸 ${err.col}\n`;
      errMsg += `메시지: ${err.message}\n`;
      if (err.line > 0) {
        const lineText = code.split('\n')[err.line - 1] || '';
        errMsg += `\n> ${err.line} | ${lineText}\n`;
        errMsg += `  ${' '.repeat(String(err.line).length + 3 + Math.max(0, err.col - 1))}^\n`;
      }
    } else {
      errMsg += `메시지: ${err.message}\n${err.stack || ''}`;
    }
    setLog(errMsg, 'error');
  }
});

// 초기 실행 시 기본 템플릿 코드 로드
editor.value = DEFAULT_CODE;
updateLineNumbers();
setLog('REPY 에디터가 준비되었습니다. [.ENT 변환 및 다운로드] 버튼을 누르세요.', 'normal');
