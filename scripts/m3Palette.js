/**
 * m3Palette.js
 * 4토큰(Background · Surface · Text · Primary)에서 Material Design 3의
 * 26개 색 역할을 파생하는 순수 계산부.
 *
 * 왜 이렇게 만드는가
 * ──────────────────
 * 명세 3.1에서 26개 M3 색 역할 대신 4토큰을 정본으로 삼기로 했다. 그래서 여기서
 * 만드는 팔레트는 토큰을 대체하지 않고 「4토큰에서 자동으로 따라 나오는 값」이다.
 * background·surface·on-background·on-surface·primary 다섯 역할은 토큰을 그대로
 * 가져오고(source: 'token'), 나머지 21개만 파생한다(source: 'derived').
 * on-background와 on-surface는 둘 다 본문 토큰을 받는다.
 *
 * HCT를 쓰지 않는 이유
 * ────────────────────
 * HCT 미채택은 확정 사항이고, 이 프로젝트에는 RGB→HCT 정방향만 있다.
 * 대신 M3의 **구조**만 빌려온다.
 *   - 톤(tone): M3의 톤 값은 CIE L*다. 목표 L*이 나오는 HSL 명도를 이분 탐색으로
 *     찾는다. 톤→명도를 눈대중으로 매핑하지 않으므로 밝기 위계가 M3와 같다.
 *   - 채도(chroma): M3는 Primary 기준 chroma 48에 대해 Secondary 16, Tertiary 24,
 *     Neutral 4, Neutral Variant 8을 쓴다. 이 비율을 Primary의 HSL 채도에 곱하는 자체 근사다. HCT chroma와 동등하지 않다.
 *   - 색상(hue): Secondary는 Primary와 같고 Tertiary는 +60°, Error는 M3가 고정한
 *     붉은 계열을 그대로 쓴다(브랜드 색에서 파생하지 않는다).
 *
 * 대비 보장
 * ─────────
 * on- 역할은 짝이 되는 배경 위에서 본문 기준 4.5:1을 넘도록 명도를 다시 푼다.
 * 따라서 파생 팔레트만 써도 WCAG AA 텍스트 대비가 깨지지 않는다.
 */

import { hslToRgb, rgbToHsl } from './colorModel.js';
import { contrastBetween } from './contrast.js';
import { hctXyzFromRgb, toneFromY } from './hct.js';
import { AA_FLOOR } from './gate.js';

/** M3가 Primary 계열에 쓰는 기준 chroma. 나머지 계열의 비율 기준이 된다. */
const PRIMARY_CHROMA = 48;
const CHROMA = { primary: 48, secondary: 16, tertiary: 24, neutral: 4, neutralVariant: 8 };

/**
 * Error는 브랜드 색에서 파생하지 않고 M3가 고정한 붉은 계열을 쓴다.
 * M3의 hue 25는 CAM16 색상환 값이라 HSL 색상환에 그대로 넣으면 주황이 된다.
 * 그래서 베이스라인 스킴의 실제 error 색(#B3261E, #F2B8B5)을 HSL로 환산해
 * 평균낸 값을 쓴다 — 두 색 모두 h≈3, s≈71로 거의 같다.
 */
const ERROR_HUE = 3;
const ERROR_SATURATION = 71;

const TERTIARY_HUE_SHIFT = 60;

/**
 * M3 베이스라인 스킴의 톤 배치. [밝은 스킴, 어두운 스킴] 순서다.
 * 출처: Material Design 3 color roles (baseline scheme tone assignments),
 * material-color-utilities color_spec_2021(TonalSpot, 표준 대비).
 * on-*-container의 밝은 스킴 톤은 M3 2024-08 변경("More colorful text and icons")대로 10 → 30이다.
 * MDC-Android tokens.xml · Compose ColorLightTokens는 아직 10이라 출처가 갈린다(명세 3.1.1).
 */
const ROLE_TONES = {
  primary:                 [40, 80],
  'on-primary':            [100, 20],
  'primary-container':     [90, 30],
  'on-primary-container':  [30, 90],
  secondary:               [40, 80],
  'on-secondary':          [100, 20],
  'secondary-container':   [90, 30],
  'on-secondary-container':[30, 90],
  tertiary:                [40, 80],
  'on-tertiary':           [100, 20],
  'tertiary-container':    [90, 30],
  'on-tertiary-container': [30, 90],
  error:                   [40, 80],
  'on-error':              [100, 20],
  'error-container':       [90, 30],
  'on-error-container':    [30, 90],
  background:              [98, 6],
  'on-background':         [10, 90],
  surface:                 [98, 6],
  'on-surface':            [10, 90],
  'surface-variant':       [90, 30],
  'on-surface-variant':    [30, 80],
  outline:                 [50, 60],
  'outline-variant':       [80, 30],
  'inverse-surface':       [20, 90],
  'on-inverse-surface':    [95, 20],
};

/**
 * 텍스트 계열 역할의 톤을 Text · Background 토큰에서 상대적으로 잡는다(명세 4.1.7).
 * 보조 글은 M3 톤 간격을 그대로 옮긴다: on-surface 10/90 → on-surface-variant 30/80(+20 · −10).
 * 반전 표면 · 반전 글자는 M3 정의(surface ↔ on-surface 맞바꿈)대로 Text · Background를 그대로 뒤집는다.
 * M3 고정 톤(20 · 95)을 쓰면 절감형처럼 Text가 대비 하한에 붙어 있을 때 반전 쌍이 무너지므로(밝은 절감형
 * inverse-surface가 중간 회색이 됨), 게이트가 이미 보장한 Text–Background 대비를 그대로 물려받는다.
 * 그래서 Text · Background 명도를 바꾸면 보조 글 · 반전 표면 · 반전 글자가 함께 옮겨진다.
 */
const RELATIVE_TONES = {
  'on-surface-variant': { from: 'text', offset: [20, -10] },
  'inverse-surface':    { from: 'text', offset: [0, 0] },
  'on-inverse-surface': { from: 'bg',   offset: [0, 0] },
};

/**
 * M3 add-on 역할(Fixed accent · On fixed)과 inverse-primary · scrim.
 * 기존 26개 역할(ROLE_ORDER)과 따로 두어 내보내기·화면이 순서를 고를 수 있게 한다.
 * 톤 출처: material-color-utilities color_spec_2021 TonalSpot 표준 대비
 *   fixed 90 · fixed-dim 80 · on-fixed 10 · on-fixed-variant 30 (밝은·어두운 스킴 동일 — "fixed"),
 *   inverse-primary 80 / 40, scrim 0.
 */
const ADDON_TONES = {
  'inverse-primary':            [80, 40],
  'primary-fixed':              [90, 90],
  'primary-fixed-dim':          [80, 80],
  'on-primary-fixed':           [10, 10],
  'on-primary-fixed-variant':   [30, 30],
  'secondary-fixed':            [90, 90],
  'secondary-fixed-dim':        [80, 80],
  'on-secondary-fixed':         [10, 10],
  'on-secondary-fixed-variant': [30, 30],
  'tertiary-fixed':             [90, 90],
  'tertiary-fixed-dim':         [80, 80],
  'on-tertiary-fixed':          [10, 10],
  'on-tertiary-fixed-variant':  [30, 30],
  scrim:                        [0, 0],
};

export const ADDON_ROLE_ORDER = Object.keys(ADDON_TONES);

const ADDON_FAMILY = Object.fromEntries(ADDON_ROLE_ORDER.map(role => [role,
  role === 'scrim' ? 'neutral' : role.includes('secondary') ? 'secondary' : role.includes('tertiary') ? 'tertiary' : 'primary']));

/**
 * add-on 글자 역할이 얹히는 배경. MCU처럼 on-fixed · on-fixed-variant는 더 진한 fixed-dim을 기준으로 잡는다
 * (fixed는 그보다 밝아 어두운 글자 대비가 더 높다). inverse-primary는 inverse-surface 위 글자(스낵바 액션)다.
 */
const ADDON_ON_PAIRS = {
  'on-primary-fixed': 'primary-fixed-dim',
  'on-primary-fixed-variant': 'primary-fixed-dim',
  'on-secondary-fixed': 'secondary-fixed-dim',
  'on-secondary-fixed-variant': 'secondary-fixed-dim',
  'on-tertiary-fixed': 'tertiary-fixed-dim',
  'on-tertiary-fixed-variant': 'tertiary-fixed-dim',
  'inverse-primary': 'inverse-surface',
};

/** 역할이 속한 계열. 색상과 채도를 정하는 기준이다. */
const ROLE_FAMILY = {
  primary: 'primary', 'on-primary': 'primary',
  'primary-container': 'primary', 'on-primary-container': 'primary',
  secondary: 'secondary', 'on-secondary': 'secondary',
  'secondary-container': 'secondary', 'on-secondary-container': 'secondary',
  tertiary: 'tertiary', 'on-tertiary': 'tertiary',
  'tertiary-container': 'tertiary', 'on-tertiary-container': 'tertiary',
  error: 'error', 'on-error': 'error',
  'error-container': 'error', 'on-error-container': 'error',
  background: 'neutral', 'on-background': 'neutral',
  surface: 'neutral', 'on-surface': 'neutral',
  'inverse-surface': 'neutral', 'on-inverse-surface': 'neutral',
  'surface-variant': 'neutralVariant', 'on-surface-variant': 'neutralVariant',
  outline: 'neutralVariant', 'outline-variant': 'neutralVariant',
};

/** 화면에서 묶어 보여줄 단위. UI와 내보내기가 같은 순서를 쓴다. */
export const ROLE_GROUPS = [
  { key: 'primary',   label: 'Primary',   roles: ['primary', 'on-primary', 'primary-container', 'on-primary-container'] },
  { key: 'secondary', label: 'Secondary', roles: ['secondary', 'on-secondary', 'secondary-container', 'on-secondary-container'] },
  { key: 'tertiary',  label: 'Tertiary',  roles: ['tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container'] },
  { key: 'error',     label: 'Error',     roles: ['error', 'on-error', 'error-container', 'on-error-container'] },
  { key: 'surface',   label: 'Surface',   roles: ['background', 'on-background', 'surface', 'on-surface', 'surface-variant', 'on-surface-variant'] },
  { key: 'outline',   label: 'Outline · Inverse', roles: ['outline', 'outline-variant', 'inverse-surface', 'on-inverse-surface'] },
];

export const ROLE_ORDER = ROLE_GROUPS.flatMap(group => group.roles);

/** 4토큰을 그대로 쓰는 역할. 파생이 정본을 덮어쓰지 않게 한다. */
const TOKEN_ROLES = {
  background: 'bg',
  surface: 'surface',
  'on-background': 'text',
  'on-surface': 'text',
  primary: 'accent',
};

/** on- 역할이 얹히는 배경. 대비를 맞출 상대다. */
const ON_PAIRS = {
  'on-primary': 'primary',
  'on-primary-container': 'primary-container',
  'on-secondary': 'secondary',
  'on-secondary-container': 'secondary-container',
  'on-tertiary': 'tertiary',
  'on-tertiary-container': 'tertiary-container',
  'on-error': 'error',
  'on-error-container': 'error-container',
  'on-background': 'background',
  'on-surface': 'surface',
  'on-surface-variant': 'surface-variant',
  'on-inverse-surface': 'inverse-surface',
};

function ratio(a, b) {
  return contrastBetween(hslToRgb(a.h, a.s, a.l), hslToRgb(b.h, b.s, b.l));
}

/**
 * M3가 Neutral 팔레트 위에 두는 surface container의 톤 간격.
 * color_spec_2021 기준으로 밝은 스킴은 background 98 → surface-container 94,
 * 어두운 스킴은 background 6 → surface-container 12이다.
 * 즉 M3에서 카드·시트는 밝은 화면에서 배경보다 **어둡고**, 어두운 화면에서 **밝다**.
 */
const SURFACE_CONTAINER_TONE_DELTA = { dark: 6, light: -4 };

/**
 * M3의 중립 팔레트 구조를 HSL로 근사해 표면을 파생한다.
 *
 * 색상·채도
 *   material-color-utilities의 CorePalette는 씨앗 색 하나에서 다섯 팔레트를 만들고,
 *   그중 Neutral은 「씨앗의 색상 + chroma 4」다. 그래서 M3의 배경과 표면은 회색이 아니라
 *   Primary 색상을 아주 옅게 머금은 중립색이다. 이 구조를 HSL 채도 비율로 근사하며, 실제 HCT chroma 4를 생성하는 것은 아니다.
 *
 * 명도
 *   M3의 background와 surface는 같은 톤(밝은 98 · 어두운 6)이고, 카드·시트의 구분은
 *   surface container 단계가 만든다. 그 첫 단계를 표면의 톤으로 삼는다.
 *   톤 사다리 전체(어두운 4/10/12/17/22)는 여전히 쓰지 않는다 — 높이를 밝기로
 *   표현하지 않는다는 원리 P2 때문이다. 여기서 쓰는 건 배경↔표면 한 칸뿐이다.
 *
 * 실측(2026-09-22)에서 이 규칙은 절감과 같은 방향이었다.
 *   - 밝은 절감형: 표면이 흰색(BW 1.000)에서 톤 91.5(BW 0.913)로 내려간다. M3는 밝은
 *     화면에서 컨테이너를 배경보다 어둡게 두는데, 기존 프리셋은 반대로 더 밝았다.
 *   - 어두운 절감형: 톤 10.3 → 10으로 거의 그대로, BW 0.092 → 0.080.
 *   본문 대비는 두 모드 모두 14:1 이상으로 남아 어떤 대비 수준에도 여유가 있다.
 *
 * @param {{bg,surface,text,accent}} tokens
 * @param {'dark-saving'|'light-saving'} preset
 * @returns {object} 표면을 Primary와 배경에서 파생한 새 토큰 묶음 (입력은 그대로 둔다)
 */
export function deriveNeutralsFromPrimary(tokens, preset) {
  const primary = tokens.accent;
  const saturation = neutralSaturationFor(primary);
  const bg = { h: primary.h, s: saturation, l: tokens.bg.l };
  const delta = SURFACE_CONTAINER_TONE_DELTA[preset === 'dark-saving' ? 'dark' : 'light'];
  const surfaceTone = Math.min(100, Math.max(0, toneOf(bg) + delta));
  return {
    ...tokens,
    bg,
    surface: { h: primary.h, s: saturation, l: lightnessForTone(primary.h, saturation, surfaceTone) },
    // Text도 M3 on-surface(중립 계열 톤)처럼 Primary 색상 + 중립 채도를 쓴다. 사용자는 명도만 정한다(명세 4.1.7).
    text: { h: primary.h, s: saturation, l: tokens.text.l },
  };
}

/**
 * M3 surface container 사다리 5단계의 배경 대비 톤 간격.
 * color_spec_2021 베이스라인: 밝은 스킴 background 98 → 100 / 96 / 94 / 92 / 90,
 * 어두운 스킴 background 6 → 4 / 10 / 12 / 17 / 22.
 * add-on surface-dim · surface-bright: 밝은 87 · 98, 어두운 6 · 24(배경 기준 −11 · 0 / 0 · +18).
 * container 단계는 위의 SURFACE_CONTAINER_TONE_DELTA와 같다(= --surface 토큰).
 */
const SURFACE_CONTAINER_LADDER = {
  light: { 'surface-container-lowest': 2, 'surface-container-low': -2, 'surface-container': -4, 'surface-container-high': -6, 'surface-container-highest': -8,
    'surface-dim': -11, 'surface-bright': 0 },
  dark:  { 'surface-container-lowest': -2, 'surface-container-low': 4, 'surface-container': 6, 'surface-container-high': 11, 'surface-container-highest': 16,
    'surface-dim': 0, 'surface-bright': 18 },
};

/**
 * 배경에서 M3 surface container 5단계를 파생한다. 26개 역할과 별도인 보조 역할이다.
 * 컴포넌트가 M3 기본값(예: elevated 버튼 = surface-container-low)을 그대로 쓸 때 참조한다.
 *
 * @param {{h,s,l}} bg 배경 토큰
 * @param {'dark-saving'|'light-saving'} preset
 * @returns {object} role → {h,s,l,tone}
 */
export function deriveSurfaceContainers(bg, preset) {
  const ladder = SURFACE_CONTAINER_LADDER[preset === 'dark-saving' ? 'dark' : 'light'];
  const base = toneOf(bg);
  const out = {};
  for (const [role, delta] of Object.entries(ladder)) {
    const tone = Math.min(100, Math.max(0, base + delta));
    const l = lightnessForTone(bg.h, bg.s, tone);
    out[role] = { h: bg.h, s: bg.s, l, tone: Math.round(toneOf({ h: bg.h, s: bg.s, l }) * 10) / 10 };
  }
  return out;
}

/**
 * 글자로 쓰는 Primary (프로파일 추가 역할 `primary-on-bg`).
 *
 * M3는 primary를 톤 40/80에 두어 배경 위 글자로 써도 늘 읽히게 한다. 이 도구는 사용자가
 * Primary 명도를 직접 정하고 그 게이트는 비텍스트 3:1이므로, Text·Elevated 버튼 라벨처럼
 * Primary가 글자로 쓰이는 곳에서는 대비가 모자랄 수 있다. 그때만 색상·채도는 그대로 두고
 * 명도를 가장 가까운 값으로 옮겨 기준(대비 단계의 본문 기준: 4.5 / 7 / 11)을 채운다.
 * on- 역할을 보정하는 ensureOnContrast와 같은 원리다.
 *
 * @param {{h,s,l}} primary 적용된 Primary
 * @param {Array<{h,s,l}>} anchors 글자가 놓일 바탕들(배경·Surface)
 * @param {number} target 목표 대비비
 * @returns {{color:{h,s,l}, lifted:boolean, ratio:number}}
 */
export function derivePrimaryOnBg(primary, anchors, target = AA_FLOOR.text) {
  const worst = color => Math.min(...anchors.map(anchor => ratio(color, anchor)));
  const current = worst(primary);
  if (current >= target) return { color: { ...primary }, lifted: false, ratio: current };
  let best = null;
  let fallback = { ...primary };
  let fallbackRatio = current;
  for (let step = 0; step <= 1000; step += 1) {
    const candidate = { ...primary, l: step / 10 };
    const r = worst(candidate);
    if (r > fallbackRatio) { fallback = candidate; fallbackRatio = r; }
    if (r >= target && (!best || Math.abs(candidate.l - primary.l) < Math.abs(best.l - primary.l))) best = candidate;
  }
  const color = best || fallback;
  return { color, lifted: true, ratio: Math.round(worst(color) * 100) / 100 };
}

/** base 위에 over를 alpha 불투명도로 덮은 색(HSL). 선택 덮개(secondary 16%) 같은 합성 배경에 쓴다. */
export function compositeOver(base, over, alpha) {
  const a = hslToRgb(base.h, base.s, base.l);
  const o = hslToRgb(over.h, over.s, over.l);
  const mix = key => Math.round(a[key] * (1 - alpha) + o[key] * alpha);
  return rgbToHsl(mix('r'), mix('g'), mix('b'));
}

/** 파생된 표면이 배경에서 몇 톤 떨어지는지. UI 안내에 쓴다. */
export function surfaceToneDelta(preset) {
  return SURFACE_CONTAINER_TONE_DELTA[preset === 'dark-saving' ? 'dark' : 'light'];
}

/** 중립 팔레트의 채도. M3 Neutral chroma 4 / Primary chroma 48 비율이다. */
export function neutralSaturationFor(primary) {
  return Math.round((primary.s * CHROMA.neutral / PRIMARY_CHROMA) * 10) / 10;
}

/** HSL 색의 CIE L*. M3의 톤과 같은 척도다. */
export function toneOf({ h, s, l }) {
  const { r, g, b } = hslToRgb(h, s, l);
  return toneFromY(hctXyzFromRgb(r, g, b)[1]);
}

/**
 * 목표 톤(CIE L*)이 나오는 HSL 명도를 이분 탐색으로 찾는다.
 * 톤은 명도에 대해 단조 증가하므로 해가 하나다.
 */
export function lightnessForTone(h, s, targetTone) {
  let low = 0;
  let high = 100;
  for (let i = 0; i < 40; i += 1) {
    const mid = (low + high) / 2;
    if (toneOf({ h, s, l: mid }) < targetTone) low = mid;
    else high = mid;
  }
  // 명도는 이 프로젝트의 다른 계산과 같은 0.1 단위로 맞춘다. 반올림 방향에 따라
  // 톤이 최대 0.4까지 어긋나므로, 양쪽 격자점 중 목표에 가까운 쪽을 고른다.
  const exact = (low + high) / 2;
  const candidates = [Math.floor(exact * 10) / 10, Math.ceil(exact * 10) / 10];
  return candidates.reduce((best, l) =>
    Math.abs(toneOf({ h, s, l }) - targetTone) < Math.abs(toneOf({ h, s, l: best }) - targetTone) ? l : best);
}

function familyColor(family, primary) {
  if (family === 'error') return { h: ERROR_HUE, s: ERROR_SATURATION };
  const scale = CHROMA[family] / PRIMARY_CHROMA;
  const hue = family === 'tertiary'
    ? (primary.h + TERTIARY_HUE_SHIFT) % 360
    : primary.h;
  return { h: hue, s: Math.round(primary.s * scale * 10) / 10 };
}

/**
 * on- 역할의 명도를 다시 풀어 본문 대비 4.5:1을 확보한다.
 * M3 톤이 이미 충분하면 건드리지 않는다.
 */
function ensureOnContrast(on, background, target = AA_FLOOR.text) {
  if (ratio(on, background) >= target) return { color: on, lifted: false };
  // 현재 명도에서 배경과 멀어지는 쪽으로 옮기며 기준을 채우는 가장 가까운 값을 찾는다(명세 4.1.6).
  // 끝까지 가도 못 채우면 그쪽 끝(0 또는 100)이 가능한 최대 대비다.
  const goDarker = toneOf(background) > 50;
  const start = Math.round(on.l * 10);
  for (let step = start; goDarker ? step >= 0 : step <= 1000; step += goDarker ? -1 : 1) {
    const candidate = { ...on, l: step / 10 };
    if (ratio(candidate, background) >= target) return { color: candidate, lifted: true };
  }
  return { color: { ...on, l: goDarker ? 0 : 100 }, lifted: true };
}

/**
 * 4토큰에서 M3 26개 색 역할을 만든다.
 *
 * @param {{bg,surface,text,accent}} tokens 적용값(게이트를 통과한 값)
 * @param {'dark-saving'|'light-saving'} preset 스킴 극성
 * @returns {{roles: object, order: string[], groups: object[]}}
 *   roles[name] = { h, s, l, tone, source: 'token'|'derived', family, lifted }
 */
/**
 * on- 명도만으로 목표에 닿지 않을 때(끝 명도 0 · 100에서도 미달) 짝 배경의 명도를 on- 반대쪽으로 옮긴다.
 * 배경은 Primary에서 파생된 색상·채도를 그대로 두고 톤(명도)만 바꾼다 — M3 고대비 스킴과 같은 방식(명세 4.1.6).
 * 목표를 채우는 가장 가까운 배경 명도를 쓰고, 그 위에서 on-을 다시 가장 가까운 명도로 푼다.
 */
function ensurePairContrast(on, background, target) {
  const first = ensureOnContrast(on, background, target);
  if (ratio(first.color, background) >= target) return { on: first.color, lifted: first.lifted, background, shifted: false };
  const extreme = first.color;                       // 0 또는 100
  const goDarker = extreme.l >= 50;                  // 흰 글자면 배경을 어둡게, 검은 글자면 밝게
  const start = Math.round(background.l * 10);
  for (let step = start; goDarker ? step >= 0 : step <= 1000; step += goDarker ? -1 : 1) {
    const candidate = { ...background, l: step / 10 };
    if (ratio(extreme, candidate) >= target) {
      const settled = ensureOnContrast(on, candidate, target);
      return { on: settled.color, lifted: settled.lifted, background: candidate, shifted: true };
    }
  }
  return { on: extreme, lifted: true, background, shifted: false };
}

/**
 * 컨테이너 위 글자가 대비를 맞출 배경 묶음(명세 4.1.5 · 4.1.6).
 * surface(배경) · surface-container(Surface 토큰) · surface-container-low · -highest와, 각각에 선택 덮개(secondary 16%)를 합성한 색.
 * `--text-on-container`와 on-surface-variant가 같은 묶음을 쓴다.
 */
/**
 * 글자로 쓰는 Primary(--primary-on-bg)가 얹히는 배경 묶음(명세 4.1.4). 배경 · Surface에 더해
 * surface-container 사다리(low · high · highest) — 날짜 선택기 오늘 날짜 · 대화상자 Text 버튼처럼
 * 컨테이너 위에 Primary 글자가 놓이는 자리까지 같은 기준을 채운다.
 */
export function primaryTextAnchors(bg, surface, preset) {
  const c = deriveSurfaceContainers(bg, preset);
  return [bg, surface, c['surface-container-low'], c['surface-container-high'], c['surface-container-highest']];
}

export function containerTextAnchors(bg, surface, preset, secondary, { text, secondaryContainer, primary } = {}) {
  const c = deriveSurfaceContainers(bg, preset);
  const bases = [bg, surface, c['surface-container-low'], c['surface-container-highest']];
  const anchors = bases.flatMap(base => [base, compositeOver(base, secondary, 0.16)]);
  // Lists(명세 4.5.5) — 배경 위 항목에 상태 레이어(on-surface 최대 16%, dragged)가 깔린 자리와,
  // 선택 항목(secondary-container)의 hover · focus · pressed(on-surface 10%)에서 on-surface로 그리는 아이콘 자리.
  if (text) anchors.push(compositeOver(bg, text, 0.16));
  // Tabs(명세 4.4.4) — 배경 위 비활성 탭을 누를 때 primary 상태 레이어(10%)가 깔린 자리의 on-surface 글자.
  if (primary) anchors.push(compositeOver(bg, primary, 0.10));
  if (secondaryContainer) {
    anchors.push(secondaryContainer);
    if (text) anchors.push(compositeOver(secondaryContainer, text, 0.10));
  }
  return anchors;
}

/** 여러 배경 모두에서 목표를 채우는 가장 가까운 명도(가장 불리한 배경 기준). 못 채우면 끝 명도. */
function ensureOnContrastAll(on, anchors, target) {
  const worst = color => Math.min(...anchors.map(anchor => ratio(color, anchor)));
  if (worst(on) >= target) return { color: on, lifted: false };
  const goDarker = toneOf(anchors[0]) > 50;
  const start = Math.round(on.l * 10);
  for (let step = start; goDarker ? step >= 0 : step <= 1000; step += goDarker ? -1 : 1) {
    const candidate = { ...on, l: step / 10 };
    if (worst(candidate) >= target) return { color: candidate, lifted: true };
  }
  return { color: { ...on, l: goDarker ? 0 : 100 }, lifted: true };
}

export function derivePaletteRoles(tokens, preset, textTarget = AA_FLOOR.text, lineTargets = { outline: AA_FLOOR.nonText, outlineVariant: 1 }) {
  const darkScheme = preset === 'dark-saving';
  const toneIndex = darkScheme ? 1 : 0;
  const primary = tokens.accent;
  const roles = {};

  // 1) 토큰이 정본인 역할을 먼저 앉힌다.
  for (const [role, tokenKey] of Object.entries(TOKEN_ROLES)) {
    const token = tokens[tokenKey];
    roles[role] = { h: token.h, s: token.s, l: token.l, source: 'token', family: ROLE_FAMILY[role] };
  }

  // 2) 나머지는 계열 색상·채도 + M3 톤으로 파생한다.
  for (const role of ROLE_ORDER) {
    if (roles[role]) continue;
    const family = ROLE_FAMILY[role];
    const { h, s } = familyColor(family, primary);
    const relative = RELATIVE_TONES[role];
    const targetTone = relative
      ? Math.min(100, Math.max(0, toneOf(tokens[relative.from]) + relative.offset[toneIndex]))
      : ROLE_TONES[role][toneIndex];
    roles[role] = { h, s, l: lightnessForTone(h, s, targetTone), source: relative ? 'text-derived' : 'derived', family };
  }

  // 3) on- 역할은 짝이 되는 배경 위에서 현재 대비 단계의 본문 기준(표준 4.5 · 중간 7 · 높음 11)을 넘겨야 한다.
  for (const [onRole, bgRole] of Object.entries(ON_PAIRS)) {
    if (roles[onRole].source === 'token') continue;
    if (roles[bgRole].source === 'token') {
      const { color, lifted } = ensureOnContrast(roles[onRole], roles[bgRole], textTarget);
      roles[onRole] = { ...roles[onRole], l: color.l, lifted };
      continue;
    }
    // 파생 배경(컨테이너 등)은 on-만으로 모자라면 배경 톤도 옮긴다.
    const pair = ensurePairContrast(roles[onRole], roles[bgRole], textTarget);
    roles[onRole] = { ...roles[onRole], l: pair.on.l, lifted: pair.lifted };
    if (pair.shifted) roles[bgRole] = { ...roles[bgRole], l: pair.background.l, shifted: true };
  }

  // 3-1) on-surface-variant는 surface-variant뿐 아니라 컨테이너 배경 묶음 위 모두에서 기준을 채운다(M3 의도: 모든 surface 계열에서 읽힘).
  const variantAnchors = containerTextAnchors(tokens.bg, tokens.surface, preset, roles.secondary, { text: tokens.text });
  const variant = ensureOnContrastAll(roles['on-surface-variant'], variantAnchors, textTarget);
  if (variant.lifted) roles['on-surface-variant'] = { ...roles['on-surface-variant'], l: variant.color.l, lifted: true };

  // 3-1b) 선 역할도 대비 단계를 따른다(M3 outline ContrastCurve(1.5, 3, 4.5, 7) · outline-variant (1, 1, 3, 4.5) — 비텍스트 단계).
  // 선이 놓이는 배경은 글자로 쓰는 Primary와 같은 묶음(배경 · Surface · surface-container 사다리)이다. 가장 가까운 명도만 옮긴다.
  const lineAnchors = primaryTextAnchors(tokens.bg, tokens.surface, preset);
  for (const [role, target] of [['outline', lineTargets.outline], ['outline-variant', lineTargets.outlineVariant]]) {
    if (!(target > 1)) continue;
    const line = ensureOnContrastAll(roles[role], lineAnchors, target);
    if (line.lifted) roles[role] = { ...roles[role], l: line.color.l, lifted: true };
  }

  // 3-2) add-on 역할(Fixed accent · inverse-primary · scrim). 계열 색상·채도 + M3 톤, 글자 역할은 짝 배경에서 같은 기준을 채운다.
  for (const role of ADDON_ROLE_ORDER) {
    const family = ADDON_FAMILY[role];
    const { h, s } = familyColor(family, primary);
    const tone = ADDON_TONES[role][toneIndex];
    roles[role] = { h, s, l: role === 'scrim' ? 0 : lightnessForTone(h, s, tone), source: 'derived', family };
  }
  for (const [onRole, bgRole] of Object.entries(ADDON_ON_PAIRS)) {
    if (onRole === 'inverse-primary') {
      // inverse-surface는 Text에서 파생된 반전 표면이라 옮기지 않고 글자 쪽만 푼다.
      // 스낵바 동작 버튼(명세 4.7.2)은 inverse-primary 상태 레이어(최대 10%)가 깔린 자리에서도 글자 기준을 채워야 한다.
      // 레이어 색이 글자 색 자체라 몇 번 되풀이해 맞춘다.
      const t = textTarget + 0.05;   // 브라우저의 RGB 반올림 여유
      let current = roles[onRole];
      let anyLift = false;
      for (let pass = 0; pass < 3; pass += 1) {
        const anchors = [roles[bgRole], compositeOver(roles[bgRole], current, 0.10)];
        const { color, lifted } = ensureOnContrastAll(current, anchors, t);
        anyLift = anyLift || lifted;
        current = { ...current, l: color.l };
      }
      roles[onRole] = { ...roles[onRole], l: current.l, lifted: anyLift };
      // 글자가 끝 명도(흰색 · 검정)까지 가도 모자라면(반전 표면이 회색에 가까운 테마) 그때만 반전 표면을 글자에서 멀어지는 쪽으로 옮긴다.
      const worstOf = bg => Math.min(ratio(current, bg), ratio(current, compositeOver(bg, current, 0.10)));
      if (worstOf(roles[bgRole]) < t) {
        const away = toneOf(current) > toneOf(roles[bgRole]) ? -1 : 1;
        let bg = roles[bgRole];
        for (let step = Math.round(bg.l * 10); step >= 0 && step <= 1000; step += away) {
          bg = { ...roles[bgRole], l: step / 10 };
          if (worstOf(bg) >= t) break;
        }
        roles[bgRole] = { ...roles[bgRole], l: bg.l, shifted: true };
      }
      continue;
    }
    const pair = ensurePairContrast(roles[onRole], roles[bgRole], textTarget);
    roles[onRole] = { ...roles[onRole], l: pair.on.l, lifted: pair.lifted };
    if (pair.shifted) roles[bgRole] = { ...roles[bgRole], l: pair.background.l, shifted: true };
  }

  // 4) 실제 톤과 대비를 기록해 화면과 내보내기가 같은 값을 쓰게 한다.
  for (const role of [...ROLE_ORDER, ...ADDON_ROLE_ORDER]) {
    roles[role].tone = Math.round(toneOf(roles[role]) * 10) / 10;
    const pair = ON_PAIRS[role] || ADDON_ON_PAIRS[role];
    if (pair) roles[role].contrast = Math.round(ratio(roles[role], roles[pair]) * 100) / 100;
  }

  return { roles, order: ROLE_ORDER, groups: ROLE_GROUPS };
}


/* ════════════════════════════════════════
   Styles › Color 페이지용 — 톤 팔레트 · Static colors
   ════════════════════════════════════════ */

/**
 * M3 톤 팔레트의 톤 단계. 0~100을 10 간격으로, 여기에 95 · 98 · 99를 더한다.
 * 출처: m3.material.io/styles/color/system/how-the-system-works ("4. The algorithm creates tonal palettes").
 */
export const PALETTE_TONES = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 99, 100];

/** 키 색 다섯 개(Primary · Secondary · Tertiary · Neutral · Neutral variant)와 Error 팔레트. M3 문서의 표기 순서다. */
export const PALETTE_FAMILIES = [
  { key: 'primary', label: 'Primary' },
  { key: 'secondary', label: 'Secondary' },
  { key: 'tertiary', label: 'Tertiary' },
  { key: 'error', label: 'Error' },
  { key: 'neutral', label: 'Neutral' },
  { key: 'neutralVariant', label: 'Neutral variant' },
];

/**
 * Primary 토큰 하나에서 여섯 톤 팔레트를 만든다. 역할 파생(derivePaletteRoles)과 같은 계열 색상·채도를 쓰므로
 * 역할 색은 모두 이 팔레트의 한 톤이다(대비 보정으로 옮겨진 역할만 예외).
 * @returns {{key, label, tones: {tone, color}[]}[]}
 */
export function deriveTonalPalettes(primary) {
  return PALETTE_FAMILIES.map(({ key, label }) => {
    const { h, s } = familyColor(key, primary);
    // 톤 0 · 100은 모든 팔레트에서 검정 · 흰색이다(M3). 탐색 격자(0.1) 오차 없이 끝값을 쓴다.
    const l = tone => (tone === 0 ? 0 : tone === 100 ? 100 : lightnessForTone(h, s, tone));
    return { key, label, tones: PALETTE_TONES.map(tone => ({ tone, color: { h, s, l: l(tone) } })) };
  });
}

/** 두 색상각의 차이(0~180). material-color-utilities mathUtils.differenceDegrees. */
function differenceDegrees(a, b) {
  return 180 - Math.abs(Math.abs(a - b) - 180);
}

/**
 * Static color를 scheme의 Primary 쪽으로 조화시킨다(M3 "Harmonize colors").
 * material-color-utilities Blend.harmonize와 같은 규칙 — 색상각 차이의 절반만큼, 최대 15°까지 Primary 쪽으로 돌린다.
 * 웹 변환: HCT 색상각 대신 HSL 색상각에서 돌린다(명세 3.1 — HCT를 색 조작 모델로 쓰지 않음).
 */
export function harmonizeHue(designHue, sourceHue) {
  const rotation = Math.min(differenceDegrees(designHue, sourceHue) * 0.5, 15);
  const increasing = ((sourceHue - designHue) % 360 + 360) % 360;
  const direction = increasing <= 180 ? 1 : -1;
  return Math.round((((designHue + rotation * direction) % 360) + 360) % 360 * 10) / 10;
}

/**
 * Static color(M3 "Define static colors", 옛 이름 custom colors)의 네 역할.
 * 입력 색에서 색상·채도를 받고, 톤은 강조 계열(Primary)과 같은 배치를 쓴다 — 색 40/80 · on 100/20 · container 90/30 · on-container 30/90.
 * 글자 역할은 짝 배경 위에서 현재 대비 단계의 본문 기준을 채운다(다른 on- 역할과 같은 규칙).
 *
 * @param {{h,s,l}} input 입력 색
 * @param {{h,s,l}} primary 조화 기준(Primary 토큰)
 * @param {'dark-saving'|'light-saving'} preset
 * @param {number} textTarget 본문 대비 목표
 * @param {{harmonize?: boolean}} options
 * @returns {{hue: number, roles: {color, on, container, 'on-container'}}}
 */
export function deriveStaticColorRoles(input, primary, preset, textTarget = AA_FLOOR.text, { harmonize = false } = {}) {
  const toneIndex = preset === 'dark-saving' ? 1 : 0;
  const hue = harmonize ? harmonizeHue(input.h, primary.h) : input.h;
  const s = input.s;
  const tone = role => ROLE_TONES[role][toneIndex];
  const make = role => ({ h: hue, s, l: lightnessForTone(hue, s, tone(role)) });
  const roles = {
    color: make('primary'),
    on: make('on-primary'),
    container: make('primary-container'),
    'on-container': make('on-primary-container'),
  };
  for (const [onRole, bgRole] of [['on', 'color'], ['on-container', 'container']]) {
    const pair = ensurePairContrast(roles[onRole], roles[bgRole], textTarget);
    roles[onRole] = { ...roles[onRole], l: pair.on.l, lifted: pair.lifted };
    if (pair.shifted) roles[bgRole] = { ...roles[bgRole], l: pair.background.l, shifted: true };
  }
  for (const color of Object.values(roles)) color.tone = Math.round(toneOf(color) * 10) / 10;
  roles.on.contrast = Math.round(ratio(roles.on, roles.color) * 100) / 100;
  roles['on-container'].contrast = Math.round(ratio(roles['on-container'], roles.container) * 100) / 100;
  return { hue, roles };
}
