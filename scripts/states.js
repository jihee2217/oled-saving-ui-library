// M3 Foundations › Interaction › States (m3.material.io/foundations/interaction/states, 2026-09-28 확인).
// 상태 레이어는 콘텐츠 색을 고정 불투명도로 컨테이너 위에 얹는다. 값은 tokens.css --md-state-*와 같다(단위 테스트).

export const STATE_LAYER_OPACITY = { enabled: 0, hover: 0.08, focus: 0.1, pressed: 0.1, dragged: 0.16 };
export const DISABLED_OPACITY = { content: 0.38, container: 0.12 };
export const STATE_NAMES = { enabled: 'Enabled', hover: 'Hovered', focus: 'Focused', pressed: 'Pressed', dragged: 'Dragged' };
// 한 번에 한 레이어 — 여럿이 겹치면 뒤쪽이 이긴다(CSS 규칙 순서와 같다).
export const STATE_PRIORITY = ['hover', 'focus', 'pressed', 'dragged'];

/** 현재 켜진 상태들 중 레이어로 보일 하나 */
export function activeState(flags) {
  let top = 'enabled';
  for (const s of STATE_PRIORITY) if (flags[s]) top = s;
  return top;
}

/** 'rgb(1, 2, 3)' · 'rgba(...)' · 'color(srgb 0.1 0.2 0.3)' → [r, g, b] 0~255 */
export function parseLayerColor(text) {
  const srgb = text.match(/color\(srgb\s+([\d.e-]+)\s+([\d.e-]+)\s+([\d.e-]+)/);
  if (srgb) return srgb.slice(1, 4).map(v => Number(v) * 255);
  const rgb = text.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/);
  if (rgb) return rgb.slice(1, 4).map(Number);
  return null;
}

/** 컨테이너 위에 콘텐츠 색을 opacity만큼 섞은 색 (sRGB, color-mix와 같다) */
export function stateLayerColor(container, content, opacity) {
  return container.map((c, i) => c * (1 - opacity) + content[i] * opacity);
}

const stateChannel = v => { const x = v / 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; };
const stateLuminance = ([r, g, b]) => 0.2126 * stateChannel(r) + 0.7152 * stateChannel(g) + 0.0722 * stateChannel(b);
export function layerContrast(a, b) {
  const [x, y] = [stateLuminance(a), stateLuminance(b)].sort((m, n) => n - m);
  return (x + 0.05) / (y + 0.05);
}

/** 끄는 카드 위치: 이동 뒤 트랙 안으로 자른다 */
export function dragPosition(current, delta, max) {
  return Math.min(max, Math.max(0, current + delta));
}
