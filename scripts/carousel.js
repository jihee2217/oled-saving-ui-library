// Carousel 키라인 배치 — M3 Carousel Specs · MDC CarouselLayoutManager · Compose Keylines.kt를 웹으로 옮긴 계산(명세 4.5.2).
// 항목은 "슬롯"(화면 위 자리) 사이를 스크롤 위치에 따라 보간한다. 앞·뒤 바깥에는 폭 10의 앵커 슬롯이 있어
// 항목이 빠져나가며 줄어든다. 끝에 가까워지면 배치가 좌우 반전된 끝 상태로 옮겨 가 마지막 항목도 크게 보인다.

export const CAROUSEL = { padding: 16, gap: 8, smallMin: 40, smallMax: 56, anchor: 10, radius: 28, mediumLargeThreshold: 0.85 };

const clampSmall = v => Math.min(CAROUSEL.smallMax, Math.max(CAROUSEL.smallMin, v));
const lerp = (a, b, t) => a + (b - a) * t;

/**
 * layout: 'multi-browse' | 'hero' | 'center-hero'
 * width: 캐러셀 컨테이너 폭(좌우 여백 16 포함), preferred: 원하는 large 폭
 * → { layout, sizes(슬롯 폭 목록), large, medium, small, focalStart, focalCount }
 */
export function carouselArrangement(layout, width, preferred) {
  const { padding, gap } = CAROUSEL;
  const avail = Math.max(0, width - padding * 2);
  let best = null;
  for (let count = 1; count <= 8; count += 1) {
    let small = clampSmall(preferred / 3);
    let large = 0;
    let medium = 0;
    let withMedium = layout === 'multi-browse';
    const solve = () => {
      if (layout === 'multi-browse' && withMedium) {
        large = (avail - 1.5 * small - gap * (count + 1)) / (count + 0.5);
        medium = (large + small) / 2;
        if (medium > large * CAROUSEL.mediumLargeThreshold) withMedium = false;
      }
      if (layout === 'hero' || (layout === 'multi-browse' && !withMedium)) {
        large = (avail - small - gap * count) / count;
        medium = 0;
      }
      if (layout === 'center-hero') large = (avail - 2 * small - gap * (count + 1)) / count;
    };
    for (let k = 0; k < 6; k += 1) { solve(); small = clampSmall(large / 3); }
    solve();   // 마지막 small로 large·medium을 다시 풀어 폭 합을 정확히 맞춘다
    if (!(large > small)) break;
    const score = Math.abs(large - preferred);
    if (!best || score < best.score) best = { count, large, medium, small, withMedium, score };
  }
  if (!best) best = { count: 1, large: avail, medium: 0, small: CAROUSEL.smallMin, withMedium: false };
  const L = Array(best.count).fill(best.large);
  let sizes;
  if (layout === 'center-hero') sizes = [best.small, ...L, best.small];
  else if (layout === 'multi-browse' && best.withMedium) sizes = [...L, best.medium, best.small];
  else sizes = [...L, best.small];
  return {
    layout, sizes, large: best.large, medium: best.medium, small: best.small,
    focalStart: layout === 'center-hero' ? 1 : 0, focalCount: best.count,
  };
}

/** 슬롯 상자(왼쪽 x, 폭). 좌우 여백 16에서 시작해 간격 8로 잇는다. */
export function carouselSlots(sizes) {
  let x = CAROUSEL.padding;
  return sizes.map(w => { const box = { x, w }; x += w + CAROUSEL.gap; return box; });
}

/** 스크롤 위치(항목 단위)의 최댓값. center-hero는 모든 항목이 가운데에 올 수 있다. */
export function carouselMaxPosition(arrangement, count) {
  if (arrangement.layout === 'center-hero') return Math.max(0, count - 1);
  return Math.max(0, count - arrangement.sizes.length);
}

/** 항목 i의 화면 상자. p = 스크롤 위치(항목 단위, 실수). */
export function carouselItemBox(i, p, arrangement, width, count) {
  const { anchor } = CAROUSEL;
  const leftAnchor = { x: -anchor, w: anchor };      // 앵커는 컨테이너 바로 바깥
  const rightAnchor = { x: width, w: anchor };
  const at = (slots, s) => {
    const lo = Math.floor(s);
    const t = s - lo;
    const get = k => (k < 0 ? leftAnchor : k >= slots.length ? rightAnchor : slots[k]);
    const a = get(lo);
    const b = get(lo + 1);
    return { x: lerp(a.x, b.x, t), w: lerp(a.w, b.w, t) };
  };
  const start = carouselSlots(arrangement.sizes);
  if (arrangement.layout === 'center-hero') return at(start, i - p + arrangement.focalStart);
  const startBox = at(start, i - p);
  const pMax = carouselMaxPosition(arrangement, count);
  const rest = arrangement.sizes.length - arrangement.focalCount;
  if (pMax === 0 || rest === 0) return startBox;
  const end = carouselSlots([...arrangement.sizes].reverse());
  const endBox = at(end, i - p);
  const range = Math.min(rest, pMax);
  const t = Math.min(1, Math.max(0, (p - (pMax - range)) / range));
  return { x: lerp(startBox.x, endBox.x, t), w: lerp(startBox.w, endBox.w, t) };
}
