
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
  cluster?: number;
  isBackground?: boolean; // New flag to indicate if this point should be rendered without a label
}

/**
 * Represents the geometric properties of a calculated ellipse for clustering.
 */
export interface EllipseData {
    cx: number;
    cy: number;
    rx: number;
    ry: number;
    angle: number;
    cluster: number;
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
  isPlaceholder?: boolean;
  biplot: {
    species: CCACoordinates[];
    vectors: CCACoordinates[];
  };
  correlationMatrix: CorrelationMatrix;
  ellipses?: EllipseData[];
  varianceExplained?: [number, number];
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
export interface RarefactionData {
  [siteName: string]: RarefactionCurve;
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
  indval: number; // Indicator Value percentage
  pvalue: number; // Significance p-value from permutation test
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
}

// --- New Ecological Parameters Types ---
export interface EcologicalParameterSet {
  speciesRichness: number;
  individuals: number;
  genusRichness: number;
  familyRichness: number;
  sampleCoverage: number; // SC*
  shannon: number;
  simpsonDominance: number;
  pielouEvenness: number;
  margalefRichness: number;
  chao1: number;
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
  ivi: SiteStructuralAnalysis;
  stand: SiteStandCharacteristics;
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
