/**
 * bwIndex.js
 * BW Index 트라이리니어 보간 순수 함수 모듈
 * PRD FR-2: 8개 RGB 꼭짓점 실측값 기반 트라이리니어 보간
 */

// 8개 앵커점 실측 BW Index (r, g, b 각각 0 또는 1)
const ANCHORS = {
  V000: 0.00, // Black    (0,0,0)
  V100: 0.05, // Red      (1,0,0)
  V010: 0.25, // Green    (0,1,0)
  V001: 0.49, // Blue     (0,0,1)
  V110: 0.47, // Yellow   (1,1,0)
  V101: 0.72, // Magenta  (1,0,1)
  V011: 0.85, // Cyan     (0,1,1)
  V111: 1.00, // White    (1,1,1)
};

/**
 * 임의의 RGB 색상에 대한 BW Index를 트라이리니어 보간으로 계산
 * @param {number} r - Red   0~255
 * @param {number} g - Green 0~255
 * @param {number} b - Blue  0~255
 * @returns {number} BW Index (0.00 ~ 1.00)
 */
export function calcBwIndex(r, g, b) {
  const rn = r / 255;
  const gn = g / 255;
  const bn = b / 255;

  const { V000, V100, V010, V001, V110, V101, V011, V111 } = ANCHORS;

  return (
    V000 * (1 - rn) * (1 - gn) * (1 - bn) +
    V100 * rn       * (1 - gn) * (1 - bn) +
    V010 * (1 - rn) * gn       * (1 - bn) +
    V001 * (1 - rn) * (1 - gn) * bn       +
    V110 * rn       * gn       * (1 - bn) +
    V101 * rn       * (1 - gn) * bn       +
    V011 * (1 - rn) * gn       * bn       +
    V111 * rn       * gn       * bn
  );
}

/**
 * 8개 앵커점 자기검증 (6.1)
 * @returns {{ passed: boolean, results: Array }}
 */
export function selfValidate() {
  const cases = [
    { label: 'Black',   r: 0,   g: 0,   b: 0,   expected: 0.00 },
    { label: 'Red',     r: 255, g: 0,   b: 0,   expected: 0.05 },
    { label: 'Green',   r: 0,   g: 255, b: 0,   expected: 0.25 },
    { label: 'Blue',    r: 0,   g: 0,   b: 255, expected: 0.49 },
    { label: 'Yellow',  r: 255, g: 255, b: 0,   expected: 0.47 },
    { label: 'Magenta', r: 255, g: 0,   b: 255, expected: 0.72 },
    { label: 'Cyan',    r: 0,   g: 255, b: 255, expected: 0.85 },
    { label: 'White',   r: 255, g: 255, b: 255, expected: 1.00 },
  ];

  const results = cases.map(({ label, r, g, b, expected }) => {
    const actual = calcBwIndex(r, g, b);
    const diff = Math.abs(actual - expected);
    const passed = diff < 1e-9;
    return { label, expected, actual, diff, passed };
  });

  return {
    passed: results.every((r) => r.passed),
    results,
  };
}

