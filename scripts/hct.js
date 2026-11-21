/**
 * hct.js
 * Material Design 3의 HCT(Hue, Chroma, Tone) 값을 "읽기 전용"으로 계산한다.
 *
 * 기준서 MD3-03 결정: 본 라이브러리는 HCT를 색 조작 모델로 채택하지 않는다.
 * BW Index 트라이리니어 보간의 정의역이 sRGB 큐브이고, WCAG 상대 휘도 정의도
 * sRGB 전제이기 때문이다. 다만 Material 문서와 값을 대조할 수 있어야 하므로
 * 현재 색의 HCT 좌표를 표시만 한다. 여기서 나온 값으로 색을 되돌려 만들지 않는다.
 *
 * 알고리즘: CAM16(hue, chroma) + CIE L*(tone).
 * 참조 구현: material-color-utilities의 Cam16 / ViewingConditions 기본값.
 */

/** sRGB 8비트 채널 → 선형 값(0~100). */
function hctLinearized(channel8) {
  const normalized = channel8 / 255;
  const linear = normalized <= 0.040449936
    ? normalized / 12.92
    : Math.pow((normalized + 0.055) / 1.055, 2.4);
  return linear * 100;
}

/** sRGB(0~255) → CIE XYZ (D65, 0~100 스케일). */
export function hctXyzFromRgb(r, g, b) {
  const lr = hctLinearized(r);
  const lg = hctLinearized(g);
  const lb = hctLinearized(b);
  return [
    0.41233895 * lr + 0.35762064 * lg + 0.18051042 * lb,
    0.2126     * lr + 0.7152     * lg + 0.0722     * lb,
    0.01932141 * lr + 0.11916382 * lg + 0.95034478 * lb,
  ];
}

/** XYZ의 Y → CIE L*. HCT의 Tone이 바로 이 값이다. */
export function toneFromY(y) {
  const yNormalized = y / 100;
  const epsilon = 216 / 24389;
  return yNormalized <= epsilon
    ? yNormalized * (24389 / 27)
    : 116 * Math.cbrt(yNormalized) - 16;
}

/** L* → XYZ의 Y. 시야 조건 계산에 쓰인다. */
function hctYFromTone(tone) {
  const ft = (tone + 16) / 116;
  const ft3 = ft * ft * ft;
  const epsilon = 216 / 24389;
  const y = ft3 > epsilon ? ft3 : tone / (24389 / 27);
  return y * 100;
}

function hctLerp(start, stop, amount) {
  return (1 - amount) * start + amount * stop;
}

/** CAM16 기본 시야 조건(material-color-utilities ViewingConditions.DEFAULT와 동일). */
function hctMakeViewingConditions() {
  const whitePoint = [95.047, 100.0, 108.883];
  const adaptingLuminance = (200 / Math.PI) * hctYFromTone(50) / 100;
  const backgroundTone = 50;
  const surround = 2;

  const rW = whitePoint[0] *  0.401288 + whitePoint[1] * 0.650173 + whitePoint[2] * -0.051461;
  const gW = whitePoint[0] * -0.250268 + whitePoint[1] * 1.204414 + whitePoint[2] *  0.045854;
  const bW = whitePoint[0] * -0.002079 + whitePoint[1] * 0.048952 + whitePoint[2] *  0.953127;

  const f = 0.8 + surround / 10;
  const c = f >= 0.9
    ? hctLerp(0.59, 0.69, (f - 0.9) * 10)
    : hctLerp(0.525, 0.59, (f - 0.8) * 10);

  let d = f * (1 - (1 / 3.6) * Math.exp((-adaptingLuminance - 42) / 92));
  d = Math.min(1, Math.max(0, d));

  const rgbD = [
    d * (100 / rW) + 1 - d,
    d * (100 / gW) + 1 - d,
    d * (100 / bW) + 1 - d,
  ];

  const k = 1 / (5 * adaptingLuminance + 1);
  const k4 = k * k * k * k;
  const k4F = 1 - k4;
  const fl = k4 * adaptingLuminance + 0.1 * k4F * k4F * Math.cbrt(5 * adaptingLuminance);

  const n = hctYFromTone(backgroundTone) / whitePoint[1];
  const z = 1.48 + Math.sqrt(n);
  const nbb = 0.725 / Math.pow(n, 0.2);

  const rgbAFactors = [
    Math.pow(fl * rgbD[0] * rW / 100, 0.42),
    Math.pow(fl * rgbD[1] * gW / 100, 0.42),
    Math.pow(fl * rgbD[2] * bW / 100, 0.42),
  ];
  const rgbA = rgbAFactors.map(factor => 400 * factor / (factor + 27.13));
  const aw = (2 * rgbA[0] + rgbA[1] + 0.05 * rgbA[2]) * nbb;

  return { n, aw, nbb, ncb: nbb, c, nc: f, rgbD, fl, z };
}

const HCT_VIEWING_CONDITIONS = hctMakeViewingConditions();

function hctSignum(value) {
  return value < 0 ? -1 : value > 0 ? 1 : 0;
}

/**
 * sRGB(0~255) → HCT.
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @returns {{ h: number, c: number, t: number }} h 0~360, c 0~약120, t 0~100
 */
export function hctFromRgb(r, g, b) {
  const [x, y, z] = hctXyzFromRgb(r, g, b);
  const vc = HCT_VIEWING_CONDITIONS;

  const rC =  0.401288 * x + 0.650173 * y - 0.051461 * z;
  const gC = -0.250268 * x + 1.204414 * y + 0.045854 * z;
  const bC = -0.002079 * x + 0.048952 * y + 0.953127 * z;

  const rD = vc.rgbD[0] * rC;
  const gD = vc.rgbD[1] * gC;
  const bD = vc.rgbD[2] * bC;

  const rAF = Math.pow(vc.fl * Math.abs(rD) / 100, 0.42);
  const gAF = Math.pow(vc.fl * Math.abs(gD) / 100, 0.42);
  const bAF = Math.pow(vc.fl * Math.abs(bD) / 100, 0.42);

  const rA = hctSignum(rD) * 400 * rAF / (rAF + 27.13);
  const gA = hctSignum(gD) * 400 * gAF / (gAF + 27.13);
  const bA = hctSignum(bD) * 400 * bAF / (bAF + 27.13);

  const a = (11 * rA - 12 * gA + bA) / 11;
  const b2 = (rA + gA - 2 * bA) / 9;
  const u = (20 * rA + 20 * gA + 21 * bA) / 20;
  const p2 = (40 * rA + 20 * gA + bA) / 20;

  const atanDegrees = Math.atan2(b2, a) * 180 / Math.PI;
  const hue = atanDegrees < 0 ? atanDegrees + 360
            : atanDegrees >= 360 ? atanDegrees - 360
            : atanDegrees;

  const ac = p2 * vc.nbb;
  const j = 100 * Math.pow(ac / vc.aw, vc.c * vc.z);

  const huePrime = hue < 20.14 ? hue + 360 : hue;
  const eHue = 0.25 * (Math.cos(huePrime * Math.PI / 180 + 2) + 3.8);
  const p1 = (50000 / 13) * eHue * vc.nc * vc.ncb;
  const t = p1 * Math.sqrt(a * a + b2 * b2) / (u + 0.305);
  const alpha = Math.pow(t, 0.9) * Math.pow(1.64 - Math.pow(0.29, vc.n), 0.73);
  const chroma = alpha * Math.sqrt(j / 100);

  return { h: hue, c: chroma, t: toneFromY(y) };
}

/** 표시용 문자열. 예: "H 258 · C 48 · T 40" */
export function formatHct(hct) {
  return `H ${Math.round(hct.h)} · C ${Math.round(hct.c)} · T ${Math.round(hct.t)}`;
}
