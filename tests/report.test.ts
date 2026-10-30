import { describe, expect, it } from 'vitest';
import { auditInterpretation, buildInterpretationPrompt, isTraceable } from '../services/report/aiReport';
import { buildMethodology } from '../services/report/methods';
import { REFERENCES, cite, citeInText, formatReference } from '../services/references';
import { runBiomassAnalysis } from '../services/analysisService';

const dossier = 'Shannon H\' = 2.345; Chao-1 = 41.27 (35.10–52.88); coverage 93.4%; p = 0.012, FDR-adjusted p = 0.048; 999 permutations; CCA1 explains 18.2%; constrained inertia 0.4561.';

describe('fixed bibliography', () => {
  it('every reference has the fields needed for APA formatting', () => {
    Object.values(REFERENCES).forEach(r => {
      expect(r.authors.length, r.key).toBeGreaterThan(0);
      expect(r.title.length, r.key).toBeGreaterThan(5);
      if (r.verification === 'crossref') expect(r.doi, r.key).toBeTruthy();
    });
  });

  it('formats in-text citations', () => {
    expect(citeInText('veech2013')).toBe('Veech, 2013');
    expect(citeInText('chaoJost2012')).toBe('Chao y Jost, 2012');
    expect(citeInText('chaoJost2012', 'en')).toBe('Chao & Jost, 2012');
    expect(citeInText('chao2014')).toBe('Chao et al., 2014');
    expect(cite(['hsieh2016', 'chao2014'])).toBe('(Chao et al., 2014; Hsieh et al., 2016)');
    expect(formatReference('veech2013')).toContain('https://doi.org/10.1111/j.1466-8238.2012.00789.x');
  });
});

describe('AI text audit', () => {
  it('turns keys into citations and appends the reference list', () => {
    const out = auditInterpretation('### 1. Diversidad\nH′ fue 2.35 [@shannon1948] y Chao1 41.3 [@chao1984; @chao1987].', dossier, 'es');
    expect(out.markdown).toContain('(Shannon, 1948)');
    expect(out.markdown).toContain('(Chao, 1984, 1987)');
    expect(out.markdown).toContain('## Referencias');
    expect(out.citedKeys.sort()).toEqual(['chao1984', 'chao1987', 'shannon1948']);
    expect(out.issues.untraceableNumbers).toEqual([]);
  });

  it('flags invented keys, author–year citations and numbers not in the results', () => {
    const out = auditInterpretation('La riqueza fue 57.9 especies [@smith2020], similar a Gentry (1988) y Pérez et al. 2015.', dossier, 'es');
    expect(out.issues.invalidKeys).toEqual(['smith2020']);
    expect(out.markdown).toContain('[CITA NO VÁLIDA]');
    expect(out.issues.unkeyedCitations).toEqual(expect.arrayContaining(['Gentry (1988)', 'Pérez et al. 2015']));
    expect(out.issues.untraceableNumbers).toEqual(['57.9']);
  });

  it('removes a reference list written by the AI', () => {
    const out = auditInterpretation('Texto [@veech2013].\n\n### Referencias Bibliográficas\nInventado, A. (2020). Algo.', dossier, 'es');
    expect(out.issues.removedReferenceSection).toBe(true);
    expect(out.markdown).not.toContain('Inventado');
    expect(out.markdown).toContain('Veech, J. A. (2013)');
  });

  it('accepts rounding, percentages, Spanish decimal commas and counts placeholders', () => {
    const v = [2.345, 0.934, 41.27];
    expect(isTraceable('2,35', v)).toBe(true);
    expect(isTraceable('2.3', v)).toBe(true);
    expect(isTraceable('93.4', v)).toBe(true);
    expect(isTraceable('2.4', v)).toBe(false);
    const out = auditInterpretation('Cobertura alta [COMPARAR: cobertura en bosques similares 85 %].', dossier, 'es');
    expect(out.issues.placeholders).toBe(1);
    expect(out.issues.untraceableNumbers).toEqual([]);
  });

  it('the prompt lists only keys from the fixed bibliography', () => {
    const prompt = buildInterpretationPrompt(dossier, 'es');
    const keys = Array.from(prompt.matchAll(/\[@([\w-]+)\]/g), m => m[1]).filter(k => !['veech2013', 'chao2014', 'hsieh2016'].includes(k) || REFERENCES[k]);
    keys.forEach(k => expect(REFERENCES[k], k).toBeDefined());
    expect(prompt).toContain(dossier);
  });
});

describe('deterministic methodology', () => {
  const base = {
    nPlots: 12, nVegetationTypes: 3, nSpecies: 40, nIndividuals: 500, hasEnvironmentalData: true,
    cca: null, biomass: null, siteDescriptions: { Bosque: 'Bosque húmedo premontano.' },
  };

  it('states the real settings and cites only fixed references', () => {
    const m = buildMethodology({ ...base, lang: 'es' });
    expect(m.markdown).toContain('999 permutaciones');
    expect(m.markdown).toContain('100 réplicas bootstrap');
    expect(m.markdown).toContain('Bosque húmedo premontano.');
    expect(m.markdown).not.toContain('Relación especies–ambiente'); // sin CCA
    m.citedKeys.forEach(k => expect(REFERENCES[k]).toBeDefined());
    expect(m.markdown).toContain('## Referencias');
  });

  it('lists the allometric equations actually used and flags unverified ones', () => {
    const tree = (name: string, D: number) => ({ 'Tipo de vegetación': 'SAF', Parcela: 'P1', 'Nombre científico (Completo)': name, 'DAP (cm)': D, 'Altura (m)': '', 'Densidad (g/cm3)': '' });
    const biomass = runBiomassAnalysis([tree('Coffea arabica', 3), tree('Citrus sinensis', 12)] as any, {}, { SAF: { numPlots: '1', plotArea: '1000' } }, []);
    const m = buildMethodology({ ...base, lang: 'en', biomass });
    expect(m.markdown).toContain('log10(AGB) = −1.181 + 1.991 log10(d15)');
    expect(m.markdown).toContain('not verified against the original source');
    expect(m.markdown).toContain('carbon fraction of 0.47');
    expect(m.citedKeys).toEqual(expect.arrayContaining(['segura2006', 'ipcc2006']));
  });
});

import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { parseData, runStructuralAnalysis } from '../services/analysisService';

describe('methodology: crops, wood density, uncertainty and comparisons', () => {
  const db = JSON.parse(readFileSync(resolve(__dirname, '../public/data/gwdd-v2.2-wood-density.json'), 'utf8'));
  const grid = [
    ['Tipo de vegetación', 'Parcela', 'Nombre científico (Completo)', 'N_Científico (Abreviado)', 'DAP (cm)', 'D30 (cm)', 'Altura (m)', 'Densidad (g/cm3)'],
    ['SAF', 'P1', 'Theobroma cacao', 'The cac', '', '12', '3', ''],
    ['SAF', 'P1', 'Cordia alliodora', 'Cor all', '30', '', '18', ''],
    ['SAF', 'P2', 'Cordia alliodora', 'Cor all', '28', '', '17', ''],
    ['Bosque', 'P1', 'Inga edulis', 'Ing edu', '35', '', '20', ''],
    ['Bosque', 'P2', 'Inga edulis', 'Ing edu', '40', '', '22', '0.6'],
  ];
  const data = parseData(grid, true) as any[];
  const plotInfo = { SAF: { numPlots: '2', plotArea: '500' }, Bosque: { numPlots: '2', plotArea: '500' } };
  const biomass = runBiomassAnalysis(data, { SAF: 'chave2014', Bosque: 'chave2014' }, plotInfo, grid[0], 0.47,
    { woodDensity: { db, region: 'South America' }, nSimulations: 100 });
  const m = buildMethodology({
    lang: 'es', nPlots: 4, nVegetationTypes: 2, nSpecies: 3, nIndividuals: 5, hasEnvironmentalData: true,
    structure: runStructuralAnalysis(data, null), cca: null, biomass, siteDescriptions: {},
  });

  it('describes both IVIs and the D30 basal area', () => {
    expect(m.markdown).toContain('sin las especies de cultivo (*The cac*)');
    expect(m.markdown).toContain('diámetro a 30 cm (1 individuos)');
  });

  it('describes GWDD use, Monte Carlo uncertainty, the comparison test and the environmental permutation test', () => {
    expect(m.markdown).toContain('Global Wood Density Database v.2.2');
    expect(m.markdown).toContain('«South America»');
    expect(m.markdown).toContain('100 simulaciones de Monte Carlo');
    expect(m.markdown).toContain('RSE (σ) de la ecuación 4 en Chave et al. (2014)');
    expect(m.markdown).toContain('Cacao, d30 (Andrade et al., 2008)');
    expect(m.markdown).toContain('Kruskal y Wallis (1952)');
    expect(m.markdown).toContain('prueba de permutación bilateral');
    ['fischer2026', 'gwdd2026', 'rejouMechain2017', 'kruskal1952', 'dunn1964', 'magurran2004', 'legendre2012']
      .forEach(k => expect(m.citedKeys).toContain(k));
  });
});
