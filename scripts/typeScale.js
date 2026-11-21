// M3 Typography › Type scale & tokens (m3.material.io/styles/typography/type-scale-tokens, 2026-09-28 확인).
// 기본(Baseline) 15단계 + 강조(Emphasized) 15단계. 크기 · 줄 높이 dp, 굵기, 자간 px.
// 값의 정본은 이 표이고 styles/tokens.css의 --md-type-* 가 같은 값을 쓴다(단위 테스트가 대조).
// 강조 굵기는 사이트 표의 'wght' 축 값(Title M·S · Label 600)을 쓴다 — CSS font-weight가 곧 wght 축이다.
// 정적 글꼴용 weight(700)는 명세 3.2.1 대조표에 적는다.

export const TYPE_ROLES = ['display', 'headline', 'title', 'body', 'label'];
export const TYPE_SIZES = ['large', 'medium', 'small'];

const row = (size, lineHeight, weight, tracking) => ({ size, lineHeight, weight, tracking });

export const TYPE_SCALE = {
  baseline: {
    'display-large': row(57, 64, 400, 0),
    'display-medium': row(45, 52, 400, 0),
    'display-small': row(36, 44, 400, 0),
    'headline-large': row(32, 40, 400, 0),
    'headline-medium': row(28, 36, 400, 0),
    'headline-small': row(24, 32, 400, 0),
    'title-large': row(22, 28, 400, 0),
    'title-medium': row(16, 24, 500, 0),
    'title-small': row(14, 20, 500, 0),
    'body-large': row(16, 24, 400, 0),
    'body-medium': row(14, 20, 400, 0),
    'body-small': row(12, 16, 400, 0.1),
    'label-large': row(14, 20, 500, 0),
    'label-medium': row(12, 16, 500, 0.1),
    'label-small': row(11, 16, 500, 0.1),
  },
  emphasized: {
    'display-large': row(57, 64, 500, 0),
    'display-medium': row(45, 52, 500, 0),
    'display-small': row(36, 44, 500, 0),
    'headline-large': row(32, 40, 500, 0),
    'headline-medium': row(28, 36, 500, 0),
    'headline-small': row(24, 32, 500, 0),
    'title-large': row(22, 28, 500, 0),
    'title-medium': row(16, 24, 600, 0),
    'title-small': row(14, 20, 600, 0),
    'body-large': row(16, 24, 500, 0),
    'body-medium': row(14, 20, 500, 0),
    'body-small': row(12, 16, 500, 0),
    'label-large': row(14, 20, 600, 0),
    'label-medium': row(12, 16, 600, 0.1),
    'label-small': row(11, 16, 600, 0.1),
  },
};

/** 'display-large' 같은 스타일 키 */
export const typeKey = (role, size) => `${role}-${size}`;

const entry = (role, size, emphasized) => TYPE_SCALE[emphasized ? 'emphasized' : 'baseline'][typeKey(role, size)];

/** CSS 변수 이름. 강조는 --md-type-emphasized-{role}-{size}. */
export function typeToken(role, size, emphasized = false) {
  return `--md-type-${emphasized ? 'emphasized-' : ''}${typeKey(role, size)}`;
}

/** 'Display Large' · 'Emphasized Display Large' */
export function typeName(role, size, emphasized = false) {
  const cap = text => text[0].toUpperCase() + text.slice(1);
  return `${emphasized ? 'Emphasized ' : ''}${cap(role)} ${cap(size)}`;
}

/** 견본 메타 '57/64 · 400 · 0' (크기/줄 높이 · 굵기 · 자간) */
export function typeMeta(role, size, emphasized = false) {
  const t = entry(role, size, emphasized);
  return `${t.size}/${t.lineHeight} · ${t.weight} · ${t.tracking}`;
}

/** CSS font 줄 값 (rem은 16px 기준) */
export function typeCss(t, family = 'var(--font-sans)') {
  const rem = px => `${+(px / 16).toFixed(4)}rem`;
  return `${t.weight} ${rem(t.size)}/${rem(t.lineHeight)} ${family}`;
}

/** 줄 높이 ÷ 글자 크기 (M3 Applying type: 큰 글자 ≈1.2, 본문 · 라벨 ≈1.5) */
export function lineHeightRatio(role, size, emphasized = false) {
  const t = entry(role, size, emphasized);
  return Math.round((t.lineHeight / t.size) * 100) / 100;
}
