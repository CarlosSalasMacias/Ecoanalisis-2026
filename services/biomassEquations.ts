/**
 * Registro de ecuaciones alométricas de biomasa aérea (AGB, kg por individuo).
 *
 * Cada ecuación declara su fuente, qué diámetro espera, qué variables necesita, su rango de
 * calibración (cuando la fuente lo publica) y si sus coeficientes se comprobaron contra el original.
 * Las ecuaciones no verificadas siguen disponibles, pero la aplicación lo advierte en los resultados
 * y en la metodología.
 */
import type { ForestDataRow } from '../types';

export type DiameterKind = 'dbh' | 'd15' | 'd30';

export interface AllometricEquation {
  id: string;
  label: string;
  /** Clave en services/references.ts. */
  reference: string;
  /** Fuente primaria cuando la ecuación se tomó de una compilación (p. ej. Hairiah et al. 2011). */
  primarySource?: string;
  /** Claves de las publicaciones donde se comprobaron los coeficientes cuando no se tuvo el original. */
  checkedIn?: string[];
  formula: string;
  diameter: DiameterKind;
  needsHeight: boolean;
  needsDensity: boolean;
  /** false si la ecuación no usa diámetro (p. ej. café solo con altura). */
  needsDiameter?: boolean;
  /** Rango de calibración publicado (cm y m). */
  range?: { D?: [number, number]; H?: [number, number] };
  verified: boolean;
  verificationNote: string;
  /** Error residual del modelo publicado, para propagar la incertidumbre de la ecuación. */
  rse?: { value: number; scale: 'ln' | 'log10'; source: string };
  compute: (v: { D: number; H: number; rho: number }) => number | null;
}

const chave2005NoHeight = (a: number, b: number) => ({ D, rho }: { D: number; rho: number }) => {
  const l = Math.log(D);
  return rho * Math.exp(a + b * l + 0.207 * l * l - 0.0281 * l * l * l);
};

const CHAVE2005_RANGE: AllometricEquation['range'] = { D: [5, 156] };
const CHAVE2005_NOTE = 'Coeficientes comprobados en Hairiah et al. (2011), Tabla 2, que reproduce Chave et al. (2005).';

export const EQUATIONS: Record<string, AllometricEquation> = {
  chave2014: {
    id: 'chave2014', label: 'Pantropical con altura (Chave et al., 2014, ec. 4)', reference: 'chave2014',
    formula: 'AGB = 0.0673 × (ρ·D²·H)^0.976', diameter: 'dbh', needsHeight: true, needsDensity: true,
    verified: true, verificationNote: 'Comprobada en el PDF original (ecuación 4).',
    rse: { value: 0.357, scale: 'ln', source: 'RSE (σ) de la ecuación 4 en Chave et al. (2014)' },
    compute: ({ D, H, rho }) => 0.0673 * Math.pow(rho * D * D * H, 0.976),
  },
  dry: {
    id: 'dry', label: 'Bosque seco con altura (Chave et al., 2005)', reference: 'chave2005',
    formula: 'AGB = 0.112 × (ρ·D²·H)^0.916', diameter: 'dbh', needsHeight: true, needsDensity: true,
    range: CHAVE2005_RANGE, verified: true, verificationNote: CHAVE2005_NOTE,
    compute: ({ D, H, rho }) => 0.112 * Math.pow(rho * D * D * H, 0.916),
  },
  moist: {
    id: 'moist', label: 'Bosque húmedo con altura (Chave et al., 2005)', reference: 'chave2005',
    formula: 'AGB = 0.0509 × ρ·D²·H', diameter: 'dbh', needsHeight: true, needsDensity: true,
    range: CHAVE2005_RANGE, verified: true, verificationNote: CHAVE2005_NOTE,
    compute: ({ D, H, rho }) => 0.0509 * rho * D * D * H,
  },
  wet: {
    id: 'wet', label: 'Bosque muy húmedo con altura (Chave et al., 2005)', reference: 'chave2005',
    formula: 'AGB = 0.0776 × (ρ·D²·H)^0.940', diameter: 'dbh', needsHeight: true, needsDensity: true,
    range: CHAVE2005_RANGE, verified: true, verificationNote: CHAVE2005_NOTE,
    compute: ({ D, H, rho }) => 0.0776 * Math.pow(rho * D * D * H, 0.94),
  },
  dry_no_height: {
    id: 'dry_no_height', label: 'Bosque seco sin altura (Chave et al., 2005)', reference: 'chave2005',
    formula: 'AGB = ρ × exp(−0.667 + 1.784 ln D + 0.207 (ln D)² − 0.0281 (ln D)³)', diameter: 'dbh',
    needsHeight: false, needsDensity: true, range: CHAVE2005_RANGE, verified: true, verificationNote: CHAVE2005_NOTE,
    compute: chave2005NoHeight(-0.667, 1.784),
  },
  // Se mantiene el identificador histórico 'generic_no_height' para no romper configuraciones guardadas.
  generic_no_height: {
    id: 'generic_no_height', label: 'Bosque húmedo sin altura (Chave et al., 2005)', reference: 'chave2005',
    formula: 'AGB = ρ × exp(−1.499 + 2.148 ln D + 0.207 (ln D)² − 0.0281 (ln D)³)', diameter: 'dbh',
    needsHeight: false, needsDensity: true, range: CHAVE2005_RANGE, verified: true, verificationNote: CHAVE2005_NOTE,
    compute: chave2005NoHeight(-1.499, 2.148),
  },
  wet_no_height: {
    id: 'wet_no_height', label: 'Bosque muy húmedo sin altura (Chave et al., 2005)', reference: 'chave2005',
    formula: 'AGB = ρ × exp(−1.239 + 1.980 ln D + 0.207 (ln D)² − 0.0281 (ln D)³)', diameter: 'dbh',
    needsHeight: false, needsDensity: true, range: CHAVE2005_RANGE, verified: true, verificationNote: CHAVE2005_NOTE,
    compute: chave2005NoHeight(-1.239, 1.98),
  },
  cafe: {
    id: 'cafe', label: 'Café, d15 (Segura et al., 2006, ec. 3)', reference: 'segura2006',
    formula: 'log10(AGB) = −1.181 + 1.991 log10(d15)', diameter: 'd15', needsHeight: false, needsDensity: false,
    range: { D: [0.3, 7.4] }, verified: true, verificationNote: 'Comprobada en el PDF original (Tabla 3, ecuación 3).',
    rse: { value: 0.16, scale: 'log10', source: 'RMSE de la ecuación 3 (Tabla 3) en Segura et al. (2006)' },
    compute: ({ D }) => Math.pow(10, -1.181 + 1.991 * Math.log10(D)),
  },
  cafe_altura: {
    id: 'cafe_altura', label: 'Café, d15 y altura (Segura et al., 2006, ec. 4)', reference: 'segura2006',
    formula: 'log10(AGB) = −1.113 + 1.578 log10(d15) + 0.581 log10(h)', diameter: 'd15', needsHeight: true,
    needsDensity: false, range: { D: [0.3, 7.4], H: [0.3, 3.3] }, verified: true,
    verificationNote: 'Comprobada en el PDF original (Tabla 3, ecuación 4).',
    rse: { value: 0.15, scale: 'log10', source: 'RMSE de la ecuación 4 (Tabla 3) en Segura et al. (2006)' },
    compute: ({ D, H }) => Math.pow(10, -1.113 + 1.578 * Math.log10(D) + 0.581 * Math.log10(H)),
  },
  cafe_solo_altura: {
    id: 'cafe_solo_altura', label: 'Café, solo altura (Segura et al., 2006, ec. 5)', reference: 'segura2006',
    formula: 'log10(AGB) = −0.779 + 2.338 log10(h)', diameter: 'd15', needsDiameter: false, needsHeight: true,
    needsDensity: false, range: { H: [0.3, 3.3] }, verified: true,
    verificationNote: 'Comprobada en el PDF original (Tabla 3, ecuación 5; R² = 0.82). Es la que usan Gómez Cardozo et al. (2018). Menos precisa que las ecuaciones 3 y 4: se usa solo si falta el d15.',
    rse: { value: 0.27, scale: 'log10', source: 'RMSE de la ecuación 5 (Tabla 3) en Segura et al. (2006)' },
    compute: ({ H }) => Math.pow(10, -0.779 + 2.338 * Math.log10(H)),
  },
  // Cacao medido a 30 cm del suelo (d30), como es habitual en Latinoamérica.
  cacao: {
    id: 'cacao', label: 'Cacao, d30 (Andrade et al., 2008)', reference: 'andrade2008',
    checkedIn: ['andrade2013', 'gomezCardozo2018', 'carvajal2020'],
    formula: 'log10(AGB) = −1.625 + 2.63 log10(d30)', diameter: 'd30', needsHeight: false, needsDensity: false,
    verified: true,
    verificationNote: 'Original no disponible. Los coeficientes, la unidad (kg por árbol) y el d30 en cm coinciden en tres publicaciones independientes: Andrade et al. (2013, Ec. 1), Carvajal-Agudelo y Andrade (2020, Tabla 1), ambas con Andrade como autor, y Gómez Cardozo et al. (2018, Cuadro 1; R² = 0.98). También coincide con la forma en logaritmo natural de Suárez et al. (2025): −1.625 × ln 10 = −3.74.',
    compute: ({ D }) => Math.pow(10, -1.625 + 2.63 * Math.log10(D)),
  },
  cacao_dap: {
    id: 'cacao_dap', label: 'Cacao, DAP (Yuliasmara, 2008, en Hairiah et al., 2011)', reference: 'hairiah2011',
    primarySource: 'Yuliasmara (2008)',
    formula: 'AGB = 0.1208 × D^1.98', diameter: 'dbh', needsHeight: false, needsDensity: false, verified: true,
    verificationNote: 'Comprobada en Hairiah et al. (2011), Tabla 3 (fuente secundaria; el manual define D como DAP).',
    compute: ({ D }) => 0.1208 * Math.pow(D, 1.98),
  },
  musa_sp: {
    id: 'musa_sp', label: 'Musa sp. (Arifin, 2001, en Hairiah et al., 2011)', reference: 'hairiah2011',
    primarySource: 'Arifin (2001)',
    formula: 'AGB = 0.030 × D^2.13', diameter: 'dbh', needsHeight: false, needsDensity: false, verified: true,
    verificationNote: 'Comprobada en Hairiah et al. (2011), Tabla 3 (fuente secundaria).',
    compute: ({ D }) => 0.03 * Math.pow(D, 2.13),
  },
  cacao_fomekong: {
    id: 'cacao_fomekong', label: 'Cacao, d30 (atribuida a Fomekong et al., 2024) — SIN VERIFICAR', reference: '',
    formula: 'AGB = exp(−1.613 + 1.83 ln d30)', diameter: 'd30', needsHeight: false, needsDensity: false, verified: false,
    verificationNote: 'Coeficientes heredados de la versión anterior; no se encontró ni comprobó la fuente original.',
    compute: ({ D }) => Math.exp(-1.613 + 1.83 * Math.log(D)),
  },
  citrus: {
    id: 'citrus', label: 'Citrus spp., d30 (Schroth et al., 2002) — SIN VERIFICAR', reference: 'schroth2002',
    checkedIn: ['gomezCardozo2018'],
    formula: 'AGB = −6.64 + 0.279·AB + 0.000514·AB² (AB = área basal a 30 cm, cm²)', diameter: 'd30',
    needsHeight: false, needsDensity: false, verified: false,
    // Por debajo de AB ≈ 22.8 cm² (d30 ≈ 5.4 cm) la ecuación da biomasa negativa.
    range: { D: [5.4, Infinity] },
    verificationNote: 'Coeficientes tal como los citan Gómez Cardozo et al. (2018, Cuadro 1; R² = 0.94), que midieron los cítricos a 30 cm del suelo. Falta comprobarlos (y las unidades de AB) en el original de Schroth et al. (2002).',
    compute: ({ D }) => {
      const AB = Math.PI * (D / 2) ** 2;
      return Math.max(0, -6.64 + 0.279 * AB + 0.000514 * AB * AB);
    },
  },
};

export const EQUATION_OPTIONS: Record<string, string> = {
  '': 'Seleccione una ecuación',
  ...Object.fromEntries(Object.values(EQUATIONS).map(e => [e.id, e.label])),
};

const parseNumber = (value: unknown): number => {
  if (value === null || value === undefined) return NaN;
  const s = String(value).trim().replace(',', '.');
  return s === '' ? NaN : parseFloat(s);
};

/** Columna de la tabla de especies que contiene cada tipo de diámetro. */
export const DIAMETER_COLUMN: Record<DiameterKind, string> = {
  dbh: 'DAP (cm)',
  d30: 'D30 (cm)',
  d15: 'D15 (cm)',
};

/** Columna con la densidad de madera finalmente usada (la del usuario o la de la GWDD). */
export const DENSITY_USED_COLUMN = 'Densidad usada (g/cm3)';

/** Lee las variables del individuo; el diámetro se toma de la columna que exige la ecuación. */
export const readTree = (row: ForestDataRow, diameter: DiameterKind = 'dbh') => {
  const used = parseNumber(row[DENSITY_USED_COLUMN]);
  return {
    D: parseNumber(row[DIAMETER_COLUMN[diameter]]),
    H: parseNumber(row['Altura (m)']),
    rho: Number.isFinite(used) ? used : parseNumber(row['Densidad (g/cm3)']),
  };
};

/** Especies de cultivo reconocidas automáticamente (se puede forzar con la columna «Cultivo»). */
const CROP_NAMES = ['theobroma cacao', 'coffea', 'citrus', 'musa', 'persea americana', 'mangifera indica'];

/**
 * ¿Es el individuo una planta de cultivo? Si la tabla tiene la columna «Cultivo» (sí/no), manda
 * esa columna; si no, se reconocen por nombre cacao, café, cítricos, banano/plátano, aguacate y mango.
 */
export const isCrop = (row: ForestDataRow): boolean => {
  const flag = String(row['Cultivo'] ?? '').trim().toLowerCase();
  if (['sí', 'si', 's', 'yes', 'y', 'x', '1', 'true', 'verdadero'].includes(flag)) return true;
  if (['no', 'n', '0', 'false', 'falso'].includes(flag)) return false;
  const name = String(row['Nombre científico (Completo)'] || '').toLowerCase();
  return CROP_NAMES.some(c => name.includes(c));
};

/** Ecuación que corresponde a un individuo: primero por especie (cultivos), luego la del tipo de vegetación. */
export const equationForRow = (row: ForestDataRow, selections: Record<string, string>): string | null => {
  const name = String(row['Nombre científico (Completo)'] || '').toLowerCase();
  const veg = row['Tipo de vegetación'];
  if (name.includes('theobroma cacao')) return 'cacao';
  if (name.includes('coffea') || name.includes('café') || name.includes('cafe')) {
    const { D, H } = readTree(row, 'd15');
    if (D > 0) return H > 0 ? 'cafe_altura' : 'cafe';
    return H > 0 ? 'cafe_solo_altura' : 'cafe';
  }
  if (name.includes('citrus')) return 'citrus';
  if (name.includes('musa')) return 'musa_sp';
  if (typeof veg === 'string' && selections[veg]) return selections[veg];
  return null;
};

/** Por qué no se pudo calcular la biomasa de un individuo (null si se pudo). */
export const missingInputs = (equationId: string, row: ForestDataRow): string | null => {
  const eq = EQUATIONS[equationId];
  if (!eq) return 'ecuación';
  const v = readTree(row, eq.diameter);
  if (eq.needsDiameter !== false && !(v.D > 0)) return DIAMETER_COLUMN[eq.diameter];
  if (eq.needsHeight && !(v.H > 0)) return 'Altura (m)';
  if (eq.needsDensity && !(v.rho > 0)) return 'Densidad (g/cm3)';
  return null;
};

/** Biomasa aérea (kg). `override` permite variar densidad o diámetro (simulación de Monte Carlo). */
export const computeAGB = (equationId: string, row: ForestDataRow, override?: { rho?: number }): number | null => {
  const eq = EQUATIONS[equationId];
  if (!eq || missingInputs(equationId, row)) return null;
  const v = readTree(row, eq.diameter);
  if (override?.rho !== undefined) v.rho = override.rho;
  const agb = eq.compute(v);
  return agb !== null && Number.isFinite(agb) ? agb : null;
};

export const isOutsideRange = (equationId: string, row: ForestDataRow): boolean => {
  const eq = EQUATIONS[equationId];
  if (!eq?.range) return false;
  const { D, H } = readTree(row, eq.diameter);
  const out = (x: number, r?: [number, number]) => !!r && Number.isFinite(x) && (x < r[0] || x > r[1]);
  return out(D, eq.range.D) || (eq.needsHeight && out(H, eq.range.H));
};

export interface EquationUsage {
  equation: string;
  label: string;
  reference: string;
  verified: boolean;
  diameter: DiameterKind;
  trees: number;
  computed: number;
  outsideRange: number;
  /** Columnas que faltaban en los individuos sin resultado, con su número. */
  missing: Record<string, number>;
}

/** Error residual del modelo en escala de logaritmo natural (null si la fuente verificada no lo da). */
export const residualSdLn = (equationId: string): number | null => {
  const r = EQUATIONS[equationId]?.rse;
  if (!r) return null;
  return r.scale === 'ln' ? r.value : r.value * Math.LN10;
};
