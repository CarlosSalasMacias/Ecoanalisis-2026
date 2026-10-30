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
  formula: string;
  diameter: DiameterKind;
  needsHeight: boolean;
  needsDensity: boolean;
  /** Rango de calibración publicado (cm y m). */
  range?: { D?: [number, number]; H?: [number, number] };
  verified: boolean;
  verificationNote: string;
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
    compute: ({ D }) => Math.pow(10, -1.181 + 1.991 * Math.log10(D)),
  },
  cafe_altura: {
    id: 'cafe_altura', label: 'Café, d15 y altura (Segura et al., 2006, ec. 4)', reference: 'segura2006',
    formula: 'log10(AGB) = −1.113 + 1.578 log10(d15) + 0.581 log10(h)', diameter: 'd15', needsHeight: true,
    needsDensity: false, range: { D: [0.3, 7.4], H: [0.3, 3.3] }, verified: true,
    verificationNote: 'Comprobada en el PDF original (Tabla 3, ecuación 4).',
    compute: ({ D, H }) => Math.pow(10, -1.113 + 1.578 * Math.log10(D) + 0.581 * Math.log10(H)),
  },
  cacao: {
    id: 'cacao', label: 'Cacao (Yuliasmara, 2008, en Hairiah et al., 2011)', reference: 'hairiah2011',
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
  citrus_sinensis: {
    id: 'citrus_sinensis', label: 'Citrus sinensis (atribuida a Schroth et al., 2002) — SIN VERIFICAR', reference: 'schroth2002',
    formula: 'AGB = −6.64 + 0.279·AB + 0.000514·AB² (AB = área basal, cm²)', diameter: 'dbh', needsHeight: false,
    needsDensity: false, verified: false,
    verificationNote: 'Coeficientes heredados de la versión anterior; no se han comprobado en Schroth et al. (2002).',
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

export const readTree = (row: ForestDataRow) => ({
  D: parseNumber(row['DAP (cm)']),
  H: parseNumber(row['Altura (m)']),
  rho: parseNumber(row['Densidad (g/cm3)']),
});

/** Ecuación que corresponde a un individuo: primero por especie (cultivos), luego la del tipo de vegetación. */
export const equationForRow = (row: ForestDataRow, selections: Record<string, string>): string | null => {
  const name = String(row['Nombre científico (Completo)'] || '').toLowerCase();
  const veg = row['Tipo de vegetación'];
  if (name.includes('theobroma cacao')) return 'cacao';
  if (name.includes('coffea') || name.includes('café') || name.includes('cafe')) {
    const { H } = readTree(row);
    return H > 0 ? 'cafe_altura' : 'cafe';
  }
  if (name.includes('citrus sinensis')) return 'citrus_sinensis';
  if (name.includes('musa')) return 'musa_sp';
  if (typeof veg === 'string' && selections[veg]) return selections[veg];
  return null;
};

export const computeAGB = (equationId: string, row: ForestDataRow): number | null => {
  const eq = EQUATIONS[equationId];
  if (!eq) return null;
  const v = readTree(row);
  if (!(v.D > 0)) return null;
  if (eq.needsHeight && !(v.H > 0)) return null;
  if (eq.needsDensity && !(v.rho > 0)) return null;
  const agb = eq.compute(v);
  return agb !== null && Number.isFinite(agb) ? agb : null;
};

export const isOutsideRange = (equationId: string, row: ForestDataRow): boolean => {
  const eq = EQUATIONS[equationId];
  if (!eq?.range) return false;
  const { D, H } = readTree(row);
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
}
