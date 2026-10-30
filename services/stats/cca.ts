/**
 * Canonical Correspondence Analysis (ter Braak 1986, Ecology 67:1167–1179).
 *
 * Numerically equivalent to `vegan::cca(Y ~ ., data = X)`:
 *  1. Chi-square standardised residuals  Q̄ = (P − r cᵀ) / sqrt(r cᵀ), with P = Y / ΣY.
 *  2. Environmental matrix centred with site weights r and multiplied by sqrt(r).
 *  3. Q̄ is projected on the column space of the weighted environment (weighted regression).
 *  4. SVD of the fitted values gives the constrained axes; eigenvalues are squared singular values.
 *
 * Scores use vegan's "scaling = 2" (species scaled by sqrt(eigenvalue); sites as weighted averages
 * of species scores; environmental arrows = correlations with the linear-combination site scores).
 * Significance of the constrained ordination uses a permutation test of the pseudo-F statistic,
 * equivalent to `anova.cca()` without conditioning variables.
 */

import { Matrix, SingularValueDecomposition } from 'ml-matrix';
import { createRng, DEFAULT_SEED, shuffleInPlace } from './random';

export interface CCAInput {
  /** sites × species abundance matrix */
  Y: number[][];
  /** sites × environmental variables matrix (numeric, complete) */
  X: number[][];
  siteNames: string[];
  speciesNames: string[];
  envNames: string[];
}

export interface CCAResult {
  totalInertia: number;
  constrainedInertia: number;
  unconstrainedInertia: number;
  /** Constrained eigenvalues (CCA1, CCA2, …) */
  eigenvalues: number[];
  /** Unconstrained (residual) eigenvalues (CA1, CA2, …) */
  residualEigenvalues: number[];
  /** Proportion of total inertia per constrained axis, in % */
  axisPercent: number[];
  rank: number;
  /** Scaling-2 scores, first two axes (or fewer if rank < 2) */
  species: { name: string; x: number; y: number; weight: number }[];
  sitesWA: { name: string; x: number; y: number; weight: number }[];
  sitesLC: { name: string; x: number; y: number }[];
  biplot: { name: string; x: number; y: number }[];
  vif: Record<string, number>;
  /** Raw scores for all constrained axes (for testing/export) */
  raw: {
    speciesScores: number[][];
    siteWAScores: number[][];
    siteLCScores: number[][];
    biplotScores: number[][];
  };
}

const TOL = 1e-9;

interface Core {
  Qbar: Matrix;
  r: number[];
  c: number[];
  total: number;
}

function chiResiduals(Y: number[][]): Core {
  const n = Y.length;
  const p = Y[0].length;
  const total = Y.reduce((a, row) => a + row.reduce((s, v) => s + v, 0), 0);
  const r = Y.map(row => row.reduce((s, v) => s + v, 0) / total);
  const c = new Array(p).fill(0);
  Y.forEach(row => row.forEach((v, j) => (c[j] += v / total)));
  const Qbar = new Matrix(n, p);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < p; j++) {
      const e = r[i] * c[j];
      Qbar.set(i, j, (Y[i][j] / total - e) / Math.sqrt(e));
    }
  }
  return { Qbar, r, c, total };
}

/** Weighted centring of X with weights r, then multiplication of each row by sqrt(r_i). */
function weightedEnv(X: number[][], r: number[]): Matrix {
  const n = X.length;
  const k = X[0].length;
  const means = new Array(k).fill(0);
  X.forEach((row, i) => row.forEach((v, j) => (means[j] += r[i] * v)));
  const Z = new Matrix(n, k);
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < k; j++) Z.set(i, j, Math.sqrt(r[i]) * (X[i][j] - means[j]));
  }
  return Z;
}

/** Orthonormal basis of the column space of Z (via SVD, dropping null directions). */
function columnBasis(Z: Matrix): Matrix {
  const svd = new SingularValueDecomposition(Z, { autoTranspose: true });
  const s = svd.diagonal;
  const maxS = Math.max(...s, 0);
  const keep = s.map((v, i) => ({ v, i })).filter(o => o.v > maxS * 1e-7).map(o => o.i);
  const U = svd.leftSingularVectors;
  return new Matrix(U.to2DArray().map(row => keep.map(i => row[i])));
}

function constrainedInertia(Qbar: Matrix, Z: Matrix): number {
  const U = columnBasis(Z);
  const fitted = U.mmul(U.transpose().mmul(Qbar));
  return fitted.to2DArray().reduce((a, row) => a + row.reduce((s, v) => s + v * v, 0), 0);
}

function sumSquares(M: Matrix): number {
  return M.to2DArray().reduce((a, row) => a + row.reduce((s, v) => s + v * v, 0), 0);
}

function svdPositive(M: Matrix): { d: number[]; U: Matrix; V: Matrix } {
  if (M.rows === 0 || M.columns === 0) return { d: [], U: new Matrix(M.rows, 0), V: new Matrix(M.columns, 0) };
  const svd = new SingularValueDecomposition(M, { autoTranspose: true });
  const d = svd.diagonal;
  const maxD = Math.max(...d, 0);
  const keep = d.map((v, i) => ({ v, i })).filter(o => o.v > Math.max(maxD * 1e-7, TOL)).map(o => o.i);
  const pick = (A: Matrix) => new Matrix(A.to2DArray().map(row => keep.map(i => row[i])));
  return { d: keep.map(i => d[i]), U: pick(svd.leftSingularVectors), V: pick(svd.rightSingularVectors) };
}

/** Variance inflation factors computed as in vegan::vif.cca (weighted correlation matrix of X). */
function varianceInflation(Z: Matrix, envNames: string[]): Record<string, number> {
  const k = Z.columns;
  const out: Record<string, number> = {};
  if (k === 1) {
    out[envNames[0]] = 1;
    return out;
  }
  const C = Z.transpose().mmul(Z);
  const d = Array.from({ length: k }, (_, i) => Math.sqrt(C.get(i, i)));
  const R = new Matrix(k, k);
  for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) R.set(i, j, C.get(i, j) / (d[i] * d[j]));
  try {
    const svd = new SingularValueDecomposition(R);
    const inv = svd.inverse();
    envNames.forEach((name, i) => (out[name] = inv.get(i, i)));
  } catch {
    envNames.forEach(name => (out[name] = Infinity));
  }
  envNames.forEach(name => {
    if (!Number.isFinite(out[name]) || out[name] > 1e12) out[name] = Infinity;
  });
  return out;
}

export function cca(input: CCAInput): CCAResult {
  const { Y, X, siteNames, speciesNames, envNames } = input;
  if (Y.length !== X.length) throw new Error('CCA: species and environmental tables have different numbers of sites.');
  if (Y.length < 3) throw new Error('CCA: at least 3 plots with both species and environmental data are needed.');

  const { Qbar, r, c } = chiResiduals(Y);
  const totalInertia = sumSquares(Qbar);
  const Z = weightedEnv(X, r);
  const U = columnBasis(Z);
  const fitted = U.mmul(U.transpose().mmul(Qbar));
  const residual = Qbar.clone().sub(fitted);

  const con = svdPositive(fitted);
  const res = svdPositive(residual);
  const eigenvalues = con.d.map(v => v * v);
  const residualEigenvalues = res.d.map(v => v * v);
  const constrained = eigenvalues.reduce((a, b) => a + b, 0);

  // vegan's normalised scores
  const v = con.V.to2DArray().map((row, j) => row.map(x => x / Math.sqrt(c[j])));
  const u = con.U.to2DArray().map((row, i) => row.map(x => x / Math.sqrt(r[i])));
  const waRaw = Qbar.mmul(con.V).to2DArray().map((row, i) => row.map((x, a) => x / con.d[a] / Math.sqrt(r[i])));

  // Biplot scores (vegan): cosine between each weighted, centred variable and the orthonormal LC axes,
  // i.e. the weighted correlation of the variable with the site constraint scores.
  const biplotScores = envNames.map((_, e) => {
    const zcol = Z.getColumn(e);
    const norm = Math.sqrt(zcol.reduce((s, v) => s + v * v, 0));
    return con.d.map((_, a) => {
      const ucol = con.U.getColumn(a);
      return norm > 0 ? zcol.reduce((s, v, i) => s + v * ucol[i], 0) / norm : 0;
    });
  });

  // Scaling 2: species × sqrt(eig); sites and biplot unscaled.
  const slam = eigenvalues.map(Math.sqrt);
  const speciesScores = v.map(row => row.map((x, a) => x * slam[a]));
  const siteWAScores = waRaw;
  const siteLCScores = u;

  const xy = (row: number[]) => ({ x: row[0] ?? 0, y: row[1] ?? 0 });
  return {
    totalInertia,
    constrainedInertia: constrained,
    unconstrainedInertia: totalInertia - constrained,
    eigenvalues,
    residualEigenvalues,
    axisPercent: eigenvalues.map(e => (100 * e) / totalInertia),
    rank: eigenvalues.length,
    species: speciesNames.map((name, j) => ({ name, ...xy(speciesScores[j]), weight: c[j] })),
    sitesWA: siteNames.map((name, i) => ({ name, ...xy(siteWAScores[i]), weight: r[i] })),
    sitesLC: siteNames.map((name, i) => ({ name, ...xy(siteLCScores[i]) })),
    biplot: envNames.map((name, e) => ({ name, ...xy(biplotScores[e]) })),
    vif: varianceInflation(Z, envNames),
    raw: { speciesScores, siteWAScores, siteLCScores, biplotScores },
  };
}

export interface PermutationTest {
  F: number;
  df: number;
  dfResidual: number;
  p: number;
  nPermutations: number;
  seed: number;
}

/** Permutation test of the whole constrained ordination (pseudo-F), as vegan::anova.cca(). */
export function ccaPermutationTest(
  input: CCAInput,
  { nPermutations = 999, seed = DEFAULT_SEED }: { nPermutations?: number; seed?: number } = {},
): PermutationTest {
  const { Qbar, r } = chiResiduals(input.Y);
  const total = sumSquares(Qbar);
  const Z = weightedEnv(input.X, r);
  const q = columnBasis(Z).columns;
  const n = input.Y.length;
  const dfResidual = n - q - 1;
  if (q === 0 || dfResidual <= 0) {
    return { F: NaN, df: q, dfResidual, p: NaN, nPermutations: 0, seed };
  }
  const fStat = (con: number) => con / q / ((total - con) / dfResidual);
  const F = fStat(constrainedInertia(Qbar, Z));

  const rng = createRng(seed);
  const idx = Array.from({ length: n }, (_, i) => i);
  let exceed = 0;
  for (let k = 0; k < nPermutations; k++) {
    shuffleInPlace(idx, rng);
    const Xp = idx.map(i => input.X[i]);
    const Zp = weightedEnv(Xp, r);
    if (fStat(constrainedInertia(Qbar, Zp)) >= F * (1 - 1e-10)) exceed++;
  }
  return { F, df: q, dfResidual, p: (exceed + 1) / (nPermutations + 1), nPermutations, seed };
}

export interface Ellipse {
  group: string;
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  angle: number; // radians
}

/**
 * 95% dispersion ellipses of site scores by group (vegan::ordiellipse(kind = "sd", conf = 0.95),
 * weighted by site weights as vegan does for CCA).
 */
export function groupEllipses(
  points: { x: number; y: number; weight: number }[],
  groups: string[],
  conf = 0.95,
): Ellipse[] {
  const scale = Math.sqrt(-2 * Math.log(1 - conf)); // sqrt(qchisq(conf, 2))
  const out: Ellipse[] = [];
  for (const g of Array.from(new Set(groups)).sort()) {
    const pts = points.filter((_, i) => groups[i] === g);
    if (pts.length < 3) continue;
    const wsum = pts.reduce((a, p) => a + p.weight, 0);
    const w = pts.map(p => p.weight / wsum);
    const cx = pts.reduce((a, p, i) => a + w[i] * p.x, 0);
    const cy = pts.reduce((a, p, i) => a + w[i] * p.y, 0);
    // cov.wt(method = "unbiased")
    const denom = 1 - w.reduce((a, wi) => a + wi * wi, 0);
    let sxx = 0;
    let syy = 0;
    let sxy = 0;
    pts.forEach((p, i) => {
      sxx += w[i] * (p.x - cx) ** 2;
      syy += w[i] * (p.y - cy) ** 2;
      sxy += w[i] * (p.x - cx) * (p.y - cy);
    });
    sxx /= denom;
    syy /= denom;
    sxy /= denom;
    const tr = sxx + syy;
    const det = sxx * syy - sxy * sxy;
    const disc = Math.sqrt(Math.max(0, (tr * tr) / 4 - det));
    const l1 = tr / 2 + disc;
    const l2 = Math.max(0, tr / 2 - disc);
    const angle = Math.abs(sxy) > 1e-15 ? Math.atan2(l1 - sxx, sxy) : sxx >= syy ? 0 : Math.PI / 2;
    out.push({ group: g, cx, cy, rx: scale * Math.sqrt(l1), ry: scale * Math.sqrt(l2), angle });
  }
  return out;
}
