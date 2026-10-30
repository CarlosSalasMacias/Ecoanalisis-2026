import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect } from 'vitest';

export function loadFixture<T = any>(name: string): T | null {
  const p = resolve(__dirname, '../validation/fixtures', `${name}.json`);
  return existsSync(p) ? (JSON.parse(readFileSync(p, 'utf8')) as T) : null;
}

/** Relative/absolute closeness check that prints the failing index. */
export function expectClose(actual: number, expected: number, tol = 1e-8, label = '') {
  const diff = Math.abs(actual - expected);
  const scale = Math.max(1, Math.abs(expected));
  expect(diff / scale, `${label}: got ${actual}, expected ${expected}`).toBeLessThanOrEqual(tol);
}

export function expectArrayClose(actual: number[], expected: number[], tol = 1e-8, label = '') {
  expect(actual.length, `${label}: length`).toBe(expected.length);
  actual.forEach((v, i) => expectClose(v, expected[i], tol, `${label}[${i}]`));
}

/** Compares score matrices column by column allowing an arbitrary sign flip per axis (SVD sign ambiguity). */
export function expectScoresClose(actual: number[][], expected: number[][], axes: number, tol = 1e-6, label = '') {
  for (let a = 0; a < axes; a++) {
    const act = actual.map(r => r[a]);
    const exp = expected.map(r => r[a]);
    const dot = act.reduce((s, v, i) => s + v * exp[i], 0);
    const sign = dot < 0 ? -1 : 1;
    expectArrayClose(act.map(v => v * sign), exp, tol, `${label} axis ${a + 1}`);
  }
}
