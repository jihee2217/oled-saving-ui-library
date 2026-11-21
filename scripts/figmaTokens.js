/**
 * figmaTokens.js
 * Figma 변수 가져오기(Variables › Import)에 맞춘 디자인 토큰 묶음을 만든다. (기준서 TKN-08, 2026-10-04 개편)
 *
 * Figma 기본 가져오기 규칙(help.figma.com «Modes for variables»):
 *   - DTCG JSON 파일 하나 = 모드 하나. 새 컬렉션에 여러 파일을 끌어 넣으면 파일마다 모드가 생긴다.
 *   - 받는 타입: color(srgb · hsl) · dimension(px만) · number · fontFamily(이름 하나) · duration(s만).
 *   - typography · shadow · cubicBezier 같은 복합 타입은 받지 않는다 → styles.tokens.json에 따로 두고
 *     Figma 텍스트 · 이펙트 스타일은 별도로 만든다.
 * 그래서 색은 「어두운 · 밝은 × 대비 기본 · 중간 · 높음」 6개 파일이 같은 변수 이름을 갖고,
 * 나머지 기초 토큰은 컬렉션 하나당 파일 하나다. 변수 이름 끝은 CSS 커스텀 프로퍼티 이름과 같다.
 * 그룹 수준 $type 상속과 루트 $키는 쓰지 않는다(가져오기 도구마다 해석이 달라서) — 모든 토큰에 $type을 단다.
 */

import { hslToRgb, rgbToHex } from './colorModel.js';
import { calcBwIndex } from './bwIndex.js';
import { CONTRAST_LEVELS } from './contrastLevels.js';
import { levelTokens, deriveSchemeColors } from './scheme.js';
import { deriveTonalPalettes } from './m3Palette.js';
import { TYPE_SCALE } from './typeScale.js';
import { SPRINGS, SPRING_SCHEMES, SPRING_SPEEDS, SPRING_TYPES, springDuration, EASINGS, DURATIONS } from './motion.js';
import { STATE_LAYER_OPACITY, DISABLED_OPACITY } from './states.js';
import { makeZip } from './zip.js';
import { savingWeight } from './saving.js';

export const EXT = 'kr.bwindex.energy-saving-ui';

const PRESET_MODE = { 'dark-saving': 'Dark', 'light-saving': 'Light' };
const LEVEL_MODE = { standard: 'Standard', medium: 'Medium', high: 'High' };

/** 색 변수 배치. 그룹 → 변수 이름(= CSS 변수 이름에서 -- 를 뺀 것). */
export const COLOR_LAYOUT = {
  primary: ['primary', 'on-primary', 'primary-container', 'on-primary-container', 'inverse-primary'],
  secondary: ['secondary', 'on-secondary', 'secondary-container', 'on-secondary-container'],
  tertiary: ['tertiary', 'on-tertiary', 'tertiary-container', 'on-tertiary-container'],
  error: ['error', 'on-error', 'error-container', 'on-error-container'],
  surface: ['background', 'on-background', 'surface', 'on-surface', 'surface-variant', 'on-surface-variant',
    'surface-dim', 'surface-bright', 'surface-container-lowest', 'surface-container-low', 'surface-container',
    'surface-container-high', 'surface-container-highest', 'inverse-surface', 'on-inverse-surface', 'scrim'],
  outline: ['outline', 'outline-variant'],
  fixed: ['primary-fixed', 'primary-fixed-dim', 'on-primary-fixed', 'on-primary-fixed-variant',
    'secondary-fixed', 'secondary-fixed-dim', 'on-secondary-fixed', 'on-secondary-fixed-variant',
    'tertiary-fixed', 'tertiary-fixed-dim', 'on-tertiary-fixed', 'on-tertiary-fixed-variant'],
  text: ['text-on-container', 'primary-on-bg', 'secondary-on-bg', 'error-on-bg', 'error-hover-on-bg', 'text-disabled', 'text-disabled-container'],
};

/** 계산기의 4토큰(BW Index 정본)이 들어가는 자리. */
const BW_SOURCE = { background: 'bg', 'surface-container': 'surface', 'on-surface': 'text', primary: 'accent' };

const TEXT_ROLE_NOTE = {
  'text-on-container': '컨테이너 위 본문 — Text 명도를 surface-container · 선택 덮개 위 대비로 보정(명세 4.1.5)',
  'primary-on-bg': '글자로 쓰는 Primary — 배경 · 표면 위 본문 기준을 채우도록 명도만 보정(명세 4.1.4)',
  'secondary-on-bg': '글자로 쓰는 Secondary — 활성 라벨 등(명세 4.1.8)',
  'error-on-bg': '글자로 쓰는 Error — 오류 라벨 · 안내 글(명세 4.1.8)',
  'error-hover-on-bg': '오류 필드 hover 라벨 — 기본 단계는 on-error-container, 높은 단계는 hover 바탕까지 기준(명세 4.1.8)',
  'text-disabled': '비활성 글자 — Text 38%(M3 disabled content)',
  'text-disabled-container': '비활성 컨테이너 — Text 12%(M3 disabled container)',
};

const round4 = v => Math.round(v * 10000) / 10000;

export function colorValue({ h, s, l }, alpha = 1) {
  const { r, g, b } = hslToRgb(h, s, l);
  return {
    colorSpace: 'srgb',
    components: [round4(r / 255), round4(g / 255), round4(b / 255)],
    alpha,
    hex: rgbToHex(r, g, b),
  };
}

function colorToken(color, description, ext, alpha = 1) {
  const { r, g, b } = hslToRgb(color.h, color.s, color.l);
  return {
    $type: 'color',
    $value: colorValue(color, alpha),
    $description: description,
    $extensions: { [EXT]: {
      ...ext,
      bwIndex: Number(calcBwIndex(r, g, b).toFixed(3)),
      hsl: { h: Number(color.h.toFixed(2)), s: Number(color.s.toFixed(2)), l: Number(color.l.toFixed(2)) },
    } },
  };
}

const px = value => ({ value, unit: 'px' });
const dim = (value, description) => ({ $type: 'dimension', $value: px(value), ...(description ? { $description: description } : {}) });
const num = (value, description) => ({ $type: 'number', $value: value, ...(description ? { $description: description } : {}) });
const sec = ms => ({ $type: 'duration', $value: { value: Math.round(ms) / 1000, unit: 's' } });

/** 모드 이름 — 파일 이름이 되고, Figma에서 모드 이름이 된다. */
export function modeName(preset, levelKey) {
  return `${PRESET_MODE[preset]}-${LEVEL_MODE[levelKey]}`;
}

/**
 * 색 모드 파일 하나.
 * @param {{tokens, intent}} draft 그 모드의 작업본
 */
export function buildColorMode(draft, preset, levelKey) {
  const tokens = levelTokens(draft, preset, levelKey);
  const scheme = deriveSchemeColors(tokens, preset, levelKey);
  const pick = name => {
    if (name === 'surface-container') return { color: tokens.surface, source: 'token' };
    if (name === 'text-on-container') return { color: scheme.containerText.color, source: 'profile' };
    if (name === 'primary-on-bg') return { color: scheme.primaryText.color, source: 'profile' };
    if (name === 'secondary-on-bg') return { color: scheme.secondaryText.color, source: 'profile' };
    if (name === 'error-on-bg') return { color: scheme.errorText.color, source: 'profile' };
    if (name === 'error-hover-on-bg') return { color: scheme.errorHoverText.color, source: 'profile' };
    if (name === 'text-disabled') return { color: tokens.text, alpha: DISABLED_OPACITY.content, source: 'profile' };
    if (name === 'text-disabled-container') return { color: tokens.text, alpha: DISABLED_OPACITY.container, source: 'profile' };
    const role = scheme.roles[name];
    if (role) return { color: role, source: role.source, tone: role.tone, family: role.family };
    const container = scheme.containers[name];
    if (container) return { color: container, source: 'derived', tone: container.tone, family: 'neutral' };
    throw new Error(`색 역할 없음: ${name}`);
  };
  const doc = {};
  for (const [group, names] of Object.entries(COLOR_LAYOUT)) {
    doc[group] = {};
    for (const name of names) {
      const { color, alpha = 1, source, tone, family } = pick(name);
      const bwToken = BW_SOURCE[name];
      const description = bwToken
        ? `계산기 4토큰 ${{ bg: 'Background', surface: 'Surface', text: 'Text', accent: 'Primary' }[bwToken]} — BW Index 정본`
        : TEXT_ROLE_NOTE[name]
          || (name === 'surface' ? 'M3 surface — 이 시스템에서는 surface-container(Surface 토큰)와 같은 값' : `4토큰에서 파생한 M3 역할 (${name})`);
      doc[group][name] = colorToken(color, description, {
        cssVar: `--${name}`,
        source: bwToken ? 'token' : source,
        ...(bwToken ? { bwToken } : {}),
        ...(tone !== undefined ? { tone } : {}),
        ...(family ? { family } : {}),
      }, alpha);
    }
  }
  return doc;
}

/**
 * 톤 팔레트(M3 Tonal palettes) — 그 모드의 Primary에서 파생한 여섯 계열 × 톤 14단계.
 * 대비 단계와 무관하므로 모드마다 파일 하나다. Figma 공식 M3 키트의 Tonal Palettes 견본을 채우는 데 쓴다.
 */
export function buildPalette(draft) {
  const doc = {};
  for (const { key, label, tones } of deriveTonalPalettes(draft.tokens.accent)) {
    const group = key.replace(/[A-Z]/g, c => '-' + c.toLowerCase());
    doc[group] = {};
    for (const { tone, color } of tones) doc[group][String(tone)] = colorToken(color, `${label} 톤 ${tone}`, { palette: group, tone });
  }
  return doc;
}

/* ─── 기초 토큰(모드 하나). 값은 styles/tokens.css와 같다 — 단위 테스트가 대조한다. ─── */

export const SPACE = { 0: 0, 25: 2, 50: 4, 75: 6, 100: 8, 125: 10, 150: 12, 175: 14, 200: 16, 250: 20,
  300: 24, 400: 32, 450: 36, 500: 40, 600: 48, 700: 56, 800: 64, 900: 72 };
export const SHAPE = { none: 0, xs: 4, sm: 8, md: 12, lg: 16, 'lg-increased': 20, xl: 28, 'xl-increased': 32, xxl: 48, full: 9999 };
/** M3 elevation 1~5: [y, blur, spread] × (그림자 30% · 15%). x는 0. */
export const ELEVATION = {
  1: [[1, 2, 0], [1, 3, 1]],
  2: [[1, 2, 0], [2, 6, 2]],
  3: [[1, 3, 0], [4, 8, 3]],
  4: [[2, 3, 0], [6, 10, 4]],
  5: [[4, 4, 0], [8, 12, 6]],
};
/**
 * Figma 미리보기용 대리 글꼴. 사이트는 웹폰트 없이 기기 글꼴 목록(--font-sans, SUS-01)을 쓰고,
 * Figma 글자에는 글꼴이 반드시 있어야 하므로 하나를 고른다(2026-10-04 결정).
 * Gothic A1(2026-11-17 변경, 옛 값 Noto Sans KR): Figma 기본 제공 한글 글꼴 가운데 100~900 굵기가 모두 있고 모양이 중립적이다.
 * Noto Sans KR은 Figma 플러그인 API가 SemiBold(600)를 불러오지 못해, 600을 쓰는 스타일(강조 5개 · 밝은 절감형)을 만들 수 없었다.
 * Figma 텍스트 스타일은 이 값을 담은 font/sans 변수에 묶는다.
 */
export const FIGMA_FONT_FAMILY = 'Gothic A1';

/** 절감형 텍스트 스타일 묶음 이름 → 모드. Figma에서 saving-dark/* · saving-light/* 폴더가 된다. */
export const SAVING_TYPE_GROUPS = { 'saving-dark': 'dark-saving', 'saving-light': 'light-saving' };
const SAVING_TYPE_LABEL = { 'dark-saving': '어두운 절감형', 'light-saving': '밝은 절감형' };

export function buildSpace() {
  const doc = {};
  for (const [step, value] of Object.entries(SPACE)) doc[`space-${step}`] = dim(value, `--md-space-${step}`);
  return doc;
}

export function buildShape() {
  const doc = {};
  for (const [name, value] of Object.entries(SHAPE)) {
    doc[`shape-${name}`] = dim(value, name === 'full' ? '--md-shape-full (완전한 원 — 요소 높이의 절반과 같음)' : `--md-shape-${name}`);
  }
  return doc;
}

export function buildTypescale() {
  const doc = { font: { sans: { $type: 'fontFamily', $value: FIGMA_FONT_FAMILY,
    $description: 'Figma 미리보기용 대리 글꼴. 실제 화면은 기기 글꼴(--font-sans: Mac · iPhone SF Pro + Apple SD Gothic Neo, Windows Segoe UI + 맑은 고딕, Android Roboto + Noto Sans CJK KR). 이 값만 바꾸면 텍스트 스타일 전체가 바뀐다.' } } };
  for (const [scale, rows] of Object.entries(TYPE_SCALE)) {
    doc[scale] = {};
    for (const [name, row] of Object.entries(rows)) {
      const css = scale === 'baseline' ? `--md-type-${name}` : `--md-type-emphasized-${name}`;
      doc[scale][name] = {
        size: dim(row.size, css),
        'line-height': dim(row.lineHeight, css),
        weight: num(row.weight, css),
        tracking: dim(row.tracking, `${css}-tracking`),
      };
    }
  }
  // 절감형 굵기(명세 3.10) — 크기 · 줄 높이 · 자간은 M3 그대로라 굵기 변수만 따로 둔다.
  for (const [group, mode] of Object.entries(SAVING_TYPE_GROUPS)) {
    doc[group] = {};
    for (const [scale, rows] of Object.entries(TYPE_SCALE)) {
      doc[group][scale] = {};
      for (const [name, row] of Object.entries(rows)) {
        doc[group][scale][name] = { weight: num(savingWeight(row.weight, scale === 'emphasized', mode),
          `${SAVING_TYPE_LABEL[mode]} 굵기 — M3 ${row.weight} (명세 3.10)`) };
      }
    }
  }
  return doc;
}

export function buildState() {
  const pct = v => Math.round(v * 100);
  return {
    layer: Object.fromEntries(Object.entries(STATE_LAYER_OPACITY).filter(([k]) => k !== 'enabled')
      .map(([k, v]) => [k, num(pct(v), `상태 레이어 불투명도 % (--md-state-${k === 'focus' ? 'focus' : k})`)])),
    disabled: {
      content: num(pct(DISABLED_OPACITY.content), '비활성 콘텐츠 불투명도 % (--md-state-disabled-content)'),
      container: num(pct(DISABLED_OPACITY.container), '비활성 컨테이너 불투명도 % (--md-state-disabled-container)'),
    },
    'focus-ring': {
      width: dim(3, '--md-focus-ring-width'),
      offset: dim(2, '--md-focus-ring-offset'),
    },
  };
}

export function buildMotion() {
  const duration = {};
  for (const [group, values] of Object.entries(DURATIONS)) {
    values.forEach((ms, i) => { duration[`${group}${i + 1}`] = { ...sec(ms), $description: `--md-duration-${group}${i + 1}` }; });
  }
  const spring = {};
  for (const scheme of SPRING_SCHEMES) for (const speed of SPRING_SPEEDS) for (const type of SPRING_TYPES) {
    const name = `${scheme}-${speed}-${type}`;
    spring[name] = { ...sec(springDuration(SPRINGS[scheme][speed][type])),
      $description: `스프링 정착 시간 (--md-motion-spring-${name}-duration). 곡선은 styles.tokens.json` };
  }
  return { duration, spring };
}

/** Figma 기본 가져오기가 받지 않는 복합 토큰(DTCG 표준 형식). Style Dictionary · 플러그인 · 스타일 생성용. */
export function buildStyles() {
  const typography = {};
  for (const [scale, rows] of Object.entries(TYPE_SCALE)) {
    typography[scale] = {};
    for (const [name, row] of Object.entries(rows)) {
      typography[scale][name] = {
        $type: 'typography',
        $value: {
          fontFamily: FIGMA_FONT_FAMILY,
          fontSize: px(row.size),
          fontWeight: row.weight,
          lineHeight: Math.round((row.lineHeight / row.size) * 10000) / 10000,
          letterSpacing: px(row.tracking),
        },
        $description: `${scale === 'baseline' ? '' : 'Emphasized '}${name} — ${row.size}/${row.lineHeight}`,
        // Figma 텍스트 스타일 생성용: 스타일 이름과, 각 속성을 묶을 typescale 변수 이름(typescale.tokens.json과 같은 경로).
        $extensions: { [EXT]: {
          cssVar: scale === 'baseline' ? `--md-type-${name}` : `--md-type-emphasized-${name}`,
          lineHeightPx: row.lineHeight,
          figma: {
            styleName: `${scale}/${name}`,
            variables: {
              fontFamily: 'font/sans',
              fontSize: `${scale}/${name}/size`,
              lineHeight: `${scale}/${name}/line-height`,
              fontWeight: `${scale}/${name}/weight`,
              letterSpacing: `${scale}/${name}/tracking`,
            },
          },
        } },
      };
    }
  }
  // 절감형 글자 스타일: M3 스타일과 크기 · 줄 높이 · 자간 변수를 함께 쓰고 굵기만 절감형 변수에 묶는다.
  for (const [group, mode] of Object.entries(SAVING_TYPE_GROUPS)) {
    typography[group] = {};
    for (const [scale, rows] of Object.entries(TYPE_SCALE)) {
      typography[group][scale] = {};
      for (const [name, row] of Object.entries(rows)) {
        const weight = savingWeight(row.weight, scale === 'emphasized', mode);
        typography[group][scale][name] = {
          $type: 'typography',
          $value: {
            fontFamily: FIGMA_FONT_FAMILY,
            fontSize: px(row.size),
            fontWeight: weight,
            lineHeight: Math.round((row.lineHeight / row.size) * 10000) / 10000,
            letterSpacing: px(row.tracking),
          },
          $description: `${SAVING_TYPE_LABEL[mode]} ${scale === 'baseline' ? '' : 'Emphasized '}${name} — ${row.size}/${row.lineHeight} · 굵기 ${weight}(M3 ${row.weight})`,
          $extensions: { [EXT]: {
            lineHeightPx: row.lineHeight,
            saving: mode,
            figma: {
              styleName: `${group}/${scale}/${name}`,
              variables: {
                fontFamily: 'font/sans',
                fontSize: `${scale}/${name}/size`,
                lineHeight: `${scale}/${name}/line-height`,
                fontWeight: `${group}/${scale}/${name}/weight`,
                letterSpacing: `${scale}/${name}/tracking`,
              },
            },
          } },
        };
      }
    }
  }
  const black = alpha => ({ colorSpace: 'srgb', components: [0, 0, 0], alpha, hex: '#000000' });
  const elevation = { 'elevation-0': { $type: 'shadow', $value: [], $description: '--md-elevation-0 (그림자 없음)',
    $extensions: { [EXT]: { cssVar: '--md-elevation-0', figma: { styleName: 'elevation/elevation-0' } } } } };
  for (const [level, [umbra, penumbra]] of Object.entries(ELEVATION)) {
    elevation[`elevation-${level}`] = {
      $type: 'shadow',
      $value: [[umbra, 0.3], [penumbra, 0.15]].map(([[y, blur, spread], alpha]) => ({
        color: black(alpha), offsetX: px(0), offsetY: px(y), blur: px(blur), spread: px(spread),
      })),
      $description: `--md-elevation-${level}`,
      $extensions: { [EXT]: { cssVar: `--md-elevation-${level}`, figma: { styleName: `elevation/elevation-${level}` } } },
    };
  }
  const easing = {};
  for (const [name, curve] of Object.entries(EASINGS)) {
    easing[name] = { $type: 'cubicBezier', $value: curve, $description: `--md-easing-${name}` };
  }
  return {
    typography,
    elevation,
    easing,
  };
}

const README = `BW Index 절감형 디자인 시스템 — Figma 토큰 묶음
=================================================

■ 넣는 방법 (권장) — Figma 플러그인 「BW Index 토큰 가져오기」
  플러그인을 열고 이 zip을 그대로 고른 뒤 「가져오기」.
    · 변수 컬렉션 Color · Space · Shape · Typescale · State · Motion
    · 텍스트 스타일 baseline/* · emphasized/* 30개 — 글꼴 · 크기 · 줄 높이 · 굵기 · 자간이 Typescale 변수에 묶인다
    · 절감형 텍스트 스타일 saving-dark/* · saving-light/* 60개 — 굵기만 절감형 변수(어두운 400 · 강조 500, 밝은 M3 +100)에 묶인다
    · 그림자 스타일 elevation/* 6개
  변수마다 뜨는 자리(스코프)와 코드 표기(var(--…))도 단다. 다시 실행하면 같은 이름은 값만 고친다.
  색 모드: Professional 이상은 '6개 모두', Starter(컬렉션당 모드 1개)는 하나를 고른다.
           Starter에서 다른 모드로 바꾸려면 그 모드를 골라 다시 실행한다.

■ 넣는 방법 (플러그인 없이) — Figma 변수 패널에 파일 끌어 넣기
  변수만 들어가고 텍스트 · 그림자 스타일은 만들어지지 않는다(Figma가 묶음 값을 파일로 받지 않음).
  color/           6개 모드 파일. 컬렉션 'Color'에 한꺼번에(Professional 이상) 또는 하나만(Starter).
  space · shape · typescale · state · motion .tokens.json   각각 같은 이름의 컬렉션으로.

■ styles.tokens.json
  글자 스타일 30 + 절감형 60 · 그림자 elevation 0~5 · 이징 곡선(DTCG 복합 타입). 플러그인이 이 파일로 스타일을 만든다.
  이징 곡선은 Figma 스타일이 없어 기록용이다. Style Dictionary 등은 이 파일을 그대로 읽는다.

■ palette-dark · palette-light .tokens.json
  그 모드의 Primary에서 파생한 톤 팔레트(Primary · Secondary · Tertiary · Error · Neutral · Neutral variant × 톤 14단계).
  공식 M3 키트 사본에서 플러그인을 실행하면 M3 컬렉션의 Palettes/* 변수로 들어가 Styles 페이지의 Tonal Palettes 견본에 반영된다.

■ 글꼴
  사이트는 웹폰트 없이 기기 글꼴(var(--font-sans))로 보인다. Figma 글자에는 글꼴이 꼭 있어야 하므로
  typescale의 font/sans = 'Gothic A1'을 미리보기용 대리 글꼴로 둔다. 텍스트 스타일이 이 변수에 묶여
  변수 값 하나로 전체 글꼴을 바꿀 수 있다. 자간은 M3 사이트(Google Sans) 값이라 어느 글꼴에도 완전히 맞지는 않다.

■ 이름 규칙
  변수 이름의 마지막 부분 = 사이트 CSS 변수 이름. 예) surface/surface-container-high → var(--surface-container-high)
  기초 토큰은 앞에 md- 를 붙인다. 예) space-200 → var(--md-space-200), shape-md → var(--md-shape-md)
  모션 시간은 플러그인으로 넣으면 ms, 파일로 끌어 넣으면 Figma 규칙대로 초 단위로 들어간다.

■ 값의 출처
  색은 계산기 4토큰(Background · Surface · Text · Primary)에서 파생했다. 4토큰 자리는
  surface/background · surface/surface-container · surface/on-surface · primary/primary 이고
  $extensions의 bwToken으로 표시했다. bwIndex는 0(검정)~1(흰색) 상대 지표이며 절대 소비전력이 아니다.
  Primary 등 4토큰을 바꾸면 Figma 값은 따라 바뀌지 않는다 — 다시 내보내 플러그인을 다시 실행한다.
`;

/**
 * 묶음에 들어갈 파일 목록.
 * @param {{drafts: object}} source 모드별 작업본 {'dark-saving': {tokens, intent}, 'light-saving': ...}
 */
export function buildFigmaTokenFiles(source, exportedAt = new Date()) {
  const json = obj => JSON.stringify(obj, null, 2) + '\n';
  const files = [];
  for (const preset of Object.keys(PRESET_MODE)) {
    for (const levelKey of Object.keys(CONTRAST_LEVELS)) {
      files.push({ name: `color/${modeName(preset, levelKey)}.tokens.json`, text: json(buildColorMode(source.drafts[preset], preset, levelKey)) });
    }
  }
  for (const preset of Object.keys(PRESET_MODE)) {
    files.push({ name: `palette-${PRESET_MODE[preset].toLowerCase()}.tokens.json`, text: json(buildPalette(source.drafts[preset])) });
  }
  files.push(
    { name: 'space.tokens.json', text: json(buildSpace()) },
    { name: 'shape.tokens.json', text: json(buildShape()) },
    { name: 'typescale.tokens.json', text: json(buildTypescale()) },
    { name: 'state.tokens.json', text: json(buildState()) },
    { name: 'motion.tokens.json', text: json(buildMotion()) },
    { name: 'styles.tokens.json', text: json(buildStyles()) },
    { name: 'README.txt', text: README + `\n내보낸 시각: ${exportedAt.toISOString()}\n` },
  );
  return files;
}

export const FIGMA_TOKENS_FILE = 'bw-index-figma-tokens.zip';

/** 계산기 버튼: 현재 화면 값을 반영한 두 모드 작업본으로 묶음을 만들어 내려받는다. */
export function downloadFigmaTokens(state) {
  const drafts = { ...state.drafts, [state.preset]: { tokens: state.tokens, intent: state.intent } };
  const bytes = makeZip(buildFigmaTokenFiles({ drafts }));
  const blob = new Blob([bytes], { type: 'application/zip' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = FIGMA_TOKENS_FILE;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
