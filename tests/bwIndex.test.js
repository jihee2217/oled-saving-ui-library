/**
 * bwIndex.test.js
 * BW Index 8개 앵커점 자기검증 (PRD 6.1)
 * 브라우저 콘솔 또는 Node.js에서 실행 가능
 *
 * 브라우저 실행: fetch/import 지원 브라우저에서 script type="module"로 로드
 * Node.js 실행:  node --experimental-vm-modules tests/bwIndex.test.js
 */

import { calcBwIndex, selfValidate } from '../scripts/bwIndex.js';

const TOLERANCE = 1e-9;

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

let passed = 0;
let failed = 0;

console.log('═══════════════════════════════════════');
console.log('  BW Index 앵커점 자기검증 (6.1)');
console.log('═══════════════════════════════════════\n');

cases.forEach(({ label, r, g, b, expected }) => {
  const actual = calcBwIndex(r, g, b);
  const diff = Math.abs(actual - expected);
  const ok = diff < TOLERANCE;

  if (ok) {
    passed++;
    console.log(`✅ ${label.padEnd(8)} RGB(${String(r).padStart(3)}, ${String(g).padStart(3)}, ${String(b).padStart(3)}) → BW=${actual.toFixed(4)} (expected=${expected.toFixed(4)})`);
  } else {
    failed++;
    console.error(`❌ ${label.padEnd(8)} RGB(${String(r).padStart(3)}, ${String(g).padStart(3)}, ${String(b).padStart(3)}) → BW=${actual.toFixed(6)} ≠ ${expected.toFixed(4)} (diff=${diff.toExponential(3)})`);
  }
});

console.log(`\n───────────────────────────────────────`);
console.log(`  결과: ${passed}/${cases.length} 통과 ${failed > 0 ? `(${failed}개 실패)` : '✓'}`);
console.log(`───────────────────────────────────────\n`);

// selfValidate() 함수 별도 검증
const result = selfValidate();
console.assert(result.passed, '❌ selfValidate()가 false를 반환함 — 트라이리니어 보간 공식 재확인 필요');
if (result.passed) {
  console.log('✅ selfValidate() 함수 검증 완료\n');
}

export { passed, failed };
if (failed || !result.passed) throw new Error('BW Index anchor validation failed');
