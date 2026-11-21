/**
 * saving.js
 * 컴포넌트군별 「Saving UI」 항목 — 그 모드에서 가장 덜 밝게 켜지는 추천 세트 하나를 보여 준다(2026-10-04 시안).
 *
 * 변형마다 뱃지를 붙이거나 M3 기본과 비교하지 않고, 「이 조합이 가장 알맞다」는 세트 하나와 하위 컴포넌트별 규칙을
 * 페이지 맨 아래 별도 상자에 둔다. 모드(어두운/밝은)는 계산기를 따른다 — 밝기 극성에 따라 유리한 조합이 뒤집힌다(명세 1장).
 *
 * BW 계산(면적 가중): 장면 = 배경 + 요소들. 요소마다 둥근 사각형 면적을 채움 · 테두리 고리 · 글자 잉크로 나눠
 * 각 면적 × BW(calcBwIndex)를 더하고 장면 면적으로 나눈다. 글자 잉크는 글자 상자의 일정 비율(INK_COVERAGE)로
 * 근사하고, 그림자는 넣지 않는다. 스크린샷 픽셀 평균과의 차이는 명세에 기록한다.
 */

import { calcBwIndex } from './bwIndex.js';

/** 글자 상자 중 실제로 칠해지는 비율(한글 · 영문 label 크기 근사). */
export const INK_COVERAGE = 0.18;
/** 아이콘 상자 중 칠해지는 비율(Material Symbols 24 근사). */
export const ICON_COVERAGE = 0.3;

/** 모서리 반경 r인 w×h 둥근 사각형의 면적. r은 짧은 변의 절반을 넘지 않는다. */
export function roundedRectArea(w, h, r = 0) {
  const rr = Math.max(0, Math.min(r, w / 2, h / 2));
  return w * h - (4 - Math.PI) * rr * rr;
}

/** CSS 계산 색(rgb() · rgba() · color(srgb …)) → {r,g,b,a}(0~255, a 0~1). 못 읽으면 null. */
export function parseCssColor(text) {
  if (!text) return null;
  const s = String(text).trim();
  let m = s.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1], g: +m[2], b: +m[3], a };
  }
  m = s.match(/^color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)(?:\s*\/\s*([\d.]+%?))?\s*\)$/);
  if (m) {
    const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
    return { r: +m[1] * 255, g: +m[2] * 255, b: +m[3] * 255, a };
  }
  return null;
}

/** 반투명 색을 바탕 위에 합성한다. */
export function over(color, base) {
  if (!color) return base;
  const a = color.a ?? 1;
  return { r: color.r * a + base.r * (1 - a), g: color.g * a + base.g * (1 - a), b: color.b * a + base.b * (1 - a), a: 1 };
}

const bw = c => calcBwIndex(c.r, c.g, c.b);

/**
 * 장면의 면적 가중 BW Index.
 * @param {{width:number,height:number,bg:{r,g,b}}} scene
 * @param {Array<{w,h,radius,fill,border,borderWidth,ink,inkArea}>} parts 색은 {r,g,b,a}
 */
export function sceneBw(scene, parts) {
  const total = scene.width * scene.height;
  if (!total) return 0;
  let covered = 0;
  let sum = 0;
  for (const p of parts) {
    const outer = roundedRectArea(p.w, p.h, p.radius);
    const bwWidth = p.border && (p.border.a ?? 1) > 0 ? p.borderWidth || 0 : 0;
    const inner = bwWidth ? roundedRectArea(Math.max(0, p.w - 2 * bwWidth), Math.max(0, p.h - 2 * bwWidth), Math.max(0, p.radius - bwWidth)) : outer;
    const fill = over(p.fill, scene.bg);
    const ink = Math.min(inner, p.inkArea || 0);
    sum += (outer - inner) * bw(over(p.border, scene.bg));
    sum += (inner - ink) * bw(fill);
    if (ink) sum += ink * bw(over(p.ink, fill));
    covered += outer;
  }
  sum += Math.max(0, total - covered) * bw(scene.bg);
  return sum / total;
}

/** 두 BW의 변화율(%). 기준이 0이면 0. */
export function bwChange(base, next) {
  return base ? ((next - base) / base) * 100 : 0;
}

/** 장면에 쓰는 Material Symbols 경로(viewBox 0 -960 960 960). */
export const SAVING_ICONS = {
  bold: 'M272-200v-560h221q65 0 120 40t55 111q0 51-23 78.5T602-491q25 11 55.5 41t30.5 90q0 89-65 124.5T501-200H272Zm121-112h104q48 0 58.5-24.5T566-372q0-11-10.5-35.5T494-432H393v120Zm0-228h93q33 0 48-17t15-38q0-24-17-39t-44-15h-95v109Z',
  italic: 'M200-200v-100h160l120-360H320v-100h400v100H580L460-300h140v100H200Z',
  link: 'M440-280H280q-83 0-141.5-58.5T80-480q0-83 58.5-141.5T280-680h160v80H280q-50 0-85 35t-35 85q0 50 35 85t85 35h160v80ZM320-440v-80h320v80H320Zm200 160v-80h160q50 0 85-35t35-85q0-50-35-85t-85-35H520v-80h160q83 0 141.5 58.5T880-480q0 83-58.5 141.5T680-280H520Z',
  more: 'M480-344 240-584l56-56 184 184 184-184 56 56-240 240Z',
  back: 'm313-440 224 224-57 56-320-320 320-320 57 56-224 224h487v80H313Z',
  search: 'M784-120 532-372q-30 24-69 38t-83 14q-109 0-184.5-75.5T120-580q0-109 75.5-184.5T380-840q109 0 184.5 75.5T640-580q0 44-14 83t-38 69l252 252-56 56ZM380-400q75 0 127.5-52.5T560-580q0-75-52.5-127.5T380-760q-75 0-127.5 52.5T200-580q0 75 52.5 127.5T380-400Z',
  image: 'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z',
  check: 'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z',
  sort: 'M120-240v-80h240v80H120Zm0-200v-80h480v80H120Zm0-200v-80h720v80H120Z',
  volume: 'M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320ZM400-606l-86 86H200v80h114l86 86v-252ZM300-480Z',
  home: 'M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z',
  mail: 'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z',
  chat: 'M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z',
  edit: 'M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z',
};

/**
 * 채움(FILL 1) 글리프 — Saving UI 장면에 쓰이는 아이콘 중 채움 모양이 다른 것만(나머지는 두 모양이 같다).
 * 키 = Outlined 경로(FILL 0), 값 = 같은 아이콘의 FILL 1 경로. 출처: google/material-design-icons
 * symbols/web/{name}/materialsymbolsoutlined/{name}(_fill1)_24px.svg (Apache-2.0), 2026-10-17 받음.
 */
export const FILLED_ICON_PATHS = {
  // bookmark
  'M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Zm80-122 200-86 200 86v-518H280v518Zm0-518h400-400Z':
    'M200-120v-640q0-33 23.5-56.5T280-840h400q33 0 56.5 23.5T760-760v640L480-240 200-120Z',
  // calendar_today
  'M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z':
    'M200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Z',
  // chat
  'M240-400h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80ZM80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm126-240h594v-480H160v525l46-45Zm-46 0v-480 480Z':
    'M80-80v-720q0-33 23.5-56.5T160-880h640q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H240L80-80Zm160-320h320v-80H240v80Zm0-120h480v-80H240v80Zm0-120h480v-80H240v80Z',
  // edit
  'M200-200h57l391-391-57-57-391 391v57Zm-80 80v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm640-584-56-56 56 56Zm-141 85-28-29 57 57-29-28Z':
    'M120-120v-170l528-527q12-11 26.5-17t30.5-6q16 0 31 6t26 18l55 56q12 11 17.5 26t5.5 30q0 16-5.5 30.5T817-647L290-120H120Zm584-528 56-56-56-56-56 56 56 56Z',
  // favorite
  'm480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Zm0-108q96-86 158-147.5t98-107q36-45.5 50-81t14-70.5q0-60-40-100t-100-40q-47 0-87 26.5T518-680h-76q-15-41-55-67.5T300-774q-60 0-100 40t-40 100q0 35 14 70.5t50 81q36 45.5 98 107T480-228Zm0-273Z':
    'm480-120-58-52q-101-91-167-157T150-447.5Q111-500 95.5-544T80-634q0-94 63-157t157-63q52 0 99 22t81 62q34-40 81-62t99-22q94 0 157 63t63 157q0 46-15.5 90T810-447.5Q771-395 705-329T538-172l-58 52Z',
  // home
  'M240-200h120v-240h240v240h120v-360L480-740 240-560v360Zm-80 80v-480l320-240 320 240v480H520v-240h-80v240H160Zm320-350Z':
    'M160-120v-480l320-240 320 240v480H560v-280H400v280H160Z',
  // image
  'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z':
    'M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm40-160h480L570-480 450-320l-90-120-120 160Z',
  // info
  'M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-80q134 0 227-93t93-227q0-134-93-227t-227-93q-134 0-227 93t-93 227q0 134 93 227t227 93Zm0-320Z':
    'M440-280h80v-240h-80v240Zm40-320q17 0 28.5-11.5T520-640q0-17-11.5-28.5T480-680q-17 0-28.5 11.5T440-640q0 17 11.5 28.5T480-600Zm0 520q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z',
  // keyboard
  'M160-200q-33 0-56.5-23.5T80-280v-400q0-33 23.5-56.5T160-760h640q33 0 56.5 23.5T880-680v400q0 33-23.5 56.5T800-200H160Zm0-80h640v-400H160v400Zm160-40h320v-80H320v80ZM200-440h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80ZM200-560h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80ZM160-280v-400 400Z':
    'M160-200q-33 0-56.5-23.5T80-280v-400q0-33 23.5-56.5T160-760h640q33 0 56.5 23.5T880-680v400q0 33-23.5 56.5T800-200H160Zm160-120h320v-80H320v80ZM200-440h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80ZM200-560h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Zm120 0h80v-80h-80v80Z',
  // mail
  'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280L160-640v400h640v-400L480-440Zm0-80 320-200H160l320 200ZM160-640v-80 480-400Z':
    'M160-160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800h640q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160Zm320-280 320-200v-80L480-520 160-720v80l320 200Z',
  // mic
  'M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm0-240Zm-40 520v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Zm40-360q17 0 28.5-11.5T520-520v-240q0-17-11.5-28.5T480-800q-17 0-28.5 11.5T440-760v240q0 17 11.5 28.5T480-480Z':
    'M480-400q-50 0-85-35t-35-85v-240q0-50 35-85t85-35q50 0 85 35t35 85v240q0 50-35 85t-85 35Zm-40 280v-123q-104-14-172-93t-68-184h80q0 83 58.5 141.5T480-320q83 0 141.5-58.5T680-520h80q0 105-68 184t-172 93v123h-80Z',
  // print
  'M640-640v-120H320v120h-80v-200h480v200h-80Zm-480 80h640-640Zm560 100q17 0 28.5-11.5T760-500q0-17-11.5-28.5T720-540q-17 0-28.5 11.5T680-500q0 17 11.5 28.5T720-460Zm-80 260v-160H320v160h320Zm80 80H240v-160H80v-240q0-51 35-85.5t85-34.5h560q51 0 85.5 34.5T880-520v240H720v160Zm80-240v-160q0-17-11.5-28.5T760-560H200q-17 0-28.5 11.5T160-520v160h80v-80h480v80h80Z':
    'M720-680H240v-160h480v160Zm0 220q17 0 28.5-11.5T760-500q0-17-11.5-28.5T720-540q-17 0-28.5 11.5T680-500q0 17 11.5 28.5T720-460Zm-80 260v-160H320v160h320Zm80 80H240v-160H80v-240q0-51 35-85.5t85-34.5h560q51 0 85.5 34.5T880-520v240H720v160Z',
  // schedule
  'm612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Zm0-400Zm0 320q133 0 226.5-93.5T800-480q0-133-93.5-226.5T480-800q-133 0-226.5 93.5T160-480q0 133 93.5 226.5T480-160Z':
    'm612-292 56-56-148-148v-184h-80v216l172 172ZM480-80q-83 0-156-31.5T197-197q-54-54-85.5-127T80-480q0-83 31.5-156T197-763q54-54 127-85.5T480-880q83 0 156 31.5T763-763q54 54 85.5 127T880-480q0 83-31.5 156T763-197q-54 54-127 85.5T480-80Z',
  // share
  'M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Zm0-640q17 0 28.5-11.5T760-760q0-17-11.5-28.5T720-800q-17 0-28.5 11.5T680-760q0 17 11.5 28.5T720-720ZM240-440q17 0 28.5-11.5T280-480q0-17-11.5-28.5T240-520q-17 0-28.5 11.5T200-480q0 17 11.5 28.5T240-440Zm480 280q17 0 28.5-11.5T760-200q0-17-11.5-28.5T720-240q-17 0-28.5 11.5T680-200q0 17 11.5 28.5T720-160Zm0-600ZM240-480Zm480 280Z':
    'M720-80q-50 0-85-35t-35-85q0-7 1-14.5t3-13.5L322-392q-17 15-38 23.5t-44 8.5q-50 0-85-35t-35-85q0-50 35-85t85-35q23 0 44 8.5t38 23.5l282-164q-2-6-3-13.5t-1-14.5q0-50 35-85t85-35q50 0 85 35t35 85q0 50-35 85t-85 35q-23 0-44-8.5T638-672L356-508q2 6 3 13.5t1 14.5q0 7-1 14.5t-3 13.5l282 164q17-15 38-23.5t44-8.5q50 0 85 35t35 85q0 50-35 85t-85 35Z',
  // volume_up
  'M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320ZM400-606l-86 86H200v80h114l86 86v-252ZM300-480Z':
    'M560-131v-82q90-26 145-100t55-168q0-94-55-168T560-749v-82q124 28 202 125.5T840-481q0 127-78 224.5T560-131ZM120-360v-240h160l200-200v640L280-360H120Zm440 40v-322q47 22 73.5 66t26.5 96q0 51-26.5 94.5T560-320Z',
};

/**
 * 글자 굵기(명세 3.2) — M3 타입 스케일의 크기 · 줄 높이는 그대로 두고 굵기만 모드에 따라 정한다.
 * 어두운 절감형: 가는 획이 발광 면적을 줄인다. 기본 단계는 모두 Regular(400), 강조(emphasized) 단계는 500 —
 *   400 아래로는 내리지 않는다(WCAG 1.4.3 주석: 가는 획은 낮은 대비에서 읽기 어렵다). 강조는 기본보다 한 단계 굵게 남긴다.
 * 밝은 절감형: 굵은 획이 흰 면을 가린다. M3 굵기에 100을 더한다(기본 500 · 600, 강조 600 · 700) — Medium(500) 이상.
 * M3는 타입 스케일 굵기를 브랜드에 맞게 바꾸는 것을 허용한다(크기 · 단계 · 역할 이름은 그대로).
 */
export function savingWeight(m3Weight, emphasized, mode) {
  if (mode === 'dark-saving') return emphasized ? 500 : 400;
  if (mode === 'light-saving') return Math.min(900, m3Weight + 100);
  return m3Weight;
}

/**
 * 모션(명세 3.5, 2026-10-18): 장면은 M3 Standard 스킴 스프링을 쓴다(organisms.css에서 Expressive 토큰을 바꿔 끼움).
 *
 * 아이콘 채움(명세 3.6) — 어두운 절감형은 Outlined, 밝은 절감형은 Filled.
 * 단, 선택 상태를 모양으로 알리는 아이콘(내비게이션 목적지 · 토글)은 두 모드 모두 M3 규칙을 따른다:
 * 켜짐 = Filled, 꺼짐 = Outlined. 꺼진 아이콘까지 채우면 선택이 색으로만 드러나 M3 · WCAG 1.4.1과 충돌하므로 이것이 대체안이다.
 * state: 'on' | 'off' | null(상태 없는 아이콘).
 */
export function savingIconFill(state, mode) {
  if (state === 'on') return 'filled';
  if (state === 'off') return 'outlined';
  return mode === 'light-saving' ? 'filled' : 'outlined';
}

/** 모든 Saving UI 장면에 공통으로 붙는 쓰는 법 — 굵기 · 아이콘(장면에 아이콘이 있을 때만) · 모션(장면에 움직임이 있을 때만, 2026-10-18). */
export const SAVING_COMMON_RULES = {
  'dark-saving': [
    { axis: 'Typography', text: '글자는 가늘게 써요. 기본 글자는 모두 Regular(400), 강조할 글자만 한 단계 굵게(500) 둬요. 획이 가늘수록 켜지는 화소가 줄어요. 더 가는 글자(Light 300)는 어두운 화면에서 읽기 어려워 쓰지 않아요.', principle: 'P1', kind: 'type' },
    { axis: 'Icons', text: '아이콘은 테두리만 있는 모양(Outlined)을 써요. 고른 목적지 · 켜진 토글처럼 선택을 알리는 아이콘만 채워요(M3).', principle: 'P1', kind: 'icon' },
    { axis: 'Motion', text: '움직임은 M3의 Standard 스킴으로 써요. 튀지 않고 더 빨리 자리를 잡아 화면을 다시 그리는 시간이 줄어요. 움직임 줄이기를 켠 사용자에게는 움직임을 빼요.', principle: 'P4', kind: 'motion' },
  ],
  'light-saving': [
    { axis: 'Typography', text: '글자는 M3보다 한 단계 굵게 써요. 기본 글자는 Medium(500) 이상이에요. 획이 굵을수록 흰 면을 더 가려요. 크기와 줄 높이는 M3 그대로예요.', principle: 'P1', kind: 'type' },
    { axis: 'Icons', text: '아이콘은 속을 채운 모양(Filled)을 써요. 다만 내비게이션 · 토글처럼 선택을 모양으로 알리는 아이콘은 M3대로 고른 것만 채우고 나머지는 테두리만 둬요.', principle: 'P1', kind: 'icon' },
    { axis: 'Motion', text: '움직임은 M3의 Standard 스킴으로 써요. 튀지 않고 더 빨리 자리를 잡아 화면을 다시 그리는 시간이 줄어요. 움직임 줄이기를 켠 사용자에게는 움직임을 빼요.', principle: 'P4', kind: 'motion' },
  ],
};

/**
 * 컴포넌트군별 「Saving UI」 — 모드마다 가장 덜 밝게 켜지는 추천 세트 하나와 하위 컴포넌트별 규칙.
 * set: 장면 줄(rows) → 부품. 부품 종류 icon(아이콘 버튼) · group(연결 버튼 그룹) · split(스플릿 버튼) · button.
 *   type은 M3 유형 클래스(filled · tonal · outlined · text · standard), selected는 선택 상태로 그린다.
 * rules: 하위 컴포넌트마다 그 모드에서의 추천과 근거 원리(명세 4.1).
 */
// App bars 장면의 목록 — 프레임 안에서 실제로 스크롤되도록 충분히 길게
const APPBAR_ROWS = Array.from({ length: 14 }, (_, i) => `메일 ${i + 1} · 보낸 사람 ${i + 1}`);

// Badges는 C등급(면적이 매우 작음) — 두 모드 모두 M3 기본 그대로, 쓰는 법도 같다
const RULES_BADGES = [
  { axis: 'Small badge', text: '읽지 않은 알림처럼 개수가 필요 없을 때는 작은 점(Small)만 둬요. 앱 바처럼 자리가 좁은 곳에서도 점을 써요.', principle: 'P5' },
  { axis: 'Large badge', text: '개수를 알려야 할 때만 숫자 배지(Large)를 써요. 네 글자까지 쓰고, 넘으면 999+처럼 줄여요. 화면을 덜 밝히려고 필요한 숫자를 점으로 바꾸지는 않아요.', principle: 'P5' },
  { axis: 'Color', text: '기본 색(Error)을 그대로 써요. M3도 배지 색을 바꾸지 말라고 해요.', principle: 'P5' },
  { axis: 'With navigation', text: '내비게이션에서 그 화면을 고르면 배지를 숨겨요. 이미 본 알림의 점이 계속 켜져 있지 않아요.', principle: 'P5' },
];

/**
 * 비교 기준(「M3 기본」, 2026-10-20 사용자 결정) — M3에 기본값이 있는 요소는 그 기본값을 그대로 쓴다
 * (아이콘 버튼 Standard · 카드 안 낮은 강조 동작 Text · 타입 스케일 굵기 · Outlined 아이콘 · 컨테이너 색).
 * 기본값이 없는 요소만 그 모드에서 밝게 켜지는 쪽을 정해 대조시킨다. 지금은 카드 유형 하나 —
 * M3는 Elevated · Filled · Outlined를 쓰임새에 따라 고르는 대등한 선택지로 둔다.
 *   어두운: Filled(칠한 바탕이 검은 배경보다 밝다) / 밝은: Outlined(속이 흰 배경 그대로).
 * Pages 비교의 왼쪽 패널과 예시 화면 구성의 스위치 끔 상태가 이 기준을 쓴다(compare.js applyM3Baseline).
 */
export const M3_BASELINE = {
  'dark-saving': { cardType: 'filled' },
  'light-saving': { cardType: 'outlined' },
};

export const SAVING_RECIPES = {
  buttons: {
    grade: 'B',
    principles: ['P1', 'P2'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서는 색을 채운 면이 많을수록 화면이 밝아져요. 가장 중요한 버튼 하나만 색을 채우고, 나머지는 테두리나 글자만 쓰세요. 같은 묶음 안에서는 한 가지 모양으로 맞추고, 켜진 것만 채워지게 해요.',
        set: [
          [
            { kind: 'icon', icon: 'bold', type: 'outlined', selected: true, name: '굵게' },
            { kind: 'icon', icon: 'italic', type: 'outlined', name: '기울임' },
            { kind: 'icon', icon: 'link', type: 'outlined', name: '링크' },
            { kind: 'group', type: 'outlined', selectedType: 'outlined', items: ['일간', '주간', '월간'], selected: 1 },
          ],
          [
            { kind: 'split', label: '저장', lead: 'filled', trail: 'filled' },
            { kind: 'button', type: 'outlined', label: '공유' },
            { kind: 'button', type: 'text', label: '취소' },
          ],
        ],
        rules: [
          { axis: 'Button', text: '가장 중요한 버튼 하나만 색을 채워요(Filled). 그다음 버튼은 테두리만(Outlined), 덜 중요한 버튼은 글자만(Text) 써요. 그림자가 있는 버튼(Elevated)은 쓰지 않아요.', principle: 'P1 · P2' },
          { axis: 'Icon button', text: '테두리만 있는 모양(Outlined)으로 맞춰요. 켜진 버튼만 속이 채워져서, 켜짐과 꺼짐이 색뿐 아니라 채움으로도 구분돼요.', principle: 'P1' },
          { axis: 'Button group', text: '붙어 있는 그룹은 전부 테두리 모양(Outlined) 하나로 맞추고, 선택된 항목만 채워지게 해요. 그룹 안에서 모양을 섞으면 무엇이 선택됐는지 헷갈려서 M3도 섞지 말라고 해요.', principle: 'P1' },
          { axis: 'Split button', text: '양쪽을 같은 모양으로 맞춰요. 화면의 주 액션이면 양쪽 모두 색을 채우고(Filled), 보조 액션이면 양쪽 모두 테두리만(Outlined) 써요.', principle: 'P1' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 버튼에 색을 채우면 그만큼 흰 면이 가려져 화면이 덜 밝아져요. 테두리만 있는 버튼보다 색을 채운 버튼을 쓰고, 같은 묶음 안에서는 한 가지 모양으로 맞춰요.',
        set: [
          [
            { kind: 'icon', icon: 'bold', type: 'tonal', selected: true, name: '굵게' },
            { kind: 'icon', icon: 'italic', type: 'tonal', name: '기울임' },
            { kind: 'icon', icon: 'link', type: 'tonal', name: '링크' },
            { kind: 'group', type: 'tonal', selectedType: 'tonal', items: ['일간', '주간', '월간'], selected: 1 },
          ],
          [
            { kind: 'split', label: '저장', lead: 'filled', trail: 'filled' },
            { kind: 'button', type: 'tonal', label: '공유' },
            { kind: 'button', type: 'text', label: '취소' },
          ],
        ],
        rules: [
          { axis: 'Button', text: '가장 중요한 버튼은 진하게 채우고(Filled), 그다음 버튼은 연한 색으로 채워요(Tonal). 테두리만 있는 버튼(Outlined)은 속이 흰 배경 그대로라 더 밝아요.', principle: 'P1' },
          { axis: 'Icon button', text: '연한 배경을 채운 모양(Tonal)으로 맞춰요. 배경 없는 모양(Standard)은 흰 배경이 그대로 보여요.', principle: 'P1' },
          { axis: 'Button group', text: '기본 모양(Tonal) 하나로 맞춰 써요. 모든 항목이 배경보다 조금 어두워요.', principle: 'P1' },
          { axis: 'Split button', text: '두 쪽 모두 색을 채운 기본 모양 그대로 써요.', principle: 'P1' },
        ],
      },
    },
  },
  'app-bars': {
    grade: 'A',
    principles: ['P2', 'P5'],
    modes: {
      'dark-saving': {
        lead: '앱 바는 화면 맨 위에 늘 떠 있어서, 칠한 색이 넓은 띠로 계속 켜져요. 어두운 화면에서는 스크롤할 때 앱 바를 M3 기본대로 칠하되, 아이콘 버튼은 배경 없는 기본 모양으로 두어 밝은 면을 더 늘리지 마세요.',
        set: [
          [{ kind: 'appbar', title: '받은편지함', onScroll: 'fill', leading: 'standard', actions: [{ icon: 'search', type: 'standard', name: '검색' }, { icon: 'edit', type: 'standard', name: '새로 만들기' }], rows: APPBAR_ROWS }],
          [{ kind: 'appbar', variant: 'search', placeholder: '메일 검색', avatar: '홍', onScroll: 'fill', leading: null, rows: APPBAR_ROWS }],
        ],
        rules: [
          { axis: 'On scroll', text: '내용이 앱 바 밑으로 지나가면 앱 바를 기본 색(Surface container)으로 칠해 내용과 구분해요. 제목과 내용이 겹치지 않아 읽기 쉬워요.', principle: 'P2 · P5' },
          { axis: 'Icon buttons', text: '앱 바 버튼은 배경 없는 기본 모양(Standard)으로 둬요. 연한 배경(Tonal)을 채우면 버튼마다 밝은 동그라미가 하나씩 늘어요. 꼭 필요한 한두 개만 두고, 더 필요하면 툴바(Toolbar)로 옮겨요.', principle: 'P1 · P5' },
          { axis: 'Search app bar', text: '검색 앱 바도 스크롤하면 기본대로 앱 바와 검색창을 칠해요. 검색창을 더 밝은 색(Surface bright)으로 바꾸지 않아요.', principle: 'P2' },
          { axis: 'Size', text: '작은 앱 바(Small)를 기본으로 써요. 큰 제목(Medium · Large flexible)은 스크롤하면 작은 앱 바로 줄이고, 내릴 때 숨겼다가 올릴 때 다시 보여 줘도 돼요.', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 앱 바를 칠하면 화면 맨 위의 흰 띠가 가려져 화면이 덜 밝아져요. 스크롤할 때 앱 바를 기본대로 칠하고, 주요 버튼 하나를 진한 색으로 채우세요.',
        set: [
          [{ kind: 'appbar', title: '받은편지함', onScroll: 'fill', leading: 'standard', actions: [{ icon: 'edit', type: 'filled', name: '새로 만들기' }], rows: APPBAR_ROWS }],
          [{ kind: 'appbar', variant: 'search', placeholder: '메일 검색', avatar: '홍', onScroll: 'fill', leading: null, rows: APPBAR_ROWS }],
        ],
        rules: [
          { axis: 'On scroll', text: '내용이 앱 바 밑으로 지나가면 앱 바를 기본 색(Surface container)으로 칠해요. 칠한 면이 흰 배경보다 어두워 화면이 덜 밝아지고, 제목과 내용도 겹치지 않아요.', principle: 'P1 · P2' },
          { axis: 'Icon buttons', text: '가장 중요한 버튼 하나만 진한 색으로 채워요(Filled). 나머지 버튼은 배경 없는 기본 모양(Standard)으로 둬요. M3는 앱 바에 채운 버튼이나 연한 배경 버튼(Tonal)을 여러 개 두지 말라고 해요. 버튼이 더 필요하면 툴바(Toolbar)나 메뉴로 옮겨요.', principle: 'P1 · P5' },
          { axis: 'Search app bar', text: '검색 앱 바도 스크롤하면 기본대로 앱 바와 검색창을 칠해요.', principle: 'P1' },
          { axis: 'Size', text: '작은 앱 바(Small)를 기본으로 써요. 큰 제목(Medium · Large flexible)은 스크롤하면 작은 앱 바로 줄여요.', principle: 'P5' },
        ],
      },
    },
  },
  badges: {
    grade: 'C',
    principles: ['P5'],
    modes: {
      'dark-saving': {
        lead: '배지는 아이콘 귀퉁이의 작은 점이나 숫자라서 화면 밝기에 거의 영향이 없어요. 모양이나 색을 바꾸지 말고 기본 그대로 쓰세요. 대신 이미 확인한 화면의 배지는 지워, 켜져 있는 점을 줄여요.',
        set: [
          [{ kind: 'badgenav', items: [
            { label: '홈', icon: 'home', active: true, badge: null },
            { label: '메일', icon: 'mail', badge: '3' },
            { label: '채팅', icon: 'chat', badge: 'small' },
          ] }],
        ],
        rules: RULES_BADGES,
      },
      'light-saving': {
        lead: '배지는 아이콘 귀퉁이의 작은 점이나 숫자라서 밝은 화면에서도 밝기에 거의 영향이 없어요. 모양이나 색을 바꾸지 말고 기본 그대로 쓰세요. 이미 확인한 화면의 배지는 지워요.',
        set: [
          [{ kind: 'badgenav', items: [
            { label: '홈', icon: 'home', active: true, badge: null },
            { label: '메일', icon: 'mail', badge: '3' },
            { label: '채팅', icon: 'chat', badge: 'small' },
          ] }],
        ],
        rules: RULES_BADGES,
      },
    },
  },
  cards: {
    grade: 'A',
    principles: ['P1', 'P2'],
    modes: {
      'dark-saving': {
        lead: '카드는 화면에서 넓은 면을 차지해서, 카드 바탕을 칠하면 그만큼 화면이 밝아져요. 어두운 화면에서는 바탕을 칠하지 말고 테두리만 둔 카드를 쓰세요. 한 묶음 안의 카드는 모두 같은 모양으로 맞춰요.',
        set: [
          [{ kind: 'cards', type: 'outlined', items: [{ headline: '제주 여행', subhead: '4월 12일 · 3박' }, { headline: '부산 바다', subhead: '5월 3일 · 2박' }, { headline: '강릉 카페', subhead: '6월 1일 · 1박' }] }],
        ],
        rules: [
          { axis: 'Outlined card', text: '바탕은 화면 배경 그대로 두고 얇은 테두리로만 카드를 구분해요(Outlined). 그림자도 없어요.', principle: 'P1' },
          { axis: 'Elevated · Filled card', text: '그림자 카드(Elevated)나 바탕을 칠한 카드(Filled)는 카드마다 밝은 면이 생겨요. 어두운 화면에서는 쓰지 않아요.', principle: 'P1' },
          { axis: 'Collection', text: '여러 카드를 모으면 모두 같은 모양 · 같은 높이로 둬요. M3도 묶음 안 카드는 같은 높이에 둔다고 해요. 카드 안에 카드를 겹치지 않아요.', principle: 'P2' },
          { axis: 'Content', text: '제목과 간격만으로 충분하면 카드로 감싸지 말고 목록(List)으로 보여 줘요. M3도 억지로 카드에 넣지 말라고 해요.', principle: 'P2' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 카드는 넓은 면을 차지해서, 카드 바탕을 칠하면 그만큼 흰 면이 가려져 화면이 덜 밝아져요. 바탕을 칠한 카드를 쓰고, 한 묶음 안의 카드는 모두 같은 모양으로 맞춰요.',
        set: [
          [{ kind: 'cards', type: 'filled', items: [{ headline: '제주 여행', subhead: '4월 12일 · 3박' }, { headline: '부산 바다', subhead: '5월 3일 · 2박' }, { headline: '강릉 카페', subhead: '6월 1일 · 1박' }] }],
        ],
        rules: [
          { axis: 'Filled card', text: '카드 바탕을 칠해 구분해요(Filled). 칠한 면이 흰 배경을 덮어 화면이 덜 밝아지고, 그림자도 없어요.', principle: 'P1' },
          { axis: 'Elevated · Outlined card', text: '그림자 카드(Elevated)는 바탕이 배경과 거의 같고, 테두리만 둔 카드(Outlined)는 속이 흰 배경 그대로라 더 밝아요.', principle: 'P1' },
          { axis: 'Collection', text: '여러 카드를 모으면 모두 같은 모양 · 같은 높이로 둬요. M3도 묶음 안 카드는 같은 높이에 둔다고 해요. 카드 안에 카드를 겹치지 않아요.', principle: 'P2' },
          { axis: 'Content', text: '제목과 간격만으로 충분하면 카드로 감싸지 말고 목록(List)으로 보여 줘요. M3도 억지로 카드에 넣지 말라고 해요.', principle: 'P2' },
        ],
      },
    },
  },
  carousel: {
    grade: 'A',
    principles: ['P1', 'P4', 'P5'],
    modes: {
      'dark-saving': {
        lead: '캐러셀은 사진이 화면의 넓은 면을 차지해서, 화면 밝기는 거의 사진 자체가 정해요. 항목 높이는 사진을 알아볼 수 있을 만큼만 잡고, 함께 두는 \u2018모두 보기\u2019 버튼은 글자만 써서 밝은 면을 더 늘리지 마세요.',
        set: [
          [{ kind: 'live', src: '[data-carousel-live]', tweaks: [{ sel: '[data-carousel-showall]', cls: ['btn-outlined', 'btn-text'] }] }],
        ],
        rules: [
          { axis: 'Layout', text: '사진 여러 장을 훑어보게 할 때는 크기가 다른 항목을 함께 두는 배치(Multi-browse), 한 장을 크게 보여 줄 때는 큰 항목 하나(Hero)를 써요. 높이가 같으면 배치를 바꿔도 밝기는 거의 같아서, 내용에 맞는 배치를 고르면 돼요.', principle: 'P5' },
          { axis: 'Full-screen', text: '화면 전체를 사진으로 채우는 배치(Full-screen)는 영상이나 기사처럼 몰입이 꼭 필요할 때만 써요. 밝은 사진이 화면 전체를 켜요.', principle: 'P1' },
          { axis: 'Show all', text: '세로로 스크롤하는 화면에서는 캐러셀 아래에 \u2018모두 보기\u2019 버튼을 둬요(M3 필수). 버튼은 글자만 써요(Text).', principle: 'P1' },
          { axis: 'Scrolling', text: '저절로 넘어가게 하지 않아요. 사용자가 넘길 때만 움직여요. M3 캐러셀에도 자동 재생은 없어요.', principle: 'P4' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 캐러셀 사진은 대개 흰 배경보다 어두워 그 자리를 덜 밝게 만들어요. 배치는 내용에 맞게 고르고, 함께 두는 \u2018모두 보기\u2019 버튼은 연한 색을 채워 흰 면을 조금 더 가려요.',
        set: [
          [{ kind: 'live', src: '[data-carousel-live]', tweaks: [{ sel: '[data-carousel-showall]', cls: ['btn-outlined', 'btn-tonal'] }] }],
        ],
        rules: [
          { axis: 'Layout', text: '사진 여러 장을 훑어보게 할 때는 크기가 다른 항목을 함께 두는 배치(Multi-browse), 한 장을 크게 보여 줄 때는 큰 항목 하나(Hero)를 써요. 높이가 같으면 배치를 바꿔도 밝기는 거의 같아서, 내용에 맞는 배치를 고르면 돼요.', principle: 'P5' },
          { axis: 'Full-screen', text: '화면 전체를 사진으로 채우는 배치(Full-screen)는 영상이나 기사처럼 몰입이 꼭 필요할 때만 써요.', principle: 'P1' },
          { axis: 'Show all', text: '세로로 스크롤하는 화면에서는 캐러셀 아래에 \u2018모두 보기\u2019 버튼을 둬요(M3 필수). 버튼은 연한 색을 채워요(Tonal).', principle: 'P1' },
          { axis: 'Scrolling', text: '저절로 넘어가게 하지 않아요. 사용자가 넘길 때만 움직여요. M3 캐러셀에도 자동 재생은 없어요.', principle: 'P4' },
        ],
      },
    },
  },
  checkbox: {
    grade: 'B',
    principles: ['P1'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서는 색을 채운 면이 많을수록 화면이 밝아져요. 체크박스는 고른 것만 작은 상자를 채우고 나머지는 테두리만 있어서, 여러 항목을 고르는 목록에서 스위치보다 덜 밝아요. 기본 모양 그대로 쓰세요.',
        set: [
          [{ kind: 'checkboxes', parent: '모든 알림', items: [{ label: '메일', checked: true }, { label: '채팅', checked: true }, { label: '일정', checked: false }] }],
        ],
        rules: [
          { axis: 'Checkbox', text: '고르지 않은 항목은 테두리만 두고, 고른 항목만 색을 채워요. M3 기본 모양 그대로예요.', principle: 'P1' },
          { axis: 'Parent checkbox', text: '항목이 여럿이면 맨 위에 \u2018모두\u2019 체크박스를 둬요. 일부만 고르면 가로줄 표시(불확정)로 바뀌어요.', principle: 'P5' },
          { axis: 'Instead of switches', text: '서로 관련된 여러 항목을 고를 때는 스위치 대신 체크박스를 써요. 스위치는 켜진 것마다 긴 막대가 채워져 더 밝아요. M3도 이럴 땐 체크박스를 쓰라고 해요.', principle: 'P1' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 체크박스는 작은 상자라 화면 밝기를 크게 바꾸지 않아요. 고른 것만 색을 채우는 기본 모양 그대로 쓰세요.',
        set: [
          [{ kind: 'checkboxes', parent: '모든 알림', items: [{ label: '메일', checked: true }, { label: '채팅', checked: true }, { label: '일정', checked: false }] }],
        ],
        rules: [
          { axis: 'Checkbox', text: '고르지 않은 항목은 테두리만 두고, 고른 항목만 색을 채워요. M3 기본 모양 그대로예요.', principle: 'P1' },
          { axis: 'Parent checkbox', text: '항목이 여럿이면 맨 위에 \u2018모두\u2019 체크박스를 둬요. 일부만 고르면 가로줄 표시(불확정)로 바뀌어요.', principle: 'P5' },
          { axis: 'Instead of switches', text: '서로 관련된 여러 항목을 고를 때는 스위치 대신 체크박스를 써요. 스위치의 채운 막대가 흰 면을 더 가리긴 하지만, M3는 이럴 때 체크박스를 쓰라고 해요.', principle: 'P5' },
        ],
      },
    },
  },
  chips: {
    grade: 'B',
    principles: ['P1'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서는 색을 채운 면이 많을수록 화면이 밝아져요. 칩은 테두리만 둔 기본 모양으로 쓰고, 고른 필터 칩만 색을 채워요. 화면 바탕에 바로 놓인 칩에는 그림자 칩을 쓰지 않아요.',
        set: [
          [{ kind: 'chips', type: 'filter', name: '검색 필터', items: [{ label: '사진', selected: true }, { label: '동영상' }, { label: '문서' }, { label: '최근 7일' }] }],
          [{ kind: 'chips', type: 'suggestion', name: '추천 답장', items: [{ label: '좋아요' }, { label: '고마워요' }, { label: '나중에 볼게요' }] }],
        ],
        rules: [
          { axis: 'Filter chip', text: '고른 칩만 연한 색을 채우고 체크 표시를 붙여요. 고르지 않은 칩은 테두리만 둬요.', principle: 'P1' },
          { axis: 'Assist · Suggestion chip', text: '테두리만 둔 기본 모양(Flat)으로 써요. 바탕을 채우지 않아 밝은 면이 늘지 않아요.', principle: 'P1' },
          { axis: 'Elevated chip', text: '그림자 칩(Elevated)은 사진 위처럼 배경이 복잡할 때만 써요. M3도 화면 바탕에 바로 놓인 칩에는 쓰지 말라고 해요.', principle: 'P1' },
          { axis: 'Chip set', text: '칩은 여러 개를 묶음으로 둬요. 다음 단계로 넘어가거나 일을 끝내는 동작은 칩이 아니라 버튼으로 해요(M3).', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 칩은 작아서 모양에 따라 밝기가 크게 달라지지 않아요. 테두리만 둔 기본 모양으로 쓰고, 고른 필터 칩만 색을 채워요.',
        set: [
          [{ kind: 'chips', type: 'filter', name: '검색 필터', items: [{ label: '사진', selected: true }, { label: '동영상' }, { label: '문서' }, { label: '최근 7일' }] }],
          [{ kind: 'chips', type: 'suggestion', name: '추천 답장', items: [{ label: '좋아요' }, { label: '고마워요' }, { label: '나중에 볼게요' }] }],
        ],
        rules: [
          { axis: 'Filter chip', text: '고른 칩만 연한 색을 채우고 체크 표시를 붙여요. 고르지 않은 칩은 테두리만 둬요.', principle: 'P1' },
          { axis: 'Assist · Suggestion chip', text: '테두리만 둔 기본 모양(Flat)으로 써요.', principle: 'P5' },
          { axis: 'Elevated chip', text: '그림자 칩(Elevated)은 채운 면이 흰 면을 조금 가리지만, 사진 위처럼 배경이 복잡할 때만 써요. M3가 화면 바탕에 바로 놓인 칩에는 쓰지 말라고 해요.', principle: 'P5' },
          { axis: 'Chip set', text: '칩은 여러 개를 묶음으로 둬요. 다음 단계로 넘어가거나 일을 끝내는 동작은 칩이 아니라 버튼으로 해요(M3).', principle: 'P5' },
        ],
      },
    },
  },
  'date-time-pickers': {
    grade: 'C',
    principles: ['P2', 'P5'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서는 떠 있는 창의 칠한 면이 넓을수록 화면이 밝아져요. 달력이나 시계판이 꼭 필요하지 않으면 숫자를 바로 입력하는 작은 창을 기본으로 띄우세요. 달력 · 시계판은 창 안의 버튼으로 바꿔 열 수 있어요.',
        set: [
          [{ kind: 'picker', picker: 'date', variant: 'input' }, { kind: 'picker', picker: 'time', variant: 'input' }],
        ],
        rules: [
          { axis: 'Modal date input', text: '생일처럼 아는 날짜는 달력 없이 숫자로 입력하는 창(Modal date input)을 기본으로 둬요. M3도 달력이 필요 없는 날짜엔 이 창을 기본으로 써도 된다고 해요.', principle: 'P2' },
          { axis: 'Modal date picker', text: '달력에서 골라야 할 때만 달력 창(Modal)으로 바꿔요. 창이 커서 칠한 면이 넓어요.', principle: 'P2' },
          { axis: 'Docked date picker', text: '태블릿 · 데스크톱에서 입력 칸 아래에 펼쳐지는 달력(Docked)이에요. 필요할 때만 펼치고 고르면 바로 닫아요.', principle: 'P5' },
          { axis: 'Time picker', text: '시간도 숫자로 입력하는 창(Time input)을 기본으로 두고, 시계판(Dial)은 창 안의 아이콘으로 열어요. M3도 두 방식을 오갈 수 있게 하라고 해요.', principle: 'P2' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 날짜 · 시간 선택 창은 잠깐 떠 있다 사라지고, 칠한 창이 흰 면을 가려서 화면을 밝게 만들지 않아요. 상황에 맞는 M3 기본 창을 그대로 쓰세요.',
        set: [
          [{ kind: 'picker', picker: 'date', variant: 'modal' }, { kind: 'picker', picker: 'time', variant: 'dial' }],
        ],
        rules: [
          { axis: 'Modal date picker', text: '휴대폰에서는 달력 창(Modal)을 기본으로 써요. 생일처럼 먼 날짜는 숫자로 입력하는 창(Modal date input)이 더 편해요(M3).', principle: 'P5' },
          { axis: 'Docked date picker', text: '태블릿 · 데스크톱에서 입력 칸 아래에 펼쳐지는 달력(Docked)이에요. 필요할 때만 펼치고 고르면 바로 닫아요.', principle: 'P5' },
          { axis: 'Time picker', text: '시계판(Dial)을 기본으로 두고, 숫자로 입력하는 방식(Time input)은 창 안의 아이콘으로 열어요.', principle: 'P5' },
        ],
      },
    },
  },
  dialogs: {
    grade: 'C',
    principles: ['P5'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서 대화상자의 바탕은 배경보다 밝은 면이에요. 잠깐 떠 있다 사라지니 M3 기본 그대로 쓰되, 덜 중요한 알림까지 대화상자로 띄우지는 마세요.',
        set: [
          [{ kind: 'dialog', behind: ['메일 알림', '소리', '진동', '방해 금지', '배지 표시'], headline: '기록을 삭제할까요?', supporting: '기록 12건이 이 기기에서 지워져요. 백업한 기록은 남아 있어요.', actions: ['취소', '삭제'] }],
        ],
        rules: [
          { axis: 'Basic dialog', text: '꼭 답을 받아야 하는 중요한 질문에만 써요. 버튼은 글자만 둔 기본 모양 그대로예요.', principle: 'P5' },
          { axis: 'Scrim', text: '대화상자 뒤를 덮는 반투명 막은 그대로 둬요. 뒤 화면이 어두워져 화면 전체가 덜 밝아져요.', principle: 'P1' },
          { axis: 'Full-screen dialog', text: '휴대폰에서 여러 칸을 채워야 하는 작업에만 화면 전체 대화상자를 써요(M3).', principle: 'P5' },
          { axis: 'Instead of dialogs', text: '덜 중요한 알림은 대화상자 대신 잠깐 떴다 사라지는 스낵바(Snackbar)로 보여 줘요. M3도 대화상자는 아껴 쓰라고 해요.', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 대화상자가 뜨면 뒤를 덮는 반투명 막이 흰 화면 전체를 어둡게 해서 오히려 덜 밝아져요. 잠깐 떠 있는 창이라 M3 기본 그대로 쓰세요.',
        set: [
          [{ kind: 'dialog', behind: ['메일 알림', '소리', '진동', '방해 금지', '배지 표시'], headline: '기록을 삭제할까요?', supporting: '기록 12건이 이 기기에서 지워져요. 백업한 기록은 남아 있어요.', actions: ['취소', '삭제'] }],
        ],
        rules: [
          { axis: 'Basic dialog', text: '꼭 답을 받아야 하는 중요한 질문에만 써요. 버튼은 글자만 둔 기본 모양 그대로예요.', principle: 'P5' },
          { axis: 'Scrim', text: '대화상자 뒤를 덮는 반투명 막은 그대로 둬요. 뒤 화면이 어두워져 화면 전체가 덜 밝아져요.', principle: 'P1' },
          { axis: 'Full-screen dialog', text: '휴대폰에서 여러 칸을 채워야 하는 작업에만 화면 전체 대화상자를 써요(M3).', principle: 'P5' },
          { axis: 'Instead of dialogs', text: '덜 중요한 알림은 대화상자 대신 잠깐 떴다 사라지는 스낵바(Snackbar)로 보여 줘요. M3도 대화상자는 아껴 쓰라고 해요.', principle: 'P5' },
        ],
      },
    },
  },
  divider: {
    grade: 'B',
    principles: ['P5'],
    modes: {
      'dark-saving': {
        lead: '구분선은 1픽셀 가는 선이라 어두운 화면의 밝기에 거의 영향이 없어요. M3 기본 그대로 쓰고, 간격만으로 충분한 곳에는 선을 빼서 화면을 단순하게 둬요.',
        set: [
          [{ kind: 'dividers', groups: [['메일 알림', '소리', '진동'], ['방해 금지', '배지 표시']] }],
        ],
        rules: [
          { axis: 'Inset divider', text: '같은 묶음 안의 항목 사이에는 앞쪽을 들여 쓴 짧은 선(Inset)을 둬요.', principle: 'P5' },
          { axis: 'Full-width divider', text: '서로 다른 묶음을 나눌 때만 끝까지 이어진 선(Full width)을 써요. M3도 너무 많으면 어수선하니 아껴 쓰라고 해요.', principle: 'P5' },
          { axis: 'Spacing', text: '비슷한 항목이 반복되는 목록은 선 없이 간격만으로도 충분해요(M3).', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 구분선은 1픽셀 가는 선이라 흰 화면의 밝기를 거의 바꾸지 않아요. M3 기본 그대로 쓰고, 간격만으로 충분한 곳에는 선을 빼요.',
        set: [
          [{ kind: 'dividers', groups: [['메일 알림', '소리', '진동'], ['방해 금지', '배지 표시']] }],
        ],
        rules: [
          { axis: 'Inset divider', text: '같은 묶음 안의 항목 사이에는 앞쪽을 들여 쓴 짧은 선(Inset)을 둬요.', principle: 'P5' },
          { axis: 'Full-width divider', text: '서로 다른 묶음을 나눌 때만 끝까지 이어진 선(Full width)을 써요. M3도 너무 많으면 어수선하니 아껴 쓰라고 해요.', principle: 'P5' },
          { axis: 'Spacing', text: '비슷한 항목이 반복되는 목록은 선 없이 간격만으로도 충분해요(M3).', principle: 'P5' },
        ],
      },
    },
  },
  fab: {
    grade: 'A',
    principles: ['P1', 'P5'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서 FAB는 늘 떠 있는 색 채운 버튼이라 화면에서 가장 밝은 점이 되기 쉬워요. 기본 크기에 연한 색을 채워 쓰고, 한 화면에 하나만 두세요.',
        set: [
          [{ kind: 'fabphone', items: ['장보기 목록', '회의 메모', '여행 준비', '읽을 책', '운동 기록', '생일 선물', '이사 준비', '레시피', '영화 목록', '공부 계획', '가계부', '독서 노트'], color: 'primary-container', size: null, label: '새 메모', caption: 'Extended FAB' }, { kind: 'live', src: '[data-fm-live]', label: 'FAB menu · Expressive' }, { kind: 'live', src: '[data-fm-live]', label: 'FAB menu · Web menu', tweaks: [{ sel: '.m3-fab-menu', attrs: { hidden: '' } }, { sel: '.m3-fab-web', remove: ['hidden'] }] }],
        ],
        rules: [
          { axis: 'Size', text: '기본 크기(FAB · 56)를 써요. 다른 버튼이 함께 있는 휴대폰 화면에 알맞다고 M3도 해요. 더 작은 FAB(40)는 M3가 더 이상 권하지 않아요.', principle: 'P1' },
          { axis: 'Color', text: '연한 색(Primary container)을 채워요. 진한 색(Primary · Secondary · Tertiary)은 더 밝아요.', principle: 'P1' },
          { axis: 'Extended FAB', text: '라벨이 꼭 필요할 때만 글자를 붙인 FAB(Extended)를 써요. 스크롤하면 아이콘만 남게 접어 채운 면을 줄여요.', principle: 'P1' },
          { axis: 'One per screen', text: '한 화면에 FAB는 하나만 둬요. M3도 여러 개를 두지 말라고 해요.', principle: 'P5' },
          { axis: 'FAB menu', text: '관련된 동작이 여럿이면 FAB 하나에서 펼쳐요. 앱에서는 FAB 자리에서 항목이 하나씩 펼쳐지는 메뉴(Expressive), 웹에서는 FAB에 붙는 일반 메뉴(Web menu)를 써요. 펼친 항목 색은 M3 기본(Primary 묶음) 그대로, 웹 메뉴를 여는 FAB는 위 크기 · 색 규칙을 따라요.', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. FAB는 진한 색으로 채울수록 흰 면을 더 가려 화면이 덜 밝아져요. 크기는 쓰임에 맞는 기본 크기로 두고 진한 색을 채우세요. 한 화면에 하나만 둬요.',
        set: [
          [{ kind: 'fabphone', items: ['장보기 목록', '회의 메모', '여행 준비', '읽을 책', '운동 기록', '생일 선물', '이사 준비', '레시피', '영화 목록', '공부 계획', '가계부', '독서 노트'], color: 'primary', size: null, label: '새 메모', caption: 'Extended FAB' }, { kind: 'live', src: '[data-fm-live]', label: 'FAB menu · Expressive' }, { kind: 'live', src: '[data-fm-live]', label: 'FAB menu · Web menu', tweaks: [{ sel: '.m3-fab-menu', attrs: { hidden: '' } }, { sel: '.m3-fab-web', remove: ['hidden'] }, { sel: '.m3-fab-web .m3-fab', attrs: { 'data-color': 'primary' } }] }],
        ],
        rules: [
          { axis: 'Size', text: '기본 크기(FAB · 56)를 써요. 다른 버튼이 함께 있는 휴대폰 화면에 알맞다고 M3도 해요. 화면을 덜 밝히려고 FAB를 키우지는 않아요.', principle: 'P5' },
          { axis: 'Color', text: '진한 색(Primary)을 채워요. 연한 색(Primary container)은 흰 배경과 비슷해 덜 가려요.', principle: 'P1' },
          { axis: 'Extended FAB', text: '라벨이 꼭 필요할 때만 글자를 붙인 FAB(Extended)를 써요. 스크롤하면 아이콘만 남게 접어 내용을 덜 가려요.', principle: 'P1' },
          { axis: 'One per screen', text: '한 화면에 FAB는 하나만 둬요. M3도 여러 개를 두지 말라고 해요.', principle: 'P5' },
          { axis: 'FAB menu', text: '관련된 동작이 여럿이면 FAB 하나에서 펼쳐요. 앱에서는 FAB 자리에서 항목이 하나씩 펼쳐지는 메뉴(Expressive), 웹에서는 FAB에 붙는 일반 메뉴(Web menu)를 써요. 펼친 항목 색은 M3 기본(Primary 묶음) 그대로, 웹 메뉴를 여는 FAB는 위 크기 · 색 규칙을 따라요.', principle: 'P5' },
        ],
      },
    },
  },
  lists: {
    grade: 'A',
    principles: ['P1', 'P2'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서는 목록 항목마다 바탕을 칠하면 그만큼 밝은 띠가 늘어요. 항목 바탕을 칠하지 않는 기본 목록을 쓰고, 필요할 때만 가는 구분선을 넣어요.',
        set: [
          [{ kind: 'list', style: 'standard', divider: false, rows: [{ label: '받은편지함', supporting: '새 메일 3통' }, { label: '보낸편지함', supporting: '어제' }, { label: '임시 보관함', supporting: '2개' }, { label: '스팸', supporting: '비어 있음' }] }],
        ],
        rules: [
          { axis: 'Standard list', text: '항목 바탕을 칠하지 않고 화면 배경 그대로 둬요(Standard).', principle: 'P1' },
          { axis: 'Segmented list', text: '칠한 바탕 위에 항목을 칸칸이 나눠 놓는 목록(Segmented)은 밝은 면이 넓어 쓰지 않아요.', principle: 'P1' },
          { axis: 'Divider', text: '구분이 더 필요하면 가운데를 들여 쓴 가는 선을 넣어요. 밝기는 거의 같아요.', principle: 'P2' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 칠한 바탕 위에 항목을 칸칸이 나눠 놓는 목록은 흰 면을 가려 화면이 덜 밝아져요.',
        set: [
          [{ kind: 'list', style: 'segmented', divider: false, rows: [{ label: '받은편지함', supporting: '새 메일 3통' }, { label: '보낸편지함', supporting: '어제' }, { label: '임시 보관함', supporting: '2개' }, { label: '스팸', supporting: '비어 있음' }] }],
        ],
        rules: [
          { axis: 'Segmented list', text: '바탕(Surface container)을 칠하고 그 위에 항목을 칸칸이 나눠 놓아요(Segmented). 칸 사이 틈이 항목을 나눠 줘요.', principle: 'P1' },
          { axis: 'Standard list', text: '항목 바탕을 칠하지 않는 목록(Standard)은 흰 면이 그대로 남아 더 밝아요.', principle: 'P1' },
          { axis: 'Divider', text: '칸칸이 나눈 목록에는 구분선을 따로 넣지 않아요.', principle: 'P2' },
        ],
      },
    },
  },
  'loading-indicator': {
    grade: 'C',
    principles: ['P4'],
    modes: {
      'dark-saving': {
        lead: '로딩 표시는 작은 모양이 잠깐 움직이다 사라져서 어두운 화면의 밝기에 거의 영향이 없어요. M3 기본 그대로 쓰되, 기다리는 시간에 맞는 것만 띄우고 짧은 대기에는 아무것도 띄우지 마세요.',
        set: [
          [{ kind: 'loading', rows: ['메일 1 · 보낸 사람 1', '메일 2 · 보낸 사람 2', '메일 3 · 보낸 사람 3'] }],
        ],
        rules: [
          { axis: 'Wait time', text: '0.2초보다 빨리 끝나면 아무것도 띄우지 않아요. 0.2~5초면 로딩 표시를, 5초를 넘으면 진행률 표시(Progress indicator)를 써요(M3).', principle: 'P4' },
          { axis: 'Container', text: '화면 바탕에 바로 놓을 때는 동그란 바탕 없이 모양만 둬요. 내용 위에 겹치거나 당겨서 새로 고칠 때만 바탕(Container)을 깔아요(M3).', principle: 'P1' },
          { axis: 'Placement', text: '더 불러오는 중이면 새 내용이 들어올 빈자리에 두고, 있던 내용을 가리지 않아요.', principle: 'P5' },
          { axis: 'Reduced motion', text: '움직임 줄이기를 켠 사용자에게는 모양이 바뀌지 않고 천천히 돌기만 해요.', principle: 'P4' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 로딩 표시는 작은 모양이 잠깐 움직이다 사라져서 화면 밝기를 거의 바꾸지 않아요. M3 기본 그대로 쓰고, 기다리는 시간에 맞는 것만 띄우세요.',
        set: [
          [{ kind: 'loading', rows: ['메일 1 · 보낸 사람 1', '메일 2 · 보낸 사람 2', '메일 3 · 보낸 사람 3'] }],
        ],
        rules: [
          { axis: 'Wait time', text: '0.2초보다 빨리 끝나면 아무것도 띄우지 않아요. 0.2~5초면 로딩 표시를, 5초를 넘으면 진행률 표시(Progress indicator)를 써요(M3).', principle: 'P4' },
          { axis: 'Container', text: '화면 바탕에 바로 놓을 때는 동그란 바탕 없이 모양만 둬요. 내용 위에 겹치거나 당겨서 새로 고칠 때만 바탕(Container)을 깔아요(M3).', principle: 'P1' },
          { axis: 'Placement', text: '더 불러오는 중이면 새 내용이 들어올 빈자리에 두고, 있던 내용을 가리지 않아요.', principle: 'P5' },
          { axis: 'Reduced motion', text: '움직임 줄이기를 켠 사용자에게는 모양이 바뀌지 않고 천천히 돌기만 해요.', principle: 'P4' },
        ],
      },
    },
  },
  menus: {
    grade: 'C',
    principles: ['P5'],
    modes: {
      'dark-saving': {
        lead: '메뉴는 잠깐 떠 있다 사라지는 작은 창이에요. 어두운 화면에서는 바탕이 어두운 기본 색 메뉴를 쓰고, 진한 색 메뉴는 꼭 눈에 띄어야 할 때만 쓰세요.',
        set: [
          [{ kind: 'menu', trigger: '수정한 날짜', section: '정렬 기준', items: ['이름', '수정한 날짜', '크기'], checked: 1 }],
        ],
        rules: [
          { axis: 'Standard menu', text: '바탕이 어두운 기본 색 메뉴(Standard)를 써요.', principle: 'P1' },
          { axis: 'Vibrant menu', text: '진한 색 메뉴(Vibrant)는 바탕이 밝아 화면이 더 밝아져요. M3도 아껴 쓰라고 해요.', principle: 'P1' },
          { axis: 'Instead of menus', text: '늘 보여야 하는 동작은 메뉴 대신 툴바(Toolbar)에 둬요(M3).', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 메뉴는 잠깐 떠 있다 사라지는 작은 창이라 화면 밝기를 크게 바꾸지 않아요. M3 기본 색 메뉴를 그대로 쓰세요.',
        set: [
          [{ kind: 'menu', trigger: '수정한 날짜', section: '정렬 기준', items: ['이름', '수정한 날짜', '크기'], checked: 1 }],
        ],
        rules: [
          { axis: 'Standard menu', text: '기본 색 메뉴(Standard)를 써요. 잠깐 떠 있는 창이라 기본 그대로면 충분해요.', principle: 'P5' },
          { axis: 'Vibrant menu', text: '진한 색 메뉴(Vibrant)는 흰 면을 더 가리지만, M3가 눈에 띄어야 할 때만 아껴 쓰라고 해요.', principle: 'P5' },
          { axis: 'Instead of menus', text: '늘 보여야 하는 동작은 메뉴 대신 툴바(Toolbar)에 둬요(M3).', principle: 'P5' },
        ],
      },
    },
  },
  navigation: {
    grade: 'A',
    principles: ['P1', 'P2', 'P5'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서 내비게이션은 화면 아래나 옆에 늘 켜져 있는 띠예요. 바 색은 M3 기본(배경보다 조금 밝은 색) 그대로 두고, 바 안에서는 고른 목적지 하나만 색을 채워 밝은 면을 늘리지 마세요. 넓게 펼친 레일은 사용자가 열 때만 보여 주세요.',
        set: [
          [{ kind: 'navphone', items: [{ label: '홈', icon: 'home', active: true }, { label: '메일', icon: 'mail' }, { label: '채팅', icon: 'chat' }], rows: ['메일 1 · 보낸 사람 1', '메일 2 · 보낸 사람 2', '메일 3 · 보낸 사람 3'] }],
        ],
        rules: [
          { axis: 'Navigation bar', text: '바 색은 M3 기본(Surface container) 그대로 두고, 고른 목적지 하나만 알약 모양 표시기를 채우고 아이콘도 채운 모양으로 바꿔요.', principle: 'P1' },
          { axis: 'Labels', text: '라벨은 늘 보여요. 아이콘만으로는 어디로 가는지 알기 어려워요.', principle: 'P5' },
          { axis: 'Navigation rail', text: '넓은 화면에서는 옆에 세로로 두는 레일을 써요. 넓게 펼친 레일은 사용자가 열 때만 보여 줘요.', principle: 'P2' },
          { axis: 'Navigation drawer', text: '서랍처럼 열리는 넓은 메뉴(Drawer)는 쓰지 않고 펼친 레일로 대신해요. M3도 더 이상 권하지 않아요.', principle: 'P2' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 내비게이션 바는 M3 기본 색이 배경보다 조금 어두운 띠라 그만큼 흰 면을 가려 줘요. 바 색은 그대로 두고, 바 안에서는 고른 목적지 하나만 색을 채워 표시해요.',
        set: [
          [{ kind: 'navphone', items: [{ label: '홈', icon: 'home', active: true }, { label: '메일', icon: 'mail' }, { label: '채팅', icon: 'chat' }], rows: ['메일 1 · 보낸 사람 1', '메일 2 · 보낸 사람 2', '메일 3 · 보낸 사람 3'] }],
        ],
        rules: [
          { axis: 'Navigation bar', text: '바 색은 M3 기본(Surface container) 그대로 두고, 고른 목적지 하나만 알약 모양 표시기를 채우고 아이콘도 채운 모양으로 바꿔요.', principle: 'P1' },
          { axis: 'Labels', text: '라벨은 늘 보여요. 아이콘만으로는 어디로 가는지 알기 어려워요.', principle: 'P5' },
          { axis: 'Navigation rail', text: '넓은 화면에서는 옆에 세로로 두는 레일을 써요. 넓게 펼친 레일은 사용자가 열 때만 보여 줘요.', principle: 'P2' },
          { axis: 'Navigation drawer', text: '서랍처럼 열리는 넓은 메뉴(Drawer)는 쓰지 않고 펼친 레일로 대신해요. M3도 더 이상 권하지 않아요.', principle: 'P2' },
        ],
      },
    },
  },
  'progress-indicators': {
    grade: 'B',
    principles: ['P1', 'P4'],
    modes: {
      'dark-saving': {
        lead: '진행률 표시는 가는 선이라 어두운 화면의 밝기에 큰 영향이 없어요. 기본 두께로 그리고, 여러 작업은 하나로 묶어 한 번만 보여 주세요.',
        set: [
          [{ kind: 'progresscard', title: '사진 3장 올리는 중', sub: '2/3 · 약 10초 남음', value: 60 }],
        ],
        rules: [
          { axis: 'Linear · Circular', text: '카드나 화면 가장자리에는 가로 선(Linear), 가운데에는 동그라미(Circular)를 써요. 한 앱 안에서 같은 작업은 같은 모양으로 맞춰요(M3).', principle: 'P5' },
          { axis: 'Shape · Thickness', text: '기본 두께(4)로 그려요. 평평한 선(Flat)과 물결 모양(Wavy)은 밝기 차이가 거의 없으니 앱 분위기에 맞게 고르되, 아주 작은 크기에는 물결이 잘 안 보여 평평한 선을 써요(M3).', principle: 'P5' },
          { axis: 'Group', text: '여러 파일을 올릴 때는 하나로 묶어 한 번만 보여 줘요. 파일마다 띄우지 말라고 M3도 해요.', principle: 'P5' },
          { axis: 'Wait time', text: '5초를 넘는 작업에만 써요. 더 짧으면 로딩 표시를, 0.2초 안에 끝나면 아무것도 띄우지 않아요.', principle: 'P4' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 진행률 표시는 가는 선이라 흰 화면의 밝기를 거의 바꾸지 않아요. 기본 두께로 그리고, 여러 작업은 하나로 묶어 한 번만 보여 주세요.',
        set: [
          [{ kind: 'progresscard', title: '사진 3장 올리는 중', sub: '2/3 · 약 10초 남음', value: 60 }],
        ],
        rules: [
          { axis: 'Linear · Circular', text: '카드나 화면 가장자리에는 가로 선(Linear), 가운데에는 동그라미(Circular)를 써요. 한 앱 안에서 같은 작업은 같은 모양으로 맞춰요(M3).', principle: 'P5' },
          { axis: 'Shape · Thickness', text: '기본 두께(4)로 그려요. 평평한 선(Flat)과 물결 모양(Wavy)은 밝기 차이가 거의 없으니 앱 분위기에 맞게 고르되, 아주 작은 크기에는 물결이 잘 안 보여 평평한 선을 써요(M3).', principle: 'P5' },
          { axis: 'Group', text: '여러 파일을 올릴 때는 하나로 묶어 한 번만 보여 줘요. 파일마다 띄우지 말라고 M3도 해요.', principle: 'P5' },
          { axis: 'Wait time', text: '5초를 넘는 작업에만 써요. 더 짧으면 로딩 표시를, 0.2초 안에 끝나면 아무것도 띄우지 않아요.', principle: 'P4' },
        ],
      },
    },
  },
  'radio-button': {
    grade: 'B',
    principles: ['P1'],
    modes: {
      'dark-saving': {
        lead: '라디오 버튼은 작은 동그라미라 어두운 화면의 밝기에 거의 영향이 없어요. 고른 것만 안쪽 점을 채우는 M3 기본 그대로 쓰세요.',
        set: [
          [{ kind: 'radios', legend: '화면 모드', items: ['시스템 설정 따름', '어둡게', '밝게'], checked: 1 }],
        ],
        rules: [
          { axis: 'Radio button', text: '여러 개 중 하나만 고를 때 써요. 고른 것만 안쪽 점을 채우고 나머지는 테두리만 둬요(M3 기본).', principle: 'P1' },
          { axis: 'Instead of radios', text: '여러 개를 함께 고를 수 있으면 체크박스를, 하나를 켜고 끄기만 하면 스위치를 써요(M3).', principle: 'P5' },
          { axis: 'Label', text: '글자를 눌러도 고를 수 있게 라벨을 붙이고, 누르는 영역(48)을 줄이지 않아요.', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 라디오 버튼은 작은 동그라미라 흰 화면의 밝기를 거의 바꾸지 않아요. 고른 것만 안쪽 점을 채우는 M3 기본 그대로 쓰세요.',
        set: [
          [{ kind: 'radios', legend: '화면 모드', items: ['시스템 설정 따름', '어둡게', '밝게'], checked: 1 }],
        ],
        rules: [
          { axis: 'Radio button', text: '여러 개 중 하나만 고를 때 써요. 고른 것만 안쪽 점을 채우고 나머지는 테두리만 둬요(M3 기본).', principle: 'P1' },
          { axis: 'Instead of radios', text: '여러 개를 함께 고를 수 있으면 체크박스를, 하나를 켜고 끄기만 하면 스위치를 써요(M3).', principle: 'P5' },
          { axis: 'Label', text: '글자를 눌러도 고를 수 있게 라벨을 붙이고, 누르는 영역(48)을 줄이지 않아요.', principle: 'P5' },
        ],
      },
    },
  },
  search: {
    grade: 'B',
    principles: ['P1', 'P5'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서 검색 화면은 배경보다 조금 밝은 M3 기본 색으로 화면 전체를 덮어요. 검색창과 검색 화면은 M3 기본 색 그대로 두고, 검색이 끝나면 바로 닫아 원래 화면으로 돌아가게 해요.',
        set: [
          [{ kind: 'live', src: '[data-search-live]' }],
        ],
        rules: [
          { axis: 'Search bar', text: '검색창은 M3 기본 색 그대로 써요. 뒤쪽 아이콘은 한두 개(음성 · 아바타)만 둬요.', principle: 'P5' },
          { axis: 'Search view', text: '휴대폰에서는 화면 전체로, 넓은 화면에서는 검색창 아래 붙는 창(Docked)으로 열어요(M3). 뒤로 가기나 Esc로 닫고 검색창으로 돌아가요.', principle: 'P5' },
          { axis: 'Results', text: '결과 목록은 목록(Lists) 규칙을 따라 항목 바탕을 칠하지 않아요.', principle: 'P1' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 검색 화면은 배경보다 조금 어두운 M3 기본 색으로 화면을 덮어 흰 면을 가려 줘요. 검색창과 검색 화면은 M3 기본 색 그대로 쓰세요.',
        set: [
          [{ kind: 'live', src: '[data-search-live]' }],
        ],
        rules: [
          { axis: 'Search bar', text: '검색창은 M3 기본 색 그대로 써요. 뒤쪽 아이콘은 한두 개(음성 · 아바타)만 둬요.', principle: 'P5' },
          { axis: 'Search view', text: '휴대폰에서는 화면 전체로, 넓은 화면에서는 검색창 아래 붙는 창(Docked)으로 열어요(M3). 뒤로 가기나 Esc로 닫고 검색창으로 돌아가요.', principle: 'P5' },
          { axis: 'Results', text: '결과 목록은 목록(Lists) 규칙을 따라요.', principle: 'P1' },
        ],
      },
    },
  },
  sheets: {
    grade: 'A',
    principles: ['P2', 'P5'],
    modes: {
      'dark-saving': {
        lead: '시트는 화면의 넓은 면을 덮는 창이에요. 어두운 화면에서는 M3 기본 시트 색이 배경보다 조금 밝으니, 필요한 만큼만 열고 다 쓰면 닫아요. 색은 M3 기본 그대로 두세요.',
        set: [
          [{ kind: 'live', src: '[data-bsheet-live]' }],
        ],
        rules: [
          { axis: 'Bottom sheet', text: '하던 일을 멈추고 고르게 할 때는 모달 시트, 내용과 함께 계속 볼 때는 표준 시트를 써요(M3). 모달 시트는 뒤를 반투명 막으로 덮어요.', principle: 'P5' },
          { axis: 'Height', text: '내용만큼만 반쯤 열고, 더 필요하면 사용자가 끌어 올리게 해요. 끌기 손잡이는 그대로 둬요.', principle: 'P2' },
          { axis: 'Side sheet', text: '넓은 화면에서는 옆에서 여는 시트를 써요. 표준 시트는 배경색 그대로 두고 구분선만 그어요(M3 기본).', principle: 'P2' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 모달 시트가 뜨면 뒤를 덮는 반투명 막이 흰 화면 전체를 어둡게 해 화면이 덜 밝아져요. 색은 M3 기본 그대로 두고, 쓰임에 맞게 모달과 표준을 고르세요.',
        set: [
          [{ kind: 'live', src: '[data-bsheet-live]' }],
        ],
        rules: [
          { axis: 'Bottom sheet', text: '하던 일을 멈추고 고르게 할 때는 모달 시트, 내용과 함께 계속 볼 때는 표준 시트를 써요(M3).', principle: 'P5' },
          { axis: 'Height', text: '내용만큼만 반쯤 열고, 더 필요하면 사용자가 끌어 올리게 해요. 끌기 손잡이는 그대로 둬요.', principle: 'P5' },
          { axis: 'Side sheet', text: '넓은 화면에서는 옆에서 여는 시트를 써요. 표준 시트는 배경색 그대로 두고 구분선만 그어요(M3 기본).', principle: 'P5' },
        ],
      },
    },
  },
  sliders: {
    grade: 'B',
    principles: ['P1'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서는 슬라이더 막대가 굵을수록 칠한 면이 늘어 화면이 밝아져요. 가장 가는 기본 크기(XS)를 쓰고, 손잡이를 잡기 쉽게 누르는 영역은 넉넉히 둬요.',
        set: [
          [{ kind: 'sliders', size: 'xs', items: [{ label: '미디어 음량', value: 60 }, { label: '알림 음량', value: 30 }] }],
        ],
        rules: [
          { axis: 'Size', text: '가장 가는 크기(XS · 16)를 써요. 크기가 커질수록 막대가 굵어져 밝아져요. 아주 큰 크기(XL)는 화면의 주인공일 때만 써요(M3).', principle: 'P1' },
          { axis: 'Inset icon', text: '가는 슬라이더에는 막대 안 아이콘을 넣지 않아요. M3도 40보다 가는 막대에는 넣지 말라고 해요.', principle: 'P5' },
          { axis: 'Target', text: '막대가 가늘어도 손잡이를 누르는 영역은 24 이상으로 둬요.', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 슬라이더 막대가 굵을수록 칠한 면이 흰 면을 가려 화면이 덜 밝아져요. 큰 크기(L)를 쓰고, 막대 안에 무엇을 조절하는지 아이콘을 넣어요.',
        set: [
          [{ kind: 'sliders', size: 'l', items: [{ label: '미디어 음량', value: 60 }, { label: '알림 음량', value: 30 }] }],
        ],
        rules: [
          { axis: 'Size', text: '큰 크기(L · 56)를 써요. 굵은 막대가 흰 면을 가려요. 아주 큰 크기(XL)는 화면의 주인공일 때만 써요(M3).', principle: 'P1' },
          { axis: 'Inset icon', text: '막대 안에 조절하는 것을 나타내는 아이콘을 넣어요. 40 이상 굵기에서만 넣어요(M3).', principle: 'P5' },
          { axis: 'Target', text: '손잡이를 누르는 영역은 24 이상으로 둬요.', principle: 'P5' },
        ],
      },
    },
  },
  snackbar: {
    grade: 'C',
    principles: ['P5'],
    modes: {
      'dark-saving': {
        lead: '스낵바는 어두운 화면에서 밝은 색 띠로 떠서 눈에 잘 띄어요. 몇 초만 떠 있다 사라지니 M3 기본 색 그대로 쓰되, 꼭 알려야 할 때만 짧게 보여 주세요.',
        set: [
          [{ kind: 'snackphone', text: '사진을 보관했어요', action: '되돌리기', rows: ['사진 1', '사진 2', '사진 3', '사진 4'] }],
        ],
        rules: [
          { axis: 'Duration', text: '4~10초 동안만 보여 주고 저절로 사라지게 해요. 동작 버튼이 있으면 사용자가 볼 시간을 넉넉히 줘요(M3).', principle: 'P4' },
          { axis: 'One at a time', text: '한 번에 하나만 띄우고, 다음 알림은 앞의 것이 사라진 뒤에 보여 줘요(M3).', principle: 'P5' },
          { axis: 'Action', text: '동작 버튼은 하나만, 짧은 글자로 둬요(예: 되돌리기).', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 스낵바는 어두운 색 띠라 떠 있는 동안 흰 면을 조금 가려 줘요. 몇 초만 떠 있다 사라지니 M3 기본 그대로 쓰세요.',
        set: [
          [{ kind: 'snackphone', text: '사진을 보관했어요', action: '되돌리기', rows: ['사진 1', '사진 2', '사진 3', '사진 4'] }],
        ],
        rules: [
          { axis: 'Duration', text: '4~10초 동안만 보여 주고 저절로 사라지게 해요. 동작 버튼이 있으면 사용자가 볼 시간을 넉넉히 줘요(M3).', principle: 'P4' },
          { axis: 'One at a time', text: '한 번에 하나만 띄우고, 다음 알림은 앞의 것이 사라진 뒤에 보여 줘요(M3).', principle: 'P5' },
          { axis: 'Action', text: '동작 버튼은 하나만, 짧은 글자로 둬요(예: 되돌리기).', principle: 'P5' },
        ],
      },
    },
  },
  switch: {
    grade: 'B',
    principles: ['P1'],
    modes: {
      'dark-saving': {
        lead: '스위치는 작은 막대라 어두운 화면의 밝기에 큰 영향이 없어요. 켠 것만 막대를 색으로 채우는 M3 기본 그대로 쓰고, 꺼진 손잡이는 작게 둬요.',
        set: [
          [{ kind: 'switches', items: [{ label: '와이파이', checked: true }, { label: '블루투스', checked: false }, { label: '비행기 모드', checked: false }] }],
        ],
        rules: [
          { axis: 'Switch', text: '켠 것만 막대를 진한 색으로 채우고, 꺼지면 바탕과 비슷한 색 막대에 테두리를 둘러요. 손잡이 위치와 크기도 함께 바뀌어 색만으로 알리지 않아요(M3 기본).', principle: 'P1' },
          { axis: 'Icons', text: '손잡이 안 아이콘(체크 · 엑스)은 넣지 않아도 돼요. 밝기 차이는 거의 없어요.', principle: 'P5' },
          { axis: 'Instead of switches', text: '서로 관련된 여러 항목을 고를 때는 스위치 대신 체크박스를 써요(M3).', principle: 'P1' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 스위치는 작은 막대라 흰 화면의 밝기를 거의 바꾸지 않아요. 켠 것만 막대를 색으로 채우는 M3 기본 그대로 쓰세요.',
        set: [
          [{ kind: 'switches', items: [{ label: '와이파이', checked: true }, { label: '블루투스', checked: false }, { label: '비행기 모드', checked: false }] }],
        ],
        rules: [
          { axis: 'Switch', text: '켠 것만 막대를 진한 색으로 채우고, 꺼지면 바탕과 비슷한 색 막대에 테두리를 둘러요. 손잡이 위치와 크기도 함께 바뀌어 색만으로 알리지 않아요(M3 기본).', principle: 'P1' },
          { axis: 'Icons', text: '손잡이 안 아이콘(체크 · 엑스)은 넣지 않아도 돼요. 밝기 차이는 거의 없어요.', principle: 'P5' },
          { axis: 'Instead of switches', text: '서로 관련된 여러 항목을 고를 때는 스위치 대신 체크박스를 써요(M3).', principle: 'P5' },
        ],
      },
    },
  },
  tabs: {
    grade: 'A',
    principles: ['P1', 'P2'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서는 칠한 면이 늘수록 화면이 밝아져요. 탭은 고른 탭 아래 가는 선만으로 표시해서 밝기에 거의 영향이 없어요. 고른 탭 바탕을 칠하지 말고 M3 기본 그대로 쓰세요.',
        set: [
          [{ kind: 'tabs', variant: 'primary', name: '여행 준비', items: ['항공', '숙소', '집'], selected: 0 }],
        ],
        rules: [
          { axis: 'Primary tabs', text: '앱 바 바로 아래 큰 구분은 주 탭(Primary), 내용 안의 작은 구분은 보조 탭(Secondary)으로 나눠요(M3). 밝기 차이는 거의 없어요.', principle: 'P5' },
          { axis: 'Selected tab', text: '고른 탭은 아래 가는 선과 글자 색으로만 표시하고, 탭 바탕은 칠하지 않아요(M3 기본).', principle: 'P1' },
          { axis: 'Instead of tabs', text: '서로 다른 화면으로 옮겨 가는 것이라면 탭 대신 내비게이션을 써요(M3).', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 탭은 고른 탭 아래 가는 선만으로 표시해서 흰 화면의 밝기를 거의 바꾸지 않아요. M3 기본 그대로 쓰세요.',
        set: [
          [{ kind: 'tabs', variant: 'primary', name: '여행 준비', items: ['항공', '숙소', '집'], selected: 0 }],
        ],
        rules: [
          { axis: 'Primary tabs', text: '앱 바 바로 아래 큰 구분은 주 탭(Primary), 내용 안의 작은 구분은 보조 탭(Secondary)으로 나눠요(M3). 밝기 차이는 거의 없어요.', principle: 'P5' },
          { axis: 'Selected tab', text: '고른 탭은 아래 가는 선과 글자 색으로만 표시하고, 탭 바탕은 칠하지 않아요(M3 기본).', principle: 'P1' },
          { axis: 'Instead of tabs', text: '서로 다른 화면으로 옮겨 가는 것이라면 탭 대신 내비게이션을 써요(M3).', principle: 'P5' },
        ],
      },
    },
  },
  'text-fields': {
    grade: 'B',
    principles: ['P1'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서는 입력 칸 바탕을 칠하면 칸마다 밝은 면이 생겨요. 테두리만 둔 입력 칸을 쓰고, 한 양식 안에서는 모양을 하나로 맞춰요.',
        set: [
          [{ kind: 'fields', variant: 'outlined', items: [{ label: '이름', value: '홍길동' }, { label: '이메일', type: 'email', support: '예: name@example.com' }] }],
        ],
        rules: [
          { axis: 'Outlined text field', text: '바탕은 화면 배경 그대로 두고 테두리만 둔 입력 칸(Outlined)을 써요.', principle: 'P1' },
          { axis: 'Filled text field', text: '바탕을 칠한 입력 칸(Filled)은 칸마다 밝은 면이 생겨 쓰지 않아요.', principle: 'P1' },
          { axis: 'One style per form', text: '한 양식 안에서는 입력 칸 모양을 하나로 맞춰요.', principle: 'P5' },
          { axis: 'Focus · Error', text: '포커스는 테두리를 굵게 해서 보여 주고, 오류는 색과 함께 아이콘과 글로 알려요.', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 입력 칸 바탕을 칠하면 그만큼 흰 면이 가려져 화면이 덜 밝아져요. 바탕을 칠한 입력 칸을 쓰고, 한 양식 안에서는 모양을 하나로 맞춰요.',
        set: [
          [{ kind: 'fields', variant: 'filled', items: [{ label: '이름', value: '홍길동' }, { label: '이메일', type: 'email', support: '예: name@example.com' }] }],
        ],
        rules: [
          { axis: 'Filled text field', text: '바탕을 칠한 입력 칸(Filled)을 써요. 칠한 면이 흰 면을 가려요.', principle: 'P1' },
          { axis: 'Outlined text field', text: '테두리만 둔 입력 칸(Outlined)은 속이 흰 배경 그대로라 더 밝아요.', principle: 'P1' },
          { axis: 'One style per form', text: '한 양식 안에서는 입력 칸 모양을 하나로 맞춰요.', principle: 'P5' },
          { axis: 'Focus · Error', text: '포커스는 아래 선을 굵게 해서 보여 주고, 오류는 색과 함께 아이콘과 글로 알려요.', principle: 'P5' },
        ],
      },
    },
  },
  toolbars: {
    grade: 'A',
    principles: ['P1', 'P2', 'P5'],
    modes: {
      'dark-saving': {
        lead: '어두운 화면에서 툴바는 늘 떠 있는 띠라, 바탕이 밝을수록 화면이 밝아져요. 바탕이 어두운 기본 색 툴바를 쓰고, 내용을 읽는 동안에는 숨겨요.',
        set: [
          [{ kind: 'live', src: '[data-tb-live="floating"]', tweaks: [{ sel: '.m3-toolbar', attrs: { 'data-color': 'standard' } }] }],
        ],
        rules: [
          { axis: 'Standard color', text: '바탕이 어두운 기본 색 툴바(Standard)를 써요. 진한 색 툴바(Vibrant)는 바탕이 밝아 화면이 더 밝아져요.', principle: 'P1' },
          { axis: 'Floating · Docked', text: '이 화면에서만 쓰는 동작은 떠 있는 툴바(Floating), 여러 화면에서 같은 동작은 화면 끝까지 붙은 툴바(Docked)를 써요(M3).', principle: 'P5' },
          { axis: 'Scroll', text: '내용을 내려 읽는 동안에는 툴바를 화면 밖으로 숨겼다가, 올리면 다시 보여 줘요(M3 허용).', principle: 'P2' },
          { axis: 'Filled button', text: '눈에 띄어야 할 동작 하나만 색을 채운 아이콘 버튼으로 둬요(M3).', principle: 'P1' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 진한 색 툴바는 칠한 바탕이 흰 면을 가려 화면이 덜 밝아져요. 진한 색 툴바를 쓰고, 내용을 읽는 동안에는 숨겨요.',
        set: [
          [{ kind: 'live', src: '[data-tb-live="floating"]', tweaks: [{ sel: '.m3-toolbar', attrs: { 'data-color': 'vibrant' } }, { sel: '[data-tb-fab]', attrs: { 'data-color': 'tertiary-container' } }] }],
        ],
        rules: [
          { axis: 'Vibrant color', text: '진한 색 툴바(Vibrant)를 써요. 칠한 바탕이 흰 면을 가려요. M3도 동작을 강조할 때 쓰라고 해요.', principle: 'P1' },
          { axis: 'Floating · Docked', text: '이 화면에서만 쓰는 동작은 떠 있는 툴바(Floating), 여러 화면에서 같은 동작은 화면 끝까지 붙은 툴바(Docked)를 써요(M3).', principle: 'P5' },
          { axis: 'Scroll', text: '내용을 내려 읽는 동안에는 툴바를 화면 밖으로 숨겼다가, 올리면 다시 보여 줘요(M3 허용).', principle: 'P2' },
          { axis: 'Filled button', text: '눈에 띄어야 할 동작 하나만 색을 채운 아이콘 버튼으로 둬요(M3).', principle: 'P1' },
        ],
      },
    },
  },
  tooltips: {
    grade: 'C',
    principles: ['P5'],
    modes: {
      'dark-saving': {
        lead: '툴팁은 마우스를 올리거나 길게 누를 때만 잠깐 떠 있다 사라져요. 어두운 화면에서도 밝기에 거의 영향이 없어 M3 기본 그대로 써도 돼요.',
        set: [
          [{ kind: 'live', src: '#plain-tooltip-variants [data-tt-live]' }, { kind: 'live', src: '#rich-tooltip-variants [data-tt-live]' }],
        ],
        rules: [
          { axis: 'Plain tooltip', text: '아이콘 버튼에 이름을 짧게 알려 줄 때 써요. 한두 줄로 써요.', principle: 'P5' },
          { axis: 'Rich tooltip', text: '설명이 더 필요할 때 제목 · 글 · 버튼 하나까지 둬요.', principle: 'P5' },
          { axis: 'Behavior', text: '마우스를 올리거나 포커스 · 길게 누를 때만 나타났다 사라져요. 꼭 알아야 할 내용은 툴팁에만 두지 않아요(M3).', principle: 'P5' },
        ],
      },
      'light-saving': {
        lead: '밝은 화면은 흰 배경이 가장 밝게 켜지는 부분이에요. 툴팁은 잠깐 떠 있다 사라지는 작은 상자라 흰 화면의 밝기를 거의 바꾸지 않아요. M3 기본 그대로 써도 돼요.',
        set: [
          [{ kind: 'live', src: '#plain-tooltip-variants [data-tt-live]' }, { kind: 'live', src: '#rich-tooltip-variants [data-tt-live]' }],
        ],
        rules: [
          { axis: 'Plain tooltip', text: '아이콘 버튼에 이름을 짧게 알려 줄 때 써요. 한두 줄로 써요.', principle: 'P5' },
          { axis: 'Rich tooltip', text: '설명이 더 필요할 때 제목 · 글 · 버튼 하나까지 둬요.', principle: 'P5' },
          { axis: 'Behavior', text: '마우스를 올리거나 포커스 · 길게 누를 때만 나타났다 사라져요. 꼭 알아야 할 내용은 툴팁에만 두지 않아요(M3).', principle: 'P5' },
        ],
      },
    },
  },
};

/**
 * 절감 등급(명세 2.3) — 화면에 얼마나 오래, 넓게 나타나는지에 따른 등급. Components 메뉴와 페이지 첫 제목의 표시(동그라미 안 글자)가 쓴다.
 */
export const SAVING_GRADES = {
  A: { label: 'A등급', text: '늘 보이고 면적이 넓어요. 가장 먼저, 적극적으로 바꿔요.' },
  B: { label: 'B등급', text: '자주 보이고 면적이 중간이에요. 읽기 쉬운 선에서 골라 바꿔요.' },
  C: { label: 'C등급', text: '잠깐 보이고 면적이 작아요. 원칙적으로 M3 그대로 두고 쓰는 법을 제안해요.' },
};

/**
 * 메뉴 항목 하나의 절감 등급 — 그 묶음의 Saving UI 항목('#buttons-saving')이 가리키는 추천 조합의 등급.
 * @param {string[]} items 메뉴 항목이 보여 주는 견본 이름 목록
 * @returns {'A'|'B'|'C'|null}
 */
export function savingGradeFor(items) {
  const id = (items || []).find(name => /^#.+-saving$/.test(name));
  return (id && SAVING_RECIPES[id.slice(1, -'-saving'.length)]?.grade) || null;
}
