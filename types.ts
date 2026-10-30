
import { ReactNode } from 'react';

export interface SpeciesData {
  [key: string]: string | number | null;
  'Tipo de vegetación': string;
  'Parcela': string;
  'Código de árbol': string;
  'Latitud': number;
  'Longitud': number;
  'Altitud': number;
  'Precisión': number;
  'N.Com_campo': string;
  'N.Com_identificado': string;
  'Nombre científico (Completo)': string;
  'N_Científico (Abreviado)': string;
  'Género': string;
  'Familia': string;
  'Densidad (g/cm3)': number;
  'DAP (cm)': number;
  'Altura (m)': number;
  'Área basal (cm²)': number;
}


export interface SiteData {
  [locationKey: string]: {
    [variable: string]: string | number;
  };
}

/**
 * Represents the statistical result for a pair of species.
 */
export interface CooccurrenceResult {
  obs: number; // Observed co-occurrences
  exp: number; // Expected co-occurrences
  p_lt: number; // Probability of observed or fewer
  p_gt: number; // Probability of observed or greater
  p_adj: number | null; // Benjamini–Hochberg adjusted p (direction of the observed deviation); null if not tested
  tested: boolean; // false when expected co-occurrence < 1 (not evaluated, as in the cooccur package)
  effect: 'positive' | 'negative' | 'random';
}

/**
 * A cell in the co-occurrence matrix. It can be a full statistical result
 * for an off-diagonal cell or a simple observation count for a diagonal cell.
 */
export type CooccurrenceCell = CooccurrenceResult | { obs: number };

/**
 * The main co-occurrence matrix structure, holding detailed cell information.
 */
export interface CooccurrenceMatrix {
  [speciesA: string]: {
    [speciesB: string]: CooccurrenceCell;
  };
}

/**
 * Holds the co-occurrence analysis for the general community and for each site.
 */
export interface SiteCooccurrenceMatrix {
  [siteOrGeneralKey: string]: CooccurrenceMatrix;
}

/**
 * Represents a pair of species with a statistically significant association.
 */
export interface SignificantPair {
  speciesA: string;
  speciesB: string;
  effect: 'positive' | 'negative';
}

/**
 * Represents the analysis result for a single environmental factor.
 */
export interface EnvironmentalFactorAnalysis {
    factor: string;
    cooccurrenceMean: number | string;
    controlMean: number | string; // Sites where only one of the pair is present
    /** Parcelas con ambas especies y con solo una de ellas que tienen dato de la variable. */
    nCooccurrence: number;
    nControl: number;
    /** Prueba de permutación de la diferencia de medias (null si algún grupo tiene < 2 parcelas). */
    pValue: number | null;
    /** p ajustado por Benjamini–Hochberg sobre todas las pruebas (pares × variables). */
    pAdj: number | null;
    exact: boolean | null;
}

/**
 * Represents the full analysis result for a selected pair of species.
 */
export type EnvironmentalAnalysisResult = EnvironmentalFactorAnalysis[];

/**
 * Represents the environmental analysis results for all significant pairs.
 * The key is a string identifier for the pair, e.g., "SpeciesA-SpeciesB".
 */
export interface AllEnvironmentalAnalyses {
  [pairKey: string]: {
    pair: SignificantPair;
    analysis: EnvironmentalAnalysisResult;
  };
}

/**
 * Represents the average environmental conditions for a single analysis (general or per-site).
 */
export interface SingleNicheData {
  [speciesName: string]: {
    [environmentalFactor: string]: number | 'N/A';
  };
}

/**
 * Holds the environmental niche analysis for the general community and for each site.
 */
export interface SiteNicheData {
  [siteOrGeneralKey: string]: SingleNicheData;
}

/**
 * Represents a point or vector in the CCA biplot.
 */
export interface CCACoordinates {
  name: string;
  x: number;
  y: number;
  group?: string; // vegetation type of a site point
  isBackground?: boolean; // point drawn without a label
  weight?: number; // species weight (column total), used to choose which species get a label
}

/**
 * 95% dispersion ellipse of the site scores of one vegetation type (vegan::ordiellipse, kind = "sd").
 */
export interface EllipseData {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    angle: number;
    group: string;
}

/**
 * Represents the correlation matrix between species and environmental factors.
 */
export interface CorrelationMatrix {
  [speciesName: string]: {
    [environmentalFactor: string]: number;
  };
}

/**
 * Holds all data required to render the CCA plots for a single analysis.
 */
export interface SingleCCAPlotData {
  biplot: {
    species: CCACoordinates[];
    vectors: CCACoordinates[];
    sites?: CCACoordinates[];
  };
  correlationMatrix: CorrelationMatrix;
  /** Elipses de dispersión de las parcelas (kind = "sd"). */
  ellipses?: EllipseData[];
  /** Elipses de confianza del centroide de cada grupo (kind = "se"). */
  ellipsesSE?: EllipseData[];
  /** Nº de parcelas por grupo, para avisar cuando una elipse se basa en pocas parcelas. */
  groupSizes?: Record<string, number>;
  /** % of total inertia explained by CCA1 and CCA2 */
  varianceExplained?: [number, number];
  stats?: CCAStats;
  /** Reasons why the CCA could not be computed, or data that were excluded */
  notes?: string[];
}

export interface CCAStats {
  nSites: number;
  nSpecies: number;
  totalInertia: number;
  constrainedInertia: number;
  constrainedPercent: number;
  eigenvalues: number[];
  axisPercent: number[];
  F: number;
  df: number;
  dfResidual: number;
  pValue: number;
  nPermutations: number;
  seed: number;
  vif: Record<string, number>;
  excludedPlots: string[];
  excludedVariables: string[];
}

/**
 * Holds all CCA plot data, keyed by site name or "General".
 */
export interface SiteCCAPlotData {
  [siteOrGeneralKey: string]: SingleCCAPlotData;
}


/**
 * Holds the calculated diversity indices for a single site or the entire community.
 * @deprecated Use EcologicalParameterSet instead
 */
export interface DiversityIndices {
  shannon: number;
  simpsonDominance: number;
  pielouEvenness: number;
  margalefRichness: number;
  chao1: number;
}

/**
 * Holds the diversity indices calculated for each individual site.
 * @deprecated Use SiteEcologicalParameters instead
 */
export interface SiteDiversityResults {
  [siteName: string]: DiversityIndices;
}

/**
 * Represents a single point on a rarefaction curve.
 */
export interface RarefactionPoint {
  x: number; // Number of individuals (sample size)
  y: number; // Species richness
}

/**
 * Represents all data needed to draw a rarefaction/extrapolation curve for one site.
 */
export interface RarefactionCurve {
  observed: {
    point: RarefactionPoint;
    curve: RarefactionPoint[];
  };
  extrapolated: {
    curve: RarefactionPoint[];
  };
  confidenceInterval: {
    lower: RarefactionPoint[];
    upper: RarefactionPoint[];
  };
}

/**
 * Holds all rarefaction curve data, keyed by site name.
 */
export interface SiteRarefaction {
  n: number;
  S: number;
  /** Curves for Hill numbers of order q = 0 (richness), 1 (exp Shannon) and 2 (inverse Simpson) */
  byOrder: Record<'0' | '1' | '2', RarefactionCurve>;
  /** Sample coverage at each sample size (shared by all orders) */
  coverage: { m: number; SC: number; lcl: number; ucl: number }[];
  nBoot: number;
  seed: number;
}

export interface RarefactionData {
  [siteName: string]: SiteRarefaction;
}

/**
 * Holds the calculated structural metrics for a single species.
 */
export interface SpeciesStructuralMetrics {
  abundanceAbs: number;
  abundanceRel: number;
  frequencyAbs: number;
  frequencyRel: number;
  dominanceAbs: number;
  dominanceRel: number;
  ivi300: number;
  ivi100: number;
}

/**
 * Holds the structural analysis results for all species.
 */
export interface StructuralAnalysisResult {
  [speciesName: string]: SpeciesStructuralMetrics;
}

/**
 * Holds the structural analysis results for the general community and for each site.
 */
export interface SiteStructuralAnalysis {
  [siteOrGeneralKey: string]: StructuralAnalysisResult;
}


/**
 * Holds the calculated Indicator Value (IndVal) metrics for a species in a site group.
 */
export interface IndValMetrics {
  indval: number; // Dufrêne & Legendre IndVal (%) = 100·A·B
  stat: number; // sqrt(A·B), statistic of indicspecies::multipatt (IndVal.g)
  A: number; // specificity
  B: number; // fidelity
  isBest: boolean; // group where the species reaches its maximum value (the one tested)
  pvalue: number | null; // permutation p-value; only for the best group
  pAdj: number | null; // Benjamini–Hochberg adjusted p-value across species
}

/**
 * Holds the IndVal results for all species across all site groups.
 * The structure is { speciesName: { siteName: IndValMetrics } }.
 */
export interface IndValResult {
  [speciesName: string]: {
    [siteName: string]: IndValMetrics;
  };
}

// --- Tipos para la Calculadora de Biomasa ---

export interface ForestDataRow extends Record<string, string | number | null> {
    'Densidad (g/cm3)'?: string | number | null;
    'DAP (cm)'?: string | number | null;
    'Altura (m)'?: string | number | null;
    'Tipo de vegetación'?: string | null;
    'Parcela'?: string | number | null;
    'Nombre científico (Completo)'?: string | null;
    'AGB_Mg'?: number | null;
    'Carbono_Almacenado_Mg'?: number | null;
}

export type EquationSelection = Record<string, string>;

export type PlotInfo = Record<string, {
    numPlots: string;
    plotArea: string;
}>;

export interface SummaryRow {
    'Tipo de vegetación': string;
    'AGB_Mg_Total': number;
    'Carbono_Mg_Total': number;
    'Carbono_Mg/ha'?: number;
}

export interface PlotSummaryRow {
    'Tipo de vegetación': string;
    'Parcela': string;
    'AGB_Mg_Total': number;
    'Carbono_Mg_Total': number;
    'Carbono_Mg/ha'?: number;
}

export interface BiomassAnalysisResults {
  summary: SummaryRow[];
  summaryByPlot: PlotSummaryRow[];
  totals: {
    agb: number;
    carbon: number;
    carbonPerHa?: number;
  };
  processedData: ForestDataRow[];
  originalHeaders: string[];
  carbonFraction: number;
  /** Ecuaciones aplicadas, con número de individuos y avisos de rango. */
  equationsUsed: import('./services/biomassEquations').EquationUsage[];
  /** Individuos sin ecuación asignada (no suman biomasa). */
  withoutEquation: number;
  /** Origen de la densidad de los individuos cuya ecuación la necesita. */
  densitySources: Record<string, number>;
  /** Región de la GWDD usada ('global' = mundial), o null si no se usó la GWDD. */
  woodDensityRegion: string | null;
  uncertainty: import('./services/carbonUncertainty').CarbonUncertainty;
}

export interface BiomassConfig {
  selections: EquationSelection;
  plotInfo: PlotInfo;
  descriptions: Record<string, string>;
  carbonFraction: number;
  /** Completar densidades faltantes con la GWDD v2.2. */
  useGWDD: boolean;
  /** Región de la GWDD ('' = mundial). */
  gwddRegion: string;
}

// --- New Ecological Parameters Types ---
export interface EcologicalParameterSet {
  speciesRichness: number;
  individuals: number;
  genusRichness: number;
  familyRichness: number;
  sampleCoverage: number; // Chao & Jost (2012) sample coverage
  shannon: number;
  simpsonDominance: number;
  pielouEvenness: number;
  margalefRichness: number;
  chao1: number;
  chao1Se: number;
  chao1Lower: number;
  chao1Upper: number;
}

export interface SiteEcologicalParameters {
  [siteName: string]: EcologicalParameterSet;
}

// --- New Structural Analysis Types ---
export interface StandCharacteristics {
  numPlots: number;
  stemDensity: number | 'N/A';
  minHeight: number;
  maxHeight: number;
  avgHeight: string;
  minDBH: number;
  maxDBH: number;
  avgDBH: string;
  // Fixed typo: removed space in minWoodDensity
  minWoodDensity: number;
  maxWoodDensity: number;
  avgWoodDensity: string;
}

export interface SiteStandCharacteristics {
  [siteName: string]: StandCharacteristics;
}

export interface FullStructuralAnalysis {
  /** IVI con todas las especies (incluido el cultivo). */
  ivi: SiteStructuralAnalysis;
  /** IVI solo de los árboles acompañantes (sin cultivo). */
  iviWithoutCrops: SiteStructuralAnalysis;
  stand: SiteStandCharacteristics;
  /** Especies tratadas como cultivo (abreviadas). */
  cropSpecies: string[];
  /** Número de individuos cuya área basal salió de DAP, D30, D15 o de ninguno. */
  basalAreaSources: Record<string, number>;
}

// --- Soil Carbon Types ---
export interface SoilConfigPerSite {
    bulkDensity: string;
    depth: string;
    stoniness: string;
    carbonColumn: string;
    isSOM: boolean;
}

export interface SoilConfig {
    [vegType: string]: SoilConfigPerSite;
}

export interface SoilCarbonSummaryRow {
    vegetationType: string;
    avgSocMgHa: number;
}

export interface SoilCarbonAnalysisResults {
    summary: SoilCarbonSummaryRow[];
    totals: {
        avgSocMgHa: number;
        totalCarbonMg: number;
    };
}
