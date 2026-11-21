/**
 * presets.js
 * 밝은 절감형 / 어두운 절감형 프리셋 기본 토큰 값
 * PRD FR-1, 5장 디자인 시스템 명세
 */

/**
 * 프리셋 토큰 정의
 * 각 토큰: { h, s, l } — HSL 값
 */
export const PRESETS = {
  'dark-saving': {
    label: '어두운 절감형',
    labelEn: 'Dark Energy-Saving',
    dataStyle: 'dark-saving',
    tokens: {
      bg:      { h: 0,   s: 0,  l: 4  },  // Near-black
      surface: { h: 0,   s: 0,  l: 11 },  // Dark gray
      text:    { h: 0,   s: 0,  l: 88 },  // Light gray
      accent:  { h: 10,  s: 65, l: 66 },  // Warm red — 배경 대비 7.24:1(높음 단계 충족), BW 0.510
    },
    description: '블랙 배경 · 어두운 표면 · 공통 컴포넌트 스타일',
  },

  'light-saving': {
    label: '밝은 절감형',
    labelEn: 'Light Energy-Saving',
    dataStyle: 'light-saving',
    tokens: {
      bg:      { h: 40,  s: 20, l: 96 },  // Off-white warm
      surface: { h: 0,   s: 0,  l: 100},  // White
      text:    { h: 0,   s: 0,  l: 10 },  // Near-black
      accent:  { h: 8,   s: 75, l: 34 },  // Deep brick red — 배경 대비 7.32:1(높음 단계 충족), BW 0.135
    },
    description: '오프화이트 배경 · 밝은 표면 · 공통 컴포넌트 스타일',
  },
};

/**
 * 토큰 메타데이터 (라벨, 설명, 아이콘)
 */
export const TOKEN_META = {
  bg: {
    label: 'Background',
    desc: '페이지 전체 바탕, 상단 내비게이션 바, 하단 탭바',
    icon: '⬜',
  },
  surface: {
    label: 'Surface',
    desc: '카드(리스트 아이템), 인용구 박스, 모달, 입력창 배경',
    icon: '🟦',
  },
  text: {
    label: 'Text',
    desc: '본문, 헤드라인, 캡션/메타정보, 플레이스홀더',
    icon: '🔤',
  },
  accent: {
    label: 'Primary / Accent',
    desc: '주요 버튼(CTA), 텍스트 링크, 활성 아이콘, 진행 바',
    icon: '✨',
  },
};
