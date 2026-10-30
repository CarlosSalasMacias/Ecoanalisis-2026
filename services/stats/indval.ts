/**
 * Indicator species analysis.
 *
 * Follows `indicspecies::multipatt(func = "IndVal.g", duleg = TRUE)` (De Cáceres & Legendre 2009,
 * Ecology 90:3566–3574), based on Dufrêne & Legendre (1997, Ecol. Monogr. 67:345–366):
 *   A = specificity (mean abundance in the group / sum of group means; corrects for unequal group sizes)
 *   B = fidelity (fraction of plots of the group where the species occurs)
 *   stat = sqrt(A · B)   (IndVal.g, reported by indicspecies)
 *   IndVal% = 100 · A · B (classic Dufrêne & Legendre value, reported by labdsv::indval)
 * Significance: the species' maximum statistic over groups is compared with the maximum obtained after
 * randomly permuting plots among groups (free permutations, seeded and reproducible).
 */

import { adjustBH } from './special';
import { createRng, DEFAULT_SEED, shuffleInPlace } from './random';

export interface IndValGroupValue {
  A: number;
  B: number;
  stat: number; // sqrt(A·B)
  indvalPct: number; // 100·A·B
}

export interface IndValSpeciesResult {
  species: string;
  bestGroup: string;
  groups: Record<string, IndValGroupValue>;
  stat: number;
  indvalPct: number;
  p: number;
  pAdj: number;
}

export interface IndValOutput {
  groups: string[];
  nPermutations: number;
  seed: number;
  species: IndValSpeciesResult[];
}

/**
 * @param abundance plots × species abundance matrix (rows = plots).
 * @param speciesNames column names.
 * @param groups group label of each plot.
 */
export function indicatorSpecies(
  abundance: number[][],
  speciesNames: string[],
  groups: string[],
  { nPermutations = 999, seed = DEFAULT_SEED }: { nPermutations?: number; seed?: number } = {},
): IndValOutput {
  const groupNames = Array.from(new Set(groups)).sort();
  const nPlots = abundance.length;
  const nSp = speciesNames.length;
  const groupIndex = groups.map(g => groupNames.indexOf(g));

  const compute = (labels: number[]) => {
    const G = groupNames.length;
    const size = new Array(G).fill(0);
    labels.forEach(g => size[g]++);
    const sums: number[][] = Array.from({ length: nSp }, () => new Array(G).fill(0));
    const occ: number[][] = Array.from({ length: nSp }, () => new Array(G).fill(0));
    for (let i = 0; i < nPlots; i++) {
      const g = labels[i];
      const row = abundance[i];
      for (let j = 0; j < nSp; j++) {
        if (row[j] > 0) {
          sums[j][g] += row[j];
          occ[j][g] += 1;
        }
      }
    }
    return { size, sums, occ };
  };

  const valuesFor = (j: number, c: ReturnType<typeof compute>) => {
    const means = c.sums[j].map((s, g) => (c.size[g] > 0 ? s / c.size[g] : 0));
    const total = means.reduce((a, b) => a + b, 0);
    return means.map((m, g) => {
      const A = total > 0 ? m / total : 0;
      const B = c.size[g] > 0 ? c.occ[j][g] / c.size[g] : 0;
      return { A, B, stat: Math.sqrt(A * B), indvalPct: 100 * A * B };
    });
  };

  const observed = compute(groupIndex);
  const results: IndValSpeciesResult[] = speciesNames.map((sp, j) => {
    const vals = valuesFor(j, observed);
    let best = 0;
    vals.forEach((v, g) => {
      if (v.stat > vals[best].stat) best = g;
    });
    const groupsOut: Record<string, IndValGroupValue> = {};
    vals.forEach((v, g) => (groupsOut[groupNames[g]] = v));
    return {
      species: sp,
      bestGroup: groupNames[best],
      groups: groupsOut,
      stat: vals[best].stat,
      indvalPct: vals[best].indvalPct,
      p: 1,
      pAdj: 1,
    };
  });

  const exceed = new Array(nSp).fill(0);
  const rng = createRng(seed);
  const labels = groupIndex.slice();
  const eps = 1e-12;
  for (let k = 0; k < nPermutations; k++) {
    shuffleInPlace(labels, rng);
    const c = compute(labels);
    for (let j = 0; j < nSp; j++) {
      const maxStat = Math.max(...valuesFor(j, c).map(v => v.stat));
      if (maxStat >= results[j].stat - eps) exceed[j]++;
    }
  }
  results.forEach((r, j) => (r.p = (exceed[j] + 1) / (nPermutations + 1)));
  const adj = adjustBH(results.map(r => r.p));
  results.forEach((r, j) => (r.pAdj = adj[j]));

  return { groups: groupNames, nPermutations, seed, species: results };
}
