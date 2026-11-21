/**
 * primaryLink.js
 * Primary(accent)를 어두운 모드와 밝은 모드가 함께 쓰게 만드는 순수 계산부.
 *
 * 규칙
 *  1) 색상(H)과 채도(S)는 두 모드가 그대로 공유한다. 브랜드 색은 하나다.
 *  2) 명도(L)는 공유하지 않고, 「고른 모드에서 Primary가 배경에 대해 내던 대비」를
 *     상대 모드의 배경에 대해 다시 만들어 내도록 푼다.
 *
 * 2)를 두는 이유는 명도까지 공유하면 한쪽 모드에서 비텍스트 대비 3:1(WCAG 1.4.11)을
 * 넘기지 못하기 때문이다. 현재 프리셋 값 기준 실측(2026-09-19):
 *   - 어두운 절감형 Primary hsl(10,65%,58%)를 밝은 배경(l 96%)에 그대로 쓰면 3.24:1
 *   - 밝은 절감형 Primary hsl(8,75%,38%)를 어두운 배경(l 4%)에 그대로 쓰면 2.91:1 (미달)
 *   - 색상·채도만 공유하고 명도를 다시 풀면 각각 6.30:1 / 5.48:1
 * 같은 hue·chroma에 scheme별로 다른 tone을 쓰는 Material 3의 방식과 같은 구조다.
 */

import { contrastBetween } from './contrast.js';
import { hslToRgb } from './colorModel.js';
import { AA_FLOOR, solveLightness } from './gate.js';

/** 두 HSL 색의 대비비. */
export function ratioBetweenHsl(a, b) {
  return contrastBetween(hslToRgb(a.h, a.s, a.l), hslToRgb(b.h, b.s, b.l));
}

/**
 * 상대 모드에서 Primary가 놓일 쪽. 배경이 밝으면 어두운 쪽, 어두우면 밝은 쪽이다.
 * 두 절감형 프리셋 모두 Primary가 배경 극단에서 가운데로 들어오는 구조다.
 */
function sideForBackground(bg) {
  return bg.l >= 50 ? 'darker' : 'lighter';
}

/**
 * 한 모드에서 고른 Primary를 상대 모드로 옮긴다.
 *
 * @param {{h,s,l}} sourceAccent 사용자가 고른 Primary
 * @param {{h,s,l}} sourceBg     그 모드의 배경
 * @param {{h,s,l}} targetBg     상대 모드의 배경
 * @param {{h,s,l}} [fallback]   해가 없을 때 쓸 상대 모드의 기존 Primary
 * @returns {{accent:{h,s,l}, target:number, matched:boolean}}
 *   matched=false면 상대 모드 배경으로는 같은 대비를 낼 수 없어 기존 명도를 남겼다는 뜻이다.
 */
export function linkedAccent(sourceAccent, sourceBg, targetBg, fallback = null) {
  const hue = { h: sourceAccent.h, s: sourceAccent.s };
  // 상대 모드에서도 최소한 비텍스트 하한은 지킨다.
  const target = Math.max(ratioBetweenHsl(sourceAccent, sourceBg), AA_FLOOR.nonText);

  const preferred = sideForBackground(targetBg);
  const other = preferred === 'darker' ? 'lighter' : 'darker';
  for (const side of [preferred, other]) {
    const l = solveLightness({ ...hue, l: targetBg.l }, [targetBg], target, side);
    if (l !== null) return { accent: { ...hue, l }, target, matched: true };
  }

  const keptL = fallback ? fallback.l : sourceAccent.l;
  return { accent: { ...hue, l: keptL }, target, matched: false };
}
