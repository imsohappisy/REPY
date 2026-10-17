// 엔트리 기본 모양 및 벡터 SVG 생성기
import { parseColor } from './blocks-table.js';

const SHAPE_ALIASES = {
  '엔트리봇': 'entrybot',
  '엔트리봇_걷기1': 'entrybot_walk1',
  '엔트리봇_걷기2': 'entrybot_walk2',
  '엔트리봇_날기': 'entrybot_fly',
  '고양이': 'cat',
  '강아지': 'dog',
  '나무': 'tree',
  '코인': 'coin',
  '동전': 'coin',
  '별': 'star',
  '하트': 'heart',
  '원': 'circle',
  '동그라미': 'circle',
  '사각형': 'rect',
  '네모': 'rect',
  '삼각형': 'triangle',
};

export function normalizeShapeName(name) {
  if (!name) return 'entrybot';
  const trimmed = String(name).trim();
  return SHAPE_ALIASES[trimmed] || trimmed;
}

export function isKnownPresetShape(name) {
  const norm = normalizeShapeName(name);
  return [
    'entrybot', 'entrybot_walk1', 'entrybot_walk2', 'entrybot_fly',
    'cat', 'dog', 'tree', 'coin',
    'circle', 'rect', 'square', 'star', 'triangle', 'heart', 'blank'
  ].includes(norm);
}

export function createShapeSvg(shapeName, args = [], kwargs = {}) {
  const normColor = c => parseColor(c) || c || '#2563eb';
  const norm = normalizeShapeName(shapeName);

  switch (norm) {
    // ── 엔트리봇 정면 (기본) ──────────────────────────────────
    case 'entrybot': {
      const w = 100, h = 120;
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 120">
  <!-- 안테나 -->
  <line x1="50" y1="20" x2="50" y2="10" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
  <circle cx="50" cy="8" r="5" fill="#f59e0b"/>
  <!-- 귀 (양쪽) -->
  <rect x="14" y="38" width="8" height="18" rx="4" fill="#f59e0b"/>
  <rect x="78" y="38" width="8" height="18" rx="4" fill="#f59e0b"/>
  <!-- 몸통 (블루) -->
  <rect x="28" y="74" width="44" height="34" rx="10" fill="#00b4d8" stroke="#1e293b" stroke-width="3"/>
  <circle cx="50" cy="88" r="5" fill="#fde047"/>
  <!-- 다리 -->
  <rect x="34" y="106" width="10" height="10" rx="3" fill="#1e293b"/>
  <rect x="56" y="106" width="10" height="10" rx="3" fill="#1e293b"/>
  <!-- 팔 -->
  <rect x="18" y="78" width="10" height="20" rx="5" fill="#00b4d8" stroke="#1e293b" stroke-width="2.5"/>
  <rect x="72" y="78" width="10" height="20" rx="5" fill="#00b4d8" stroke="#1e293b" stroke-width="2.5"/>
  <!-- 머리 -->
  <rect x="20" y="22" width="60" height="52" rx="18" fill="#ffffff" stroke="#1e293b" stroke-width="3.5"/>
  <!-- 눈 -->
  <circle cx="38" cy="45" r="5" fill="#1e293b"/>
  <circle cx="62" cy="45" r="5" fill="#1e293b"/>
  <!-- 볼 -->
  <circle cx="30" cy="54" r="4" fill="#fda4af"/>
  <circle cx="70" cy="54" r="4" fill="#fda4af"/>
  <!-- 입 -->
  <path d="M44 54 Q50 62 56 54" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`,
        width: w,
        height: h,
      };
    }

    // ── 엔트리봇 걷기 1 ──────────────────────────────────────
    case 'entrybot_walk1': {
      const w = 100, h = 120;
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 120">
  <line x1="50" y1="20" x2="52" y2="10" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
  <circle cx="52" cy="8" r="5" fill="#f59e0b"/>
  <rect x="14" y="38" width="8" height="18" rx="4" fill="#f59e0b"/>
  <rect x="78" y="38" width="8" height="18" rx="4" fill="#f59e0b"/>
  <rect x="28" y="74" width="44" height="34" rx="10" fill="#00b4d8" stroke="#1e293b" stroke-width="3"/>
  <circle cx="50" cy="88" r="5" fill="#fde047"/>
  <!-- 다리 (교차) -->
  <rect x="30" y="104" width="10" height="12" rx="3" fill="#1e293b" transform="rotate(-10 35 104)"/>
  <rect x="58" y="104" width="10" height="12" rx="3" fill="#1e293b" transform="rotate(15 63 104)"/>
  <!-- 팔 (흔들기) -->
  <rect x="16" y="74" width="10" height="22" rx="5" fill="#00b4d8" stroke="#1e293b" stroke-width="2.5" transform="rotate(20 21 74)"/>
  <rect x="74" y="80" width="10" height="22" rx="5" fill="#00b4d8" stroke="#1e293b" stroke-width="2.5" transform="rotate(-15 79 80)"/>
  <rect x="20" y="22" width="60" height="52" rx="18" fill="#ffffff" stroke="#1e293b" stroke-width="3.5"/>
  <circle cx="39" cy="45" r="5" fill="#1e293b"/>
  <circle cx="63" cy="45" r="5" fill="#1e293b"/>
  <circle cx="31" cy="54" r="4" fill="#fda4af"/>
  <circle cx="71" cy="54" r="4" fill="#fda4af"/>
  <path d="M45 54 Q50 62 57 54" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`,
        width: w,
        height: h,
      };
    }

    // ── 엔트리봇 걷기 2 ──────────────────────────────────────
    case 'entrybot_walk2': {
      const w = 100, h = 120;
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 100 120">
  <line x1="50" y1="20" x2="48" y2="10" stroke="#f59e0b" stroke-width="4" stroke-linecap="round"/>
  <circle cx="48" cy="8" r="5" fill="#f59e0b"/>
  <rect x="14" y="38" width="8" height="18" rx="4" fill="#f59e0b"/>
  <rect x="78" y="38" width="8" height="18" rx="4" fill="#f59e0b"/>
  <rect x="28" y="74" width="44" height="34" rx="10" fill="#00b4d8" stroke="#1e293b" stroke-width="3"/>
  <circle cx="50" cy="88" r="5" fill="#fde047"/>
  <!-- 다리 (반대 교차) -->
  <rect x="34" y="104" width="10" height="12" rx="3" fill="#1e293b" transform="rotate(15 39 104)"/>
  <rect x="54" y="104" width="10" height="12" rx="3" fill="#1e293b" transform="rotate(-12 59 104)"/>
  <!-- 팔 (반대 흔들기) -->
  <rect x="18" y="80" width="10" height="22" rx="5" fill="#00b4d8" stroke="#1e293b" stroke-width="2.5" transform="rotate(-15 23 80)"/>
  <rect x="72" y="74" width="10" height="22" rx="5" fill="#00b4d8" stroke="#1e293b" stroke-width="2.5" transform="rotate(20 77 74)"/>
  <rect x="20" y="22" width="60" height="52" rx="18" fill="#ffffff" stroke="#1e293b" stroke-width="3.5"/>
  <circle cx="37" cy="45" r="5" fill="#1e293b"/>
  <circle cx="61" cy="45" r="5" fill="#1e293b"/>
  <circle cx="29" cy="54" r="4" fill="#fda4af"/>
  <circle cx="69" cy="54" r="4" fill="#fda4af"/>
  <path d="M43 54 Q50 62 55 54" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round"/>
</svg>`,
        width: w,
        height: h,
      };
    }

    // ── 엔트리봇 날기 ────────────────────────────────────────
    case 'entrybot_fly': {
      const w = 110, h = 100;
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 110 100">
  <!-- 제트 불꽃 -->
  <polygon points="15,50 5,42 5,58" fill="#ef4444"/>
  <polygon points="18,50 10,45 10,55" fill="#fbbf24"/>
  <!-- 몸체 -->
  <rect x="20" y="32" width="55" height="36" rx="14" fill="#00b4d8" stroke="#1e293b" stroke-width="3"/>
  <circle cx="36" cy="50" r="4" fill="#fde047"/>
  <!-- 머리 (앞쪽) -->
  <rect x="52" y="24" width="50" height="52" rx="16" fill="#ffffff" stroke="#1e293b" stroke-width="3.5"/>
  <!-- 눈 (윙크 또는 신난 눈) -->
  <circle cx="70" cy="46" r="4.5" fill="#1e293b"/>
  <path d="M84 46 Q89 40 94 46" stroke="#1e293b" stroke-width="3" fill="none" stroke-linecap="round"/>
  <circle cx="65" cy="56" r="3.5" fill="#fda4af"/>
  <circle cx="95" cy="56" r="3.5" fill="#fda4af"/>
  <path d="M76 56 Q82 62 88 56" stroke="#1e293b" stroke-width="2.5" fill="none" stroke-linecap="round"/>
</svg>`,
        width: w,
        height: h,
      };
    }

    // ── 고양이 ───────────────────────────────────────────────
    case 'cat': {
      const w = 90, h = 90;
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 90 90">
  <polygon points="18,36 28,12 42,26" fill="#fb923c" stroke="#1e293b" stroke-width="3"/>
  <polygon points="72,36 62,12 48,26" fill="#fb923c" stroke="#1e293b" stroke-width="3"/>
  <ellipse cx="45" cy="48" rx="34" ry="30" fill="#fb923c" stroke="#1e293b" stroke-width="3"/>
  <ellipse cx="45" cy="54" rx="20" ry="16" fill="#fed7aa"/>
  <circle cx="35" cy="44" r="4" fill="#1e293b"/>
  <circle cx="55" cy="44" r="4" fill="#1e293b"/>
  <polygon points="45,50 42,47 48,47" fill="#f43f5e"/>
  <path d="M45 51 Q41 56 37 54 M45 51 Q49 56 53 54" stroke="#1e293b" stroke-width="2" fill="none"/>
  <line x1="20" y1="46" x2="30" y2="48" stroke="#1e293b" stroke-width="2"/>
  <line x1="20" y1="52" x2="30" y2="52" stroke="#1e293b" stroke-width="2"/>
  <line x1="70" y1="46" x2="60" y2="48" stroke="#1e293b" stroke-width="2"/>
  <line x1="70" y1="52" x2="60" y2="52" stroke="#1e293b" stroke-width="2"/>
</svg>`,
        width: w,
        height: h,
      };
    }

    // ── 강아지 ───────────────────────────────────────────────
    case 'dog': {
      const w = 90, h = 90;
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 90 90">
  <!-- 늘어진 귀 -->
  <ellipse cx="18" cy="45" rx="8" ry="18" fill="#a16207" stroke="#1e293b" stroke-width="3" transform="rotate(15 18 45)"/>
  <ellipse cx="72" cy="45" rx="8" ry="18" fill="#a16207" stroke="#1e293b" stroke-width="3" transform="rotate(-15 72 45)"/>
  <ellipse cx="45" cy="48" rx="32" ry="28" fill="#ca8a04" stroke="#1e293b" stroke-width="3"/>
  <ellipse cx="45" cy="56" rx="16" ry="14" fill="#fef08a"/>
  <circle cx="36" cy="44" r="4" fill="#1e293b"/>
  <circle cx="54" cy="44" r="4" fill="#1e293b"/>
  <ellipse cx="45" cy="52" rx="5" ry="4" fill="#1e293b"/>
  <path d="M45 56 C42 62 48 62 45 56" fill="#f43f5e" stroke="#1e293b" stroke-width="1.5"/>
</svg>`,
        width: w,
        height: h,
      };
    }

    // ── 코인 (동전) ──────────────────────────────────────────
    case 'coin': {
      const w = 60, h = 60;
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 60 60">
  <circle cx="30" cy="30" r="26" fill="#f59e0b" stroke="#b45309" stroke-width="3"/>
  <circle cx="30" cy="30" r="20" fill="#fbbf24" stroke="#d97706" stroke-width="2"/>
  <text x="30" y="37" font-size="22" font-weight="900" font-family="sans-serif" text-anchor="middle" fill="#78350f">E</text>
</svg>`,
        width: w,
        height: h,
      };
    }

    // ── 나무 ─────────────────────────────────────────────────
    case 'tree': {
      const w = 80, h = 100;
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 80 100">
  <rect x="33" y="60" width="14" height="36" fill="#78350f" stroke="#1e293b" stroke-width="2.5"/>
  <circle cx="40" cy="35" r="30" fill="#16a34a" stroke="#1e293b" stroke-width="3"/>
  <circle cx="28" cy="45" r="16" fill="#22c55e"/>
  <circle cx="52" cy="45" r="16" fill="#22c55e"/>
  <circle cx="40" cy="24" r="16" fill="#4ade80"/>
</svg>`,
        width: w,
        height: h,
      };
    }

    // ── 원 (circle) ──────────────────────────────────────────
    case 'circle': {
      const r = Number(args[0] ?? kwargs.r ?? 25);
      const fill = normColor(args[1] ?? kwargs.fill ?? '#3b82f6');
      const stroke = normColor(kwargs.stroke ?? 'none');
      const strokeWidth = kwargs.stroke_width ?? (stroke !== 'none' ? 2 : 0);
      const w = Math.ceil((r + strokeWidth) * 2);
      const h = w;
      const cx = w / 2, cy = h / 2;
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />
</svg>`,
        width: w,
        height: h,
      };
    }

    // ── 사각형 (rect) ────────────────────────────────────────
    case 'rect':
    case 'square': {
      const w = Number(args[0] ?? kwargs.w ?? kwargs.width ?? 50);
      const h = norm === 'square' ? w : Number(args[1] ?? kwargs.h ?? kwargs.height ?? 50);
      const fill = normColor(args[2] ?? kwargs.fill ?? '#10b981');
      const radius = kwargs.radius ?? kwargs.r ?? 0;
      const stroke = normColor(kwargs.stroke ?? 'none');
      const strokeWidth = kwargs.stroke_width ?? (stroke !== 'none' ? 2 : 0);
      const totalW = w + strokeWidth;
      const totalH = h + strokeWidth;
      const x = strokeWidth / 2, y = strokeWidth / 2;
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${totalH}" viewBox="0 0 ${totalW} ${totalH}">
  <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${radius}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" />
</svg>`,
        width: totalW,
        height: totalH,
      };
    }

    // ── 별 (star) ────────────────────────────────────────────
    case 'star': {
      const r = Number(args[0] ?? kwargs.r ?? 30);
      const fill = normColor(args[1] ?? kwargs.fill ?? '#f59e0b');
      const points = [];
      const innerR = r * 0.45;
      for (let i = 0; i < 10; i++) {
        const rad = (i * Math.PI) / 5 - Math.PI / 2;
        const dist = i % 2 === 0 ? r : innerR;
        points.push(`${r + dist * Math.cos(rad)},${r + dist * Math.sin(rad)}`);
      }
      const size = r * 2;
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <polygon points="${points.join(' ')}" fill="${fill}" />
</svg>`,
        width: size,
        height: size,
      };
    }

    // ── 삼각형 (triangle) ─────────────────────────────────────
    case 'triangle': {
      const w = Number(args[0] ?? kwargs.w ?? 50);
      const h = Number(args[1] ?? kwargs.h ?? 50);
      const fill = normColor(args[2] ?? kwargs.fill ?? '#ef4444');
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <polygon points="${w / 2},0 ${w},${h} 0,${h}" fill="${fill}" />
</svg>`,
        width: w,
        height: h,
      };
    }

    // ── 하트 (heart) ─────────────────────────────────────────
    case 'heart': {
      const size = Number(args[0] ?? kwargs.size ?? 50);
      const fill = normColor(args[1] ?? kwargs.fill ?? '#ec4899');
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24">
  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" fill="${fill}"/>
</svg>`,
        width: size,
        height: size,
      };
    }

    case 'blank':
    default: {
      const w = Number(args[0] ?? kwargs.w ?? 64);
      const h = Number(args[1] ?? kwargs.h ?? 64);
      return {
        svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <rect width="${w}" height="${h}" fill="none" />
</svg>`,
        width: w,
        height: h,
      };
    }
  }
}

export function defaultPlaceholderSvg() {
  return createShapeSvg('entrybot');
}
