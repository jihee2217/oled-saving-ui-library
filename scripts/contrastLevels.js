/**
 * contrastLevels.js
 * 게이트의 대비 목표 3단계. 기본은 WCAG 2.2 AA(본문 4.5:1 · 비텍스트 3:1)다.
 *
 * WCAG · M3 · Apple이 기본 준수 목표로 제시하는 값은 AA의 4.5:1이다(조항 이름 "Contrast (Minimum)").
 * 7:1은 AAA("Contrast (Enhanced)")다. M3 기본 색 구성은 본문을 이보다 훨씬 높게(톤 10 / 98 ≈ 16:1) 만든다.
 *
 * material-color-utilities ContrastCurve와의 대응(네 인자 = 대비 수준 -1 / 0 / 0.5 / 1):
 *   - on-surface(본문)   : ContrastCurve(4.5, 7, 11, 21) → 본문 4.5 · 7 · 11은 M3 수준 -1 · 0 · 0.5
 *   - outline(비텍스트)  : ContrastCurve(1.5, 3, 4.5, 7)  → 비텍스트 3 · 4.5 · 7은 M3 수준 0 · 0.5 · 1
 * 즉 본문은 M3보다 한 단계 낮은 곡선 값, 비텍스트는 M3와 같은 단계다(명세 · 기준서 MD3-04, 2026-09-27 정정).
 */

// standard는 저장 형식 호환을 위한 내부 키다. 화면 이름은 '기본'(WCAG AA)이다. '권장'이라 부르지 않는다.
// outline · outlineVariant: 선 역할의 목표. MCU outline ContrastCurve(1.5, 3, 4.5, 7) · outline-variant (1, 1, 3, 4.5)를
// 비텍스트 단계(m3NonTextLevel 0 / 0.5 / 1)에서 읽은 값이다. outline-variant 1은 요구 없음(장식선, M3 Color roles).
export const CONTRAST_LEVELS = {
  standard: { label: '기본', wcag: 'AA',  m3TextLevel: -1,  m3NonTextLevel: 0,   text: 4.5,  nonText: 3.0, outline: 3.0, outlineVariant: 1.0 },
  medium:   { label: '중간', wcag: 'AAA', m3TextLevel: 0,   m3NonTextLevel: 0.5, text: 7.0,  nonText: 4.5, outline: 4.5, outlineVariant: 3.0 },
  high:     { label: '높음', wcag: 'AAA', m3TextLevel: 0.5, m3NonTextLevel: 1,   text: 11.0, nonText: 7.0, outline: 7.0, outlineVariant: 4.5 },
};

export const DEFAULT_CONTRAST_LEVEL = 'standard';

/** 알 수 없는 값이 들어와도 기본(AA)으로 안전하게 되돌린다. */
export function contrastTargets(level) {
  return CONTRAST_LEVELS[level] || CONTRAST_LEVELS[DEFAULT_CONTRAST_LEVEL];
}

/**
 * 현재 대비가 선택한 단계의 본문 기준 대비 몇 배인지.
 * 기준서 CON-5: 표준에는 대비 상한이 없으므로 "여유분"을 숫자로 드러낸다.
 */
export function contrastHeadroom(ratio, level) {
  return ratio / contrastTargets(level).text;
}
