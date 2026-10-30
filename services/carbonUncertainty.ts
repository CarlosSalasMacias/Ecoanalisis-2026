/**
 * Incertidumbre del carbono aéreo y comparación entre tipos de vegetación.
 *
 * 1. Valor por parcela: carbono de la parcela (Mg) / área de la parcela (ha). Las parcelas declaradas
 *    en la configuración que no tienen ningún individuo cuentan con 0 Mg C ha⁻¹.
 * 2. Incertidumbre de muestreo: media de las parcelas ± error estándar e IC del 95 % con la t de Student.
 * 3. Incertidumbre total (Monte Carlo, como BIOMASS::AGBmonteCarlo de Réjou-Méchain et al. 2017):
 *    en cada simulación se sortea la densidad de cada individuo (normal truncada a 0.08–1.39 g cm⁻³,
 *    con la DE de su nivel taxonómico), el error residual de la ecuación alométrica (cuando la fuente
 *    lo publica) y se remuestrean las parcelas de cada tipo con reposición. El IC es el percentil
 *    2.5–97.5 de las simulaciones.
 * 4. Comparación entre tipos de vegetación: Kruskal–Wallis sobre los valores por parcela y
 *    comparaciones de Dunn con p ajustado por Benjamini–Hochberg.
 */
import { EQUATIONS, computeAGB, residualSdLn } from './biomassEquations';
import { normalDraw, tQuantile } from './stats/distributions';
import { DunnPair, KruskalResult, dunnTest, kruskalWallis } from './stats/nonparametric';
import { createRng, DEFAULT_SEED } from './stats/random';
import type { ForestDataRow, PlotInfo } from '../types';

export const DENSITY_SD_COLUMN = 'DE densidad (g/cm3)';
const RHO_MIN = 0.08;
const RHO_MAX = 1.39;

export interface TypeCarbonStats {
  type: string;
  plotArea_ha: number;
  nPlots: number;
  /** Parcelas declaradas sin individuos (valor 0). */
  emptyPlots: number;
  plotValues: { plot: string; carbonPerHa: number }[];
  mean: number;
  sd: number;
  se: number;
  /** IC del 95 % solo por muestreo (t de Student). */
  ciSampling: [number, number] | null;
  /** IC del 95 % por Monte Carlo (ecuación + densidad + muestreo). */
  ciTotal: [number, number] | null;
}

export interface CarbonUncertainty {
  byType: TypeCarbonStats[];
  /** Todo el estudio: carbono total / área total muestreada. */
  overall: { carbonPerHa: number; ciTotal: [number, number] | null };
  nSimulations: number;
  seed: number;
  /** Ecuaciones usadas con y sin error residual publicado. */
  equationsWithModelError: string[];
  equationsWithoutModelError: string[];
  comparison: { kruskal: KruskalResult; dunn: DunnPair[] } | null;
}

const parseNum = (v: unknown) => {
  const n = typeof v === 'number' ? v : parseFloat(String(v ?? '').replace(',', '.'));
  return Number.isFinite(n) ? n : NaN;
};

const quantile = (sorted: number[], q: number) => {
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos), hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
};

const meanOf = (x: number[]) => x.reduce((a, b) => a + b, 0) / x.length;

export function carbonUncertainty(
  rows: ForestDataRow[], plotInfo: PlotInfo, carbonFraction: number,
  { nSimulations = 1000, seed = DEFAULT_SEED }: { nSimulations?: number; seed?: number } = {},
): CarbonUncertainty {
  // Individuos con biomasa calculada, agrupados por tipo y parcela.
  const trees = rows.filter(r => typeof r['AGB_Mg'] === 'number' && r['Ecuación']);
  const types = Array.from(new Set(rows.map(r => String(r['Tipo de vegetación'] ?? '')).filter(Boolean))).sort();
  const usedEq = Array.from(new Set(trees.map(r => String(r['Ecuación']))));

  interface PlotData { plot: string; area: number; trees: ForestDataRow[] }
  const plotsByType: Record<string, PlotData[]> = {};
  const areaByType: Record<string, number> = {};
  types.forEach(type => {
    const info = plotInfo[type];
    const area = parseNum(info?.plotArea) / 10000;
    const declared = Math.round(parseNum(info?.numPlots));
    if (!(area > 0)) return;
    const observed = Array.from(new Set(rows.filter(r => r['Tipo de vegetación'] === type).map(r => String(r['Parcela'])))).sort();
    const plots: PlotData[] = observed.map(plot => ({
      plot, area, trees: trees.filter(r => r['Tipo de vegetación'] === type && String(r['Parcela']) === plot),
    }));
    const empty = Number.isFinite(declared) ? Math.max(0, declared - observed.length) : 0;
    for (let i = 0; i < empty; i++) plots.push({ plot: `(vacía ${i + 1})`, area, trees: [] });
    plotsByType[type] = plots;
    areaByType[type] = area;
  });

  const plotCarbon = (p: PlotData) => p.trees.reduce((s, r) => s + (r['AGB_Mg'] as number) * carbonFraction, 0) / p.area;

  // Monte Carlo.
  const rng = createRng(seed);
  const sims: Record<string, number[]> = Object.fromEntries(Object.keys(plotsByType).map(t => [t, []]));
  const overallSims: number[] = [];
  const treeInfo = new Map<ForestDataRow, { eq: string; sdLn: number | null; rho: number; rhoSd: number; needsRho: boolean }>();
  trees.forEach(r => {
    const eq = String(r['Ecuación']);
    treeInfo.set(r, {
      eq, sdLn: residualSdLn(eq), needsRho: EQUATIONS[eq]?.needsDensity ?? false,
      rho: parseNum(r['Densidad usada (g/cm3)']), rhoSd: parseNum(r[DENSITY_SD_COLUMN]),
    });
  });
  const drawRho = (mu: number, sd: number) => {
    if (!(sd > 0)) return mu;
    for (let k = 0; k < 100; k++) {
      const v = mu + sd * normalDraw(rng);
      if (v >= RHO_MIN && v <= RHO_MAX) return v;
    }
    return Math.min(RHO_MAX, Math.max(RHO_MIN, mu));
  };

  for (let s = 0; s < nSimulations; s++) {
    let totalC = 0, totalA = 0;
    Object.entries(plotsByType).forEach(([type, plots]) => {
      const values = plots.map(p => p.trees.reduce((acc, r) => {
        const info = treeInfo.get(r)!;
        let agbKg = (r['AGB_Mg'] as number) * 1000;
        if (info.needsRho && info.rho > 0) {
          const v = computeAGB(info.eq, r, { rho: drawRho(info.rho, info.rhoSd) });
          if (v !== null) agbKg = v;
        }
        if (info.sdLn) agbKg *= Math.exp(info.sdLn * normalDraw(rng));
        return acc + (agbKg / 1000) * carbonFraction;
      }, 0) / p.area);
      // Remuestreo de parcelas con reposición.
      let sum = 0;
      for (let i = 0; i < values.length; i++) sum += values[Math.floor(rng() * values.length)];
      const m = sum / values.length;
      sims[type].push(m);
      totalC += m * values.length * areaByType[type];
      totalA += values.length * areaByType[type];
    });
    if (totalA > 0) overallSims.push(totalC / totalA);
  }

  const byType: TypeCarbonStats[] = Object.entries(plotsByType).map(([type, plots]) => {
    const vals = plots.map(plotCarbon);
    const n = vals.length;
    const mean = meanOf(vals);
    const sd = n > 1 ? Math.sqrt(vals.reduce((a, v) => a + (v - mean) ** 2, 0) / (n - 1)) : 0;
    const se = n > 1 ? sd / Math.sqrt(n) : 0;
    const t = n > 1 ? tQuantile(0.975, n - 1) : NaN;
    const sorted = sims[type].slice().sort((a, b) => a - b);
    return {
      type, plotArea_ha: areaByType[type], nPlots: n, emptyPlots: plots.filter(p => p.trees.length === 0 && p.plot.startsWith('(')).length,
      plotValues: plots.map((p, i) => ({ plot: p.plot, carbonPerHa: vals[i] })),
      mean, sd, se,
      // El carbono no puede ser negativo: el límite inferior se trunca en 0.
      ciSampling: n > 1 ? [Math.max(0, mean - t * se), mean + t * se] : null,
      ciTotal: sorted.length && n > 1 ? [quantile(sorted, 0.025), quantile(sorted, 0.975)] : null,
    };
  });

  const totalArea = byType.reduce((a, b) => a + b.nPlots * b.plotArea_ha, 0);
  const overallPoint = totalArea > 0 ? byType.reduce((a, b) => a + b.mean * b.nPlots * b.plotArea_ha, 0) / totalArea : NaN;
  const overallSorted = overallSims.slice().sort((a, b) => a - b);

  const testable = byType.filter(b => b.nPlots >= 2);
  const comparison = testable.length >= 2
    ? {
        kruskal: kruskalWallis(testable.map(b => b.plotValues.map(v => v.carbonPerHa))),
        dunn: dunnTest(testable.map(b => b.plotValues.map(v => v.carbonPerHa)), testable.map(b => b.type)),
      }
    : null;

  return {
    byType,
    overall: { carbonPerHa: overallPoint, ciTotal: overallSorted.length ? [quantile(overallSorted, 0.025), quantile(overallSorted, 0.975)] : null },
    nSimulations, seed,
    equationsWithModelError: usedEq.filter(e => residualSdLn(e) !== null),
    equationsWithoutModelError: usedEq.filter(e => residualSdLn(e) === null),
    comparison,
  };
}
