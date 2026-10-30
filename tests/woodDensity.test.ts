import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { GWDD_REGIONS, WoodDensityDB, lookupWoodDensity, parseTaxon } from '../services/woodDensity';
import { runBiomassAnalysis } from '../services/analysisService';
import { expectClose } from './helpers';

const db: WoodDensityDB = JSON.parse(readFileSync(resolve(__dirname, '../public/data/gwdd-v2.2-wood-density.json'), 'utf8'));

describe('GWDD v2.2 wood density lookup', () => {
  it('file metadata and regions', () => {
    expect(db.meta.database).toBe('Global Wood Density Database v2.2');
    expect(db.intraspecificSD).toBe(0.068);
    expect([...GWDD_REGIONS]).toEqual(db.regions);
  });

  it('parses names with authors and qualifiers', () => {
    expect(parseTaxon('Theobroma cacao L.')).toEqual({ genus: 'theobroma', species: 'theobroma cacao' });
    expect(parseTaxon('Inga sp.')).toEqual({ genus: 'inga', species: null });
    expect(parseTaxon('Ocotea cf. insularis')).toEqual({ genus: 'ocotea', species: 'ocotea insularis' });
  });

  it('species level, global and regional', () => {
    const g = lookupWoodDensity(db, 'Theobroma cacao L.')!;
    expect(g).toMatchObject({ value: 0.413, level: 'especie', region: 'global', n: 19, sd: 0.068 });
    const r = lookupWoodDensity(db, 'Theobroma cacao', undefined, 'South America')!;
    expect(r).toMatchObject({ value: 0.428, level: 'especie', region: 'South America', n: 10 });
  });

  it('falls back to genus and family, adding between-species variation to the SD', () => {
    const c = lookupWoodDensity(db, 'Citrus sinensis')!;
    expect(c.level).toBe('género');
    expect(c.value).toBe(db.global.ge['citrus'][0]);
    expectClose(c.sd, Math.hypot(db.global.ge['citrus'][2]!, 0.068), 1e-12);
    const inga = lookupWoodDensity(db, 'Inga sp.')!;
    expect(inga.level).toBe('género');
    expect(lookupWoodDensity(db, 'Xyzabc nonexistens')).toBeNull();
    const fam = lookupWoodDensity(db, 'Xyzabc nonexistens', 'fabaceae')!;
    expect(fam.level).toBe('familia');
  });

  it('biomass uses the user value first, then GWDD, and reports the sources', () => {
    const row = (name: string, rho: number | '') => ({
      'Tipo de vegetación': 'SAF', Parcela: 'P1', 'Nombre científico (Completo)': name,
      'DAP (cm)': 30, 'Altura (m)': 20, 'Densidad (g/cm3)': rho,
    });
    const res = runBiomassAnalysis([row('Cordia alliodora', 0.5), row('Cordia alliodora', ''), row('Inga sp.', '')] as any,
      { SAF: 'chave2014' }, { SAF: { numPlots: '1', plotArea: '1000' } }, [], 0.47, { woodDensity: { db }, nSimulations: 50 });
    const rows = res.processedData;
    expect(rows[0]['Densidad usada (g/cm3)']).toBe(0.5);
    expect(rows[1]['Densidad usada (g/cm3)']).toBe(0.486);
    expect(String(rows[1]['Fuente densidad'])).toContain('especie');
    expect(res.densitySources).toEqual({ usuario: 1, especie: 1, 'género': 1 });
    expectClose(rows[1]['AGB_Mg'] as number, 0.0673 * Math.pow(0.486 * 900 * 20, 0.976) / 1000, 1e-12);
  });
});
