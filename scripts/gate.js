/**
 * gate.js
 * 대비 게이트의 순수 계산부. DOM을 건드리지 않으므로 단독으로 검증할 수 있고,
 * 「지금 적용」과 「세 단계 미리보기」가 정확히 같은 로직을 쓴다.
 *
 * 두 가지 개념이 있다.
 *
 * 1) 의도값(intent)과 적용값의 분리
 *    사용자가 슬라이더로 고른 명도가 의도값이고, 거기에 제약을 건 결과가 적용값이다.
 *    의도값을 따로 들고 있어야 수준을 되돌렸을 때 원래 고른 색으로 돌아온다.
 *
 * 2) 목표(target)와 하한(floor)의 분리
 *    대비 수준은 **본문 명도를 그 수준의 목표 대비에 정확히 맞추는** 기준이다(파생 토큰).
 *    배경·표면·Primary는 디자이너가 고른 값을 유지하며(앵커 토큰), WCAG AA 하한을
 *    위반할 때만 최소한으로 움직인다.
 *
 * 앵커를 이렇게 잡은 근거(2026-09-19 실측, 어두운 절감형):
 *    - 배경을 Primary 기준에 맞춰 움직이면 표준 단계에서 배경 BW가 0.032 → 0.216으로
 *      뛰고(약 6.8배), 높음 단계는 해가 아예 없다. 배경은 화면 면적 대부분이므로
 *      절감 기준선이 무너진다.
 *    - 배경·표면·Primary를 고정하고 본문만 움직이면 본문 BW가 0.498 → 0.640 → 0.815로
 *      단조 변하고 배경 BW는 0.032로 유지된다. 비용이 면적 작은 토큰에 모인다.
 */

import { findLightnessRange, contrastBetween } from './contrast.js';
import { hslToRgb } from './colorModel.js';

/**
 * 토큰별 대비 게이트 정의.
 * refs = 대비를 재는 상대 토큰, kind = 적용할 기준(본문 텍스트 / 비텍스트).
 */
export const GATE_REFS = {
  bg:      { refs: ['text'],          kind: 'text' },
  surface: { refs: ['text'],          kind: 'text' },
  text:    { refs: ['bg', 'surface'], kind: 'text' },
  accent:  { refs: ['bg'],            kind: 'nonText' }, // WCAG 1.4.11 비텍스트 대비
};

export const TOKEN_ORDER = Object.keys(GATE_REFS);

/** 대비 수준과 무관하게 절대 내려갈 수 없는 WCAG AA 하한. */
export const AA_FLOOR = { text: 4.5, nonText: 3.0 };

/** 대비 수준이 움직이는 토큰. 나머지는 디자이너가 고른 값을 지킨다. */
export const DERIVED_TOKENS = ['text'];
export const ANCHOR_TOKENS = TOKEN_ORDER.filter(key => !DERIVED_TOKENS.includes(key));

function ratioBetween(a, b) {
  return contrastBetween(hslToRgb(a.h, a.s, a.l), hslToRgb(b.h, b.s, b.l));
}

/**
 * 여러 기준색 모두에 대해 목표 대비를 만족하는 명도 중 가장 덜 극단적인 값.
 * 「목표에 딱 붙는 값」이며, 필요 이상으로 대비를 올리지 않는다(기준서 CON-5).
 * @param {'lighter'|'darker'} side 기준색보다 밝은 쪽/어두운 쪽 중 어디서 찾을지
 * @returns {number|null} 해가 없으면 null
 */
export function solveLightness(moving, anchors, target, side) {
  const candidates = [];
  for (let step = 0; step <= 1000; step += 1) {
    const l = step / 10;
    const candidate = { ...moving, l };
    if (anchors.every(anchor => ratioBetween(candidate, anchor) >= target)) candidates.push(l);
  }
  if (!candidates.length) return null;
  return side === 'lighter' ? Math.min(...candidates) : Math.max(...candidates);
}

/**
 * 토큰별 하한을 걸어 적용값을 구한다. 입력을 변경하지 않는다.
 * @param {object} tokens { bg|surface|text|accent: {h,s,l} }
 * @param {object} floors 토큰별 최소 대비비 { bg, surface, text, accent }
 */
export function projectPalette(tokens, floors) {
  const result = {};
  for (const key of TOKEN_ORDER) result[key] = { ...tokens[key] };

  const ranges = {};
  const adjustments = [];

  // 순서가 있다: 앞선 토큰의 적용값이 뒤 토큰의 기준이 된다.
  for (const key of TOKEN_ORDER) {
    const token = result[key];
    const refRgb = GATE_REFS[key].refs.map(refKey => {
      const ref = result[refKey];
      return hslToRgb(ref.h, ref.s, ref.l);
    });

    const { minL, maxL } = findLightnessRange(
      token.h, token.s, refRgb, floors[key], hslToRgb, token.l,
    );
    ranges[key] = { minL, maxL };

    if (token.l < minL) {
      adjustments.push({ key, from: token.l, to: minL });
      token.l = minL;
    } else if (token.l > maxL) {
      adjustments.push({ key, from: token.l, to: maxL });
      token.l = maxL;
    }
  }

  return { tokens: result, ranges, adjustments };
}

/** 선택한 대비 수준에서 각 토큰에 걸 하한. Primary는 언제나 AA 하한만 적용한다. */
export function floorsForLevel(level) {
  return {
    bg: level.text,
    surface: level.text,
    text: level.text,
    accent: AA_FLOOR.nonText,
  };
}

/**
 * 대비 수준을 「목표」로 해석해 팔레트를 만든다.
 * 본문은 그 수준의 목표 대비에 정확히 맞추고, 나머지는 하한만 지킨다.
 *
 * @returns {{tokens, ranges, adjustments, warnings, solved}}
 *   warnings: Primary처럼 고정 토큰이 그 수준의 상향 목표에 못 미칠 때의 안내
 */
export function derivePalette(intentTokens, level) {
  const base = {};
  for (const key of TOKEN_ORDER) base[key] = { ...intentTokens[key] };

  // 1) 본문을 목표 대비에 맞춘다. 밝기 극성(밝은 글자 / 어두운 글자)은 유지한다.
  const side = base.text.l >= base.bg.l ? 'lighter' : 'darker';
  const solved = solveLightness(base.text, [base.bg, base.surface], level.text, side);
  if (solved !== null) base.text = { ...base.text, l: solved };

  // 2) 나머지 토큰에 하한을 걸어 안전망을 친다. 보통 아무것도 움직이지 않는다.
  const projected = projectPalette(base, floorsForLevel(level));

  // 3) 고정 토큰이 이 수준의 상향 목표에 못 미치면 색을 바꾸지 않고 알린다.
  //    Primary는 브랜드 색이므로 도구가 임의로 옮기지 않는다(WCAG AA 3:1은 이미 보장됨).
  const warnings = [];
  const accentRatio = ratioBetween(projected.tokens.accent, projected.tokens.bg);
  if (accentRatio < level.nonText - 0.05) {
    warnings.push({ key: 'accent', ratio: accentRatio, target: level.nonText });
  }

  const adjustments = TOKEN_ORDER
    .filter(key => Math.abs(projected.tokens[key].l - intentTokens[key].l) > 0.05)
    .map(key => ({ key, from: intentTokens[key].l, to: projected.tokens[key].l }));

  return { ...projected, adjustments, warnings, solved: solved !== null };
}
