/**
 * Densidad básica de la madera a partir de la Global Wood Density Database v2.2
 * (Fischer et al. 2026; datos en https://doi.org/10.5281/zenodo.20815517).
 *
 * El archivo public/data/gwdd-v2.2-wood-density.json se genera con data-raw/gwdd_wood_density.R.
 * La búsqueda sigue la lógica de BIOMASS::getWoodDensity: especie, y si no hay datos, género y
 * familia (medias de las medias de sus especies). Si se elige una región, se usa primero la media
 * de esa región y, si no existe, la global del mismo nivel taxonómico.
 */

export type DensityLevel = 'usuario' | 'especie' | 'género' | 'familia' | 'tipo de vegetación';

export interface WoodDensityDB {
  meta: { database: string; citation: string; data_doi: string; records_used: number; species: number };
  intraspecificSD: number;
  regions: string[];
  genusFamily: Record<string, string>;
  global: LevelTables;
  byRegion: Record<string, LevelTables>;
}

interface LevelTables {
  /** especie → [media, nº de registros] */
  sp: Record<string, [number, number]>;
  /** género o familia → [media de medias de especies, nº de especies, DE entre especies | null] */
  ge: Record<string, [number, number, number | null]>;
  fa: Record<string, [number, number, number | null]>;
}

export interface DensityMatch {
  value: number;
  /** Desviación estándar usada en la propagación de la incertidumbre (g cm⁻³). */
  sd: number;
  level: DensityLevel;
  /** Región de la media usada ('global' si es la mundial). */
  region: string;
  /** Registros (especie) o especies (género/familia) en que se basa la media. */
  n: number;
}

export const GWDD_FILE = 'data/gwdd-v2.2-wood-density.json';

/** Regiones de la GWDD v2.2 (columna region), en el orden del archivo. */
export const GWDD_REGIONS = [
  'Africa', 'Asia', 'Central America and West Indies', 'Europe', 'Indian Ocean',
  'North America', 'Oceania', 'South America', 'South-East Asia',
] as const;

let cache: Promise<WoodDensityDB> | null = null;

/** Carga el archivo una sola vez (solo cuando se activa el análisis de biomasa). */
export const loadWoodDensityDB = (): Promise<WoodDensityDB> => {
  cache ??= fetch(`${import.meta.env.BASE_URL}${GWDD_FILE}`).then(r => {
    if (!r.ok) throw new Error(`No se pudo cargar la base de densidades (${r.status})`);
    return r.json();
  });
  return cache;
};

/** Género y epíteto en minúsculas, sin autor ni calificadores (cf., aff., sp.). */
export const parseTaxon = (name: string): { genus: string; species: string | null } => {
  const tokens = String(name || '').trim().toLowerCase()
    .replace(/[×x]\s+/g, '').split(/\s+/).filter(t => !['cf.', 'cf', 'aff.', 'aff'].includes(t));
  const genus = tokens[0] ?? '';
  const epithet = tokens[1] ?? '';
  const isSpecies = /^[a-zà-ÿ-]+$/.test(epithet) && !['sp', 'spp', 'sp.', 'spp.', 'indet', 'indet.'].includes(epithet);
  return { genus, species: isSpecies ? `${genus} ${epithet}` : null };
};

/** DE típica entre especies de un género/familia, para los grupos con una sola especie. */
const typicalSd = (table: Record<string, [number, number, number | null]>): number => {
  const sds = Object.values(table).map(v => v[2]).filter((v): v is number => typeof v === 'number' && v > 0);
  return sds.length ? sds.reduce((a, b) => a + b, 0) / sds.length : 0.1;
};

const sdCache = new WeakMap<LevelTables, { ge: number; fa: number }>();
const fallbackSd = (t: LevelTables) => {
  let v = sdCache.get(t);
  if (!v) { v = { ge: typicalSd(t.ge), fa: typicalSd(t.fa) }; sdCache.set(t, v); }
  return v;
};

/**
 * Densidad para un taxón. La DE combina la variación dentro de la especie (0.068 g cm⁻³,
 * Fischer et al. 2026) con la variación entre especies cuando la media es de género o familia.
 */
export const lookupWoodDensity = (
  db: WoodDensityDB, scientificName: string, family?: string, region?: string,
): DensityMatch | null => {
  const { genus, species } = parseTaxon(scientificName);
  const cap = (x: string) => x.charAt(0).toUpperCase() + x.slice(1).toLowerCase();
  const fam = cap((family && family.trim()) || db.genusFamily[genus] || '');
  const tables: [string, LevelTables][] = [];
  if (region && db.byRegion[region]) tables.push([region, db.byRegion[region]]);
  tables.push(['global', db.global]);
  const intra = db.intraspecificSD;

  if (species) {
    for (const [reg, t] of tables) {
      const v = t.sp[species];
      if (v) return { value: v[0], sd: intra, level: 'especie', region: reg, n: v[1] };
    }
  }
  for (const [reg, t] of tables) {
    const v = t.ge[genus];
    if (v) return { value: v[0], sd: Math.hypot(v[2] ?? fallbackSd(t).ge, intra), level: 'género', region: reg, n: v[1] };
  }
  if (fam) {
    for (const [reg, t] of tables) {
      const v = t.fa[fam];
      if (v) return { value: v[0], sd: Math.hypot(v[2] ?? fallbackSd(t).fa, intra), level: 'familia', region: reg, n: v[1] };
    }
  }
  return null;
};
