/**
 * colorModel.js
 * HSL ↔ RGB 변환 + WCAG 캡 계산 헬퍼
 * PRD FR-1-1, FR-4
 */

/**
 * HSL → RGB
 * @param {number} h - 0~360
 * @param {number} s - 0~100
 * @param {number} l - 0~100
 * @returns {{ r: number, g: number, b: number }} 0~255
 */
export function hslToRgb(h, s, l) {
  const sn = s / 100;
  const ln = l / 100;
  const c  = (1 - Math.abs(2 * ln - 1)) * sn;
  const x  = c * (1 - Math.abs((h / 60) % 2 - 1));
  const m  = ln - c / 2;

  let r = 0, g = 0, b = 0;
  if      (h < 60)  { r = c; g = x; b = 0; }
  else if (h < 120) { r = x; g = c; b = 0; }
  else if (h < 180) { r = 0; g = c; b = x; }
  else if (h < 240) { r = 0; g = x; b = c; }
  else if (h < 300) { r = x; g = 0; b = c; }
  else              { r = c; g = 0; b = x; }

  return {
    r: Math.max(0, Math.min(255, Math.round((r + m) * 255))),
    g: Math.max(0, Math.min(255, Math.round((g + m) * 255))),
    b: Math.max(0, Math.min(255, Math.round((b + m) * 255))),
  };
}

/**
 * RGB → HSL
 * @param {number} r - 0~255
 * @param {number} g - 0~255
 * @param {number} b - 0~255
 * @returns {{ h: number, s: number, l: number }}
 */
export function rgbToHsl(r, g, b) {
  const rn = r / 255, gn = g / 255, bn = b / 255;
  const max = Math.max(rn, gn, bn);
  const min = Math.min(rn, gn, bn);
  const delta = max - min;
  const l = (max + min) / 2;

  let h = 0, s = 0;
  if (delta !== 0) {
    s = delta / (1 - Math.abs(2 * l - 1));
    if      (max === rn) h = ((gn - bn) / delta) % 6;
    else if (max === gn) h = (bn - rn) / delta + 2;
    else                 h = (rn - gn) / delta + 4;
    h = h * 60;
    if (h < 0) h += 360;
  }

  return {
    h: h,
    s: s * 100,
    l: l * 100,
  };
}

/**
 * HEX → RGB
 * @param {string} hex - '#RRGGBB' 또는 '#RGB'
 * @returns {{ r: number, g: number, b: number }}
 */
export function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  const expanded = clean.length === 3
    ? clean.split('').map(c => c + c).join('')
    : clean;
  const num = parseInt(expanded, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8)  & 255,
    b:  num        & 255,
  };
}

/**
 * RGB → HEX
 * @param {number} r - 0~255
 * @param {number} g - 0~255
 * @param {number} b - 0~255
 * @returns {string} '#RRGGBB'
 */
export function rgbToHex(r, g, b) {
  return '#' + [r, g, b].map(v => v.toString(16).padStart(2, '0')).join('');
}

/**
 * HSL 색상 문자열 반환
 * @param {number} h
 * @param {number} s
 * @param {number} l
 * @returns {string}
 */
export function toHslString(h, s, l) {
  return `hsl(${h}, ${s}%, ${l}%)`;
}
