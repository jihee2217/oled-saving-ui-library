/**
 * contrast.js
 * WCAG 2.2 상대 휘도 / 대비비 계산 순수 함수 모듈
 * PRD FR-4
 */

/**
 * sRGB 채널 값(0~255)을 선형 광학 값으로 변환
 * @param {number} c - 0~255
 * @returns {number}
 */
function linearize(c) {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

/**
 * WCAG 상대 휘도 계산
 * @param {number} r - 0~255
 * @param {number} g - 0~255
 * @param {number} b - 0~255
 * @returns {number} 0~1
 */
export function relativeLuminance(r, g, b) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b);
}

/**
 * WCAG 대비비
 * @param {number} L1 - 더 밝은 쪽 상대 휘도
 * @param {number} L2 - 더 어두운 쪽 상대 휘도
 * @returns {number} 대비비 (1:1 ~ 21:1)
 */
export function contrastRatio(L1, L2) {
  const lighter = Math.max(L1, L2);
  const darker  = Math.min(L1, L2);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * 두 색상의 대비비 (RGB 입력)
 * @param {{ r, g, b }} color1
 * @param {{ r, g, b }} color2
 * @returns {number}
 */
export function contrastBetween(color1, color2) {
  const L1 = relativeLuminance(color1.r, color1.g, color1.b);
  const L2 = relativeLuminance(color2.r, color2.g, color2.b);
  return contrastRatio(L1, L2);
}

/**
 * WCAG AA 통과 여부 (일반 텍스트 ≥4.5:1)
 * @param {number} ratio
 * @returns {boolean}
 */
export function passesWCAG_AA(ratio) {
  return ratio >= 4.5;
}

/**
 * WCAG AA 큰 텍스트 통과 여부 (≥3:1)
 * @param {number} ratio
 * @returns {boolean}
 */
export function passesWCAG_AA_Large(ratio) {
  return ratio >= 3.0;
}

/**
 * WCAG 1.4.11 Non-text contrast (≥3:1)
 * @param {number} ratio
 * @returns {boolean}
 */
export function passesNonTextContrast(ratio) {
  return ratio >= 3.0;
}

/** Return the nearest contiguous safe interval, never bridge a failing gap. */
function safeRange(limit, step, current, isSafe) {
  const ranges = [];
  let range = null;
  for (let i = 0; i <= Math.round(limit / step); i++) {
    const value = Number((i * step).toFixed(1));
    if (isSafe(value)) {
      if (!range) { range = { min: value, max: value }; ranges.push(range); }
      range.max = value;
    } else {
      range = null;
    }
  }
  if (!ranges.length) return { min: current, max: current, available: false };
  const distance = r => Math.max(r.min - current, current - r.max, 0);
  ranges.sort((a, b) => distance(a) - distance(b));
  const selected = ranges[0];
  // Preserve full-precision RGB conversions at a sampled boundary.
  if (isSafe(current) && distance(selected) < step) {
    selected.min = Math.min(selected.min, current);
    selected.max = Math.max(selected.max, current);
  }
  return selected;
}

/** HSL lightness range at 0.1 precision; supports one or multiple reference colors. */
export function findLightnessRange(h, s, refColor, minContrast = 4.5, hslToRgb, currentL = 50) {
  const refs = [refColor].flat();
  const range = safeRange(100, 0.1, currentL, l => {
    const rgb = hslToRgb(h, s, l);
    return refs.every(ref => contrastBetween(rgb, ref) >= minContrast);
  });
  return { minL: range.min, maxL: range.max };
}

/** RGB channel range, with the other two channels fixed. */
export function findRgbChannelRange(channel, currentColor, refColor, minContrast = 4.5) {
  const refs = [refColor].flat();
  return safeRange(255, 1, currentColor[channel], value =>
    refs.every(ref => contrastBetween({ ...currentColor, [channel]: value }, ref) >= minContrast)
  );
}

// Choose a readable foreground for any user-selected primary color.
export function onColor(color) {
  const black = { r: 0, g: 0, b: 0 };
  const white = { r: 255, g: 255, b: 255 };
  return contrastBetween(color, black) >= contrastBetween(color, white) ? '#000000' : '#ffffff';
}
