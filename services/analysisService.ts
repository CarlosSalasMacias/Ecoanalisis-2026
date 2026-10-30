

import { cooccurrenceAnalysis } from './stats/cooccurrence';
import { chao1, sampleCoverage as coverageEstimate, shannonEntropy, simpsonDominance as simpsonDominanceIndex } from './stats/diversity';
import { indicatorSpecies } from './stats/indval';
import { cca, ccaPermutationTest, groupEllipses } from './stats/cca';
import { rarefactionExtrapolation } from './stats/inext';
import { DEFAULT_SEED } from './stats/random';
import { SpeciesData, SiteData, CooccurrenceMatrix, CooccurrenceResult, SignificantPair, EnvironmentalAnalysisResult, AllEnvironmentalAnalyses, SingleNicheData, SiteNicheData, StructuralAnalysisResult, SpeciesStructuralMetrics, CorrelationMatrix, CCACoordinates, EllipseData, IndValResult, SiteStructuralAnalysis, SiteCooccurrenceMatrix, ForestDataRow, EquationSelection, PlotInfo, SummaryRow, BiomassAnalysisResults, SiteEcologicalParameters, FullStructuralAnalysis, SiteStandCharacteristics, PlotSummaryRow, RarefactionData, RarefactionCurve, SingleCCAPlotData, CooccurrenceResult as _CR } from '../types';

/**
 * Calculates the basal area from Diameter at Breast Height (DAP).
 * @param dap Diameter at Breast Height in cm.
 * @returns Basal area in cm².
 */
function calculateBasalArea(dap: number): number {
  if (isNaN(dap) || dap <= 0) {
    return 0;
  }
  const radius = dap / 2;
  return Math.PI * Math.pow(radius, 2);
}

/**
 * Parses raw 2D string array data into structured SpeciesData objects.
 * @param data The 2D array from Excel or pasted text.
 * @param isSpeciesData A flag to determine if basal area should be calculated.
 * @returns An array of structured objects.
 */
export function parseData(data: string[][], isSpeciesData: boolean): SpeciesData[] | any[][] {
  if (data.length < 2) {
    throw new Error("Data must have at least one header row and one data row.");
  }

  const headers = data[0].map(h => h.trim());
  const rows = data.slice(1);

  if (isSpeciesData) {
    const dapIndex = headers.findIndex(h => h.toLowerCase() === 'dap (cm)');
    if (dapIndex === -1) {
      throw new Error("Required header 'DAP (cm)' not found.");
    }

    return rows.map((row) => {
      const entry: any = {};
      headers.forEach((header, index) => {
        const value = row[index] || '';
        const numericHeaders = ['Latitud', 'Longitud', 'Altitud', 'Precisión', 'Densidad (g/cm3)', 'DAP (cm)', 'Altura (m)'];
        
        const trimmedValue = String(value).trim();
        if (numericHeaders.includes(header)) {
            if (trimmedValue === '') {
                entry[header] = null; // Correctly handle empty cells as missing data
            } else {
                const num = parseFloat(trimmedValue.replace(',', '.'));
                entry[header] = isNaN(num) ? null : num; // Handle non-numeric values as missing data
            }
        } else {
            entry[header] = value;
        }
      });
      const dap = entry['DAP (cm)'];
      entry['Área basal (cm²)'] = calculateBasalArea(dap);
      
      const scientificName = entry['Nombre científico (Completo)'];
      if (scientificName && typeof scientificName === 'string' && scientificName.includes(' ')) {
          entry['Género'] = scientificName.split(' ')[0];
      } else {
          entry['Género'] = scientificName || '';
      }
      
      return entry as SpeciesData;
    });
  }

  return data; // For site data, return as is for now
}


/**
 * Parses raw 2D string array for site data into a structured SiteData object.
 * The expected format is sites/plots as rows and variables as columns.
 * The first columns must be 'Tipo de vegetación' and 'Parcela'.
 * @param data The 2D array from Excel or pasted text.
 * @returns A structured SiteData object keyed by "Tipo de vegetación-Parcela".
 */
export function parseSiteData(data: string[][]): SiteData {
  const parsed: SiteData = {};
  if (data.length < 2 || data[0].length < 2) {
    // Not enough data to parse, return empty object
    return parsed;
  }
  
  const headers = data[0].map(h => h.trim());
  const siteNameIndex = headers.findIndex(h => h.toLowerCase() === 'tipo de vegetación');
  const plotNameIndex = headers.findIndex(h => h.toLowerCase() === 'parcela');

  if (siteNameIndex === -1) {
    throw new Error("La columna 'Tipo de vegetación' es obligatoria en los datos de características del sitio y no fue encontrada.");
  }
  if (plotNameIndex === -1) {
    throw new Error("La columna 'Parcela' es obligatoria en los datos de características del sitio para un análisis más fino y no fue encontrada.");
  }

  const variableHeaders = headers
    .map((header, index) => ({ header, index }))
    .filter(h => h.index !== siteNameIndex && h.index !== plotNameIndex);


  const dataRows = data.slice(1);

  dataRows.forEach(row => {
    const siteName = String(row[siteNameIndex] ?? '').trim();
    const plotName = String(row[plotNameIndex] ?? '').trim();
    if (!siteName || !plotName) return; // Skip rows without a site or plot name

    const locationKey = `${siteName}-${plotName}`;
    parsed[locationKey] = {};

    variableHeaders.forEach(({ header, index }) => {
        const value = String(row[index] ?? '');
        const numValue = parseFloat(value.replace(',', '.'));
        // Store value as number if possible, otherwise as string
        parsed[locationKey][header] = isNaN(numValue) || value.trim() === '' ? value : numValue;
    });
  });

  return parsed;
}

// --- Statistical engine (validated against R: see tests/ and validation/) ---

/** Builds a plots × species abundance matrix. Plot keys are "Tipo de vegetación-Parcela". */
export function buildCommunity(speciesData: SpeciesData[]): {
    plots: string[];
    groups: string[];
    species: string[];
    abundance: number[][];
} {
    const plotGroup = new Map<string, string>();
    const counts = new Map<string, Map<string, number>>();
    const speciesSet = new Set<string>();
    speciesData.forEach(record => {
        const site = record['Tipo de vegetación'];
        const plot = record['Parcela'];
        const sp = record['N_Científico (Abreviado)'];
        if (!site || !plot || !sp) return;
        const key = `${site}-${plot}`;
        plotGroup.set(key, String(site));
        speciesSet.add(String(sp));
        if (!counts.has(key)) counts.set(key, new Map());
        const row = counts.get(key)!;
        row.set(String(sp), (row.get(String(sp)) || 0) + 1);
    });
    const plots = Array.from(counts.keys()).sort();
    const species = Array.from(speciesSet).sort();
    return {
        plots,
        groups: plots.map(p => plotGroup.get(p)!),
        species,
        abundance: plots.map(p => species.map(sp => counts.get(p)!.get(sp) || 0)),
    };
}

const getSpeciesPresenceByLocation = (speciesData: SpeciesData[]): { [locationKey: string]: Set<string> } => {
    const locations: { [locationKey: string]: Set<string> } = {};
    speciesData.forEach(record => {
        const site = record['Tipo de vegetación'];
        const plot = record['Parcela'];
        const species = record['N_Científico (Abreviado)'];
        if (!site || !plot || !species) return;
        const locationKey = `${site}-${plot}`;
        if (!locations[locationKey]) {
            locations[locationKey] = new Set();
        }
        locations[locationKey].add(species);
    });
    return locations;
};


const calculateCooccurrenceForSubset = (speciesData: SpeciesData[]): CooccurrenceMatrix => {
    const locations = getSpeciesPresenceByLocation(speciesData);
    if (Object.keys(locations).length === 0) return {};
    const result = cooccurrenceAnalysis(locations, { alpha: 0.05, threshold: true, adjust: true });
    if (result.species.length < 2) return {};

    const matrix: CooccurrenceMatrix = {};
    result.species.forEach(sp => {
        matrix[sp] = { [sp]: { obs: result.prevalence[sp] } };
    });
    result.pairs.forEach(pair => {
        const cell: CooccurrenceResult = {
            obs: pair.obs,
            exp: pair.exp,
            p_lt: pair.pLower,
            p_gt: pair.pUpper,
            p_adj: pair.pAdj,
            tested: pair.tested,
            effect: pair.effect,
        };
        matrix[pair.speciesA][pair.speciesB] = cell;
        matrix[pair.speciesB][pair.speciesA] = cell;
    });
    return matrix;
};


/**
 * Performs a statistical co-occurrence analysis for the general community and for each site.
 * @param allSpeciesData Array of all processed species data.
 * @returns A nested object containing co-occurrence matrices.
 */
export function runCooccurrenceAnalysis(allSpeciesData: SpeciesData[]): SiteCooccurrenceMatrix {
  const results: SiteCooccurrenceMatrix = {};

  // 1. General Analysis
  results['General'] = calculateCooccurrenceForSubset(allSpeciesData);
  
  // 2. Per-Site Analysis
  const sites = Array.from(new Set(allSpeciesData.map(d => d['Tipo de vegetación']).filter(Boolean))).sort();
  sites.forEach(site => {
    const siteData = allSpeciesData.filter(d => d['Tipo de vegetación'] === site);
    if(siteData.length > 0) {
      results[site] = calculateCooccurrenceForSubset(siteData);
    }
  });

  return results;
}

/**
 * Extracts pairs with significant positive or negative associations.
 */
export function getSignificantPairs(matrix: CooccurrenceMatrix): SignificantPair[] {
    const pairs: SignificantPair[] = [];
    const species = Object.keys(matrix).sort(); 
    const processed = new Set<string>();

    for (const spA of species) {
        for (const spB of species) {
            if (spA >= spB) continue;
            const pairKey = [spA, spB].sort().join('-');
            if (processed.has(pairKey)) continue;

            const cell = matrix[spA][spB];
            if ('effect' in cell && (cell.effect === 'positive' || cell.effect === 'negative')) {
                pairs.push({ speciesA: spA, speciesB: spB, effect: cell.effect });
            }
            processed.add(pairKey);
        }
    }
    return pairs;
}

/**
 * Internal helper to calculate environmental niche for a subset of data.
 */
const calculateNicheForSubset = (
    speciesData: SpeciesData[],
    siteData: SiteData
): SingleNicheData => {
    const speciesPresence = getSpeciesPresenceByLocation(speciesData);
    const allSpecies = Array.from(new Set(speciesData.map(d => d['N_Científico (Abreviado)']).filter(Boolean))).sort();
    
    const allFactorsSet = new Set<string>();
    Object.values(siteData).forEach(siteVariables => {
        if (siteVariables) {
            Object.keys(siteVariables).forEach(factor => allFactorsSet.add(factor));
        }
    });
    const allFactors = Array.from(allFactorsSet).sort();

    if (allFactors.length === 0) return {};

    const nicheData: SingleNicheData = {};

    allSpecies.forEach(species => {
        const presentLocations = Object.keys(speciesPresence).filter(loc => speciesPresence[loc].has(species));
        
        if (presentLocations.length > 0) {
            nicheData[species] = {};
            allFactors.forEach(factor => {
                const values = presentLocations
                    .map(loc => siteData[loc]?.[factor])
                    .filter(val => typeof val === 'number') as number[];
                
                if (values.length > 0) {
                    const sum = values.reduce((acc, val) => acc + val, 0);
                    nicheData[species][factor] = parseFloat((sum / values.length).toFixed(2));
                } else {
                    nicheData[species][factor] = 'N/A';
                }
            });
        }
    });

    return nicheData;
}


/**
 * Calculates the average environmental conditions for each species, both overall and per site.
 * @param allSpeciesData Array of all processed species data.
 * @param siteData Structured site data for all sites.
 * @returns An object containing niche data for "General" and each individual site.
 */
export function calculateSpeciesEnvironmentalNiche(
    allSpeciesData: SpeciesData[],
    siteData: SiteData
): SiteNicheData {
    const results: SiteNicheData = {};

    // 1. General Analysis
    results['General'] = calculateNicheForSubset(allSpeciesData, siteData);

    // 2. Per-Site Analysis
    const sites = Array.from(new Set(allSpeciesData.map(d => d['Tipo de vegetación']).filter(Boolean))).sort();
    
    sites.forEach(site => {
        const siteSpeciesData = allSpeciesData.filter(d => d['Tipo de vegetación'] === site);
        // Filter siteData to only include plots from the current site
        const sitePlots = new Set(siteSpeciesData.map(d => `${d['Tipo de vegetación']}-${d.Parcela}`));
        const currentSiteData = Object.fromEntries(
            Object.entries(siteData).filter(([key]) => sitePlots.has(key))
        );
        
        if (Object.keys(currentSiteData).length > 0 && siteSpeciesData.length > 0) {
            results[site] = calculateNicheForSubset(siteSpeciesData, currentSiteData);
        }
    });

    return results;
}


/**
 * Analyzes environmental factors for a given pair of species.
 */
function analyzeEnvironmentalFactors(
    pair: SignificantPair,
    locationsPresence: { [locationKey: string]: Set<string> },
    siteData: SiteData
): EnvironmentalAnalysisResult | null {
    const { speciesA, speciesB } = pair;

    const cooccurrenceLocationsRaw = new Set<string>();
    const controlLocationsRaw = new Set<string>();

    for (const loc in locationsPresence) {
        const hasA = locationsPresence[loc].has(speciesA);
        const hasB = locationsPresence[loc].has(speciesB);
        if (hasA && hasB) {
            cooccurrenceLocationsRaw.add(loc);
        } else if ((hasA && !hasB) || (!hasA && hasB)) {
            controlLocationsRaw.add(loc);
        }
    }

    // Filter location sets to only include plots that actually exist in the provided site data.
    const validSiteDataLocations = new Set(Object.keys(siteData));

    const cooccurrenceLocations = new Set(
        Array.from(cooccurrenceLocationsRaw).filter(loc => validSiteDataLocations.has(loc))
    );
    const controlLocations = new Set(
        Array.from(controlLocationsRaw).filter(loc => validSiteDataLocations.has(loc))
    );

    // Perform checks on the *filtered* sets
    if (controlLocations.size === 0) {
        return null; // Not enough data for a meaningful comparison without a control group.
    }
    // For a positive association, we need at least one co-occurrence site with environmental data.
    if (pair.effect === 'positive' && cooccurrenceLocations.size === 0) {
        return null;
    }

    if (Object.keys(siteData).length === 0) return [];
    
    // DEFINITIVE FIX: Get all factors from ALL sites and sort them to ensure deterministic order.
    const allFactorsSet = new Set<string>();
    Object.values(siteData).forEach(siteVariables => {
        if (siteVariables) {
            Object.keys(siteVariables).forEach(factor => allFactorsSet.add(factor));
        }
    });
    const variables = Array.from(allFactorsSet).sort();

    const analysis: EnvironmentalAnalysisResult = [];

    variables.forEach(variable => {
        const getMean = (locSet: Set<string>): number | string => {
            const values = Array.from(locSet)
                .map(locKey => siteData[locKey]?.[variable]) 
                .filter(val => typeof val === 'number') as number[];
            
            if (values.length === 0) return 'N/A';
            const sum = values.reduce((acc, val) => acc + val, 0);
            return parseFloat((sum / values.length).toFixed(2));
        };

        const cooccurrenceMean = getMean(cooccurrenceLocations);
        const controlMean = getMean(controlLocations);
        
        analysis.push({ factor: variable, cooccurrenceMean, controlMean });
    });

    return analysis;
}

/**
 * Runs environmental analysis for all significant pairs.
 */
export function analyzeAllEnvironmentalFactors(
    significantPairs: SignificantPair[],
    speciesData: SpeciesData[],
    siteData: SiteData
): AllEnvironmentalAnalyses {
    const locationsPresence = getSpeciesPresenceByLocation(speciesData);
    const allAnalyses: AllEnvironmentalAnalyses = {};

    significantPairs.forEach(pair => {
        const analysis = analyzeEnvironmentalFactors(pair, locationsPresence, siteData);
        if (analysis) {
            const pairKey = `${pair.speciesA} & ${pair.speciesB}`;
            allAnalyses[pairKey] = { pair, analysis };
        }
    });

    return allAnalyses;
}

/**
 * Calculates a suite of ecological parameters and diversity indices for each site.
 * @param allSpeciesData Array of all processed species data for the entire study.
 * @returns An object containing ecological parameters for each site.
 */
export function calculateEcologicalParameters(allSpeciesData: SpeciesData[]): SiteEcologicalParameters {
    if (allSpeciesData.length === 0) {
        return {};
    }

    const siteDataMap: { [siteName: string]: SpeciesData[] } = {};
    allSpeciesData.forEach(row => {
        const siteName = row['Tipo de vegetación'];
        if (siteName) {
            if (!siteDataMap[siteName]) siteDataMap[siteName] = [];
            siteDataMap[siteName].push(row);
        }
    });

    const results: SiteEcologicalParameters = {};

    for (const siteName in siteDataMap) {
        const siteData = siteDataMap[siteName];
        if (siteData.length === 0) continue;

        const speciesCounts: { [speciesName: string]: number } = {};
        siteData.forEach(row => {
            const speciesName = row['N_Científico (Abreviado)'];
            if (speciesName) {
                speciesCounts[speciesName] = (speciesCounts[speciesName] || 0) + 1;
            }
        });

        const N = siteData.length;
        const S = Object.keys(speciesCounts).length;
        
        const genusRichness = new Set(siteData.map(d => d['Género']).filter(Boolean)).size;
        const familyRichness = new Set(siteData.map(d => d['Familia']).filter(Boolean)).size;

        if (N === 0 || S === 0) {
            results[siteName] = { 
                speciesRichness: 0, individuals: 0, genusRichness: 0, familyRichness: 0,
                sampleCoverage: 0, shannon: 0, simpsonDominance: 0, pielouEvenness: 0,
                margalefRichness: 0, chao1: 0, chao1Se: 0, chao1Lower: 0, chao1Upper: 0
            };
            continue;
        }

        const abundances = Object.values(speciesCounts);
        const shannon = shannonEntropy(abundances);
        const simpsonDominance = simpsonDominanceIndex(abundances);
        const pielouEvenness = S > 1 ? shannon / Math.log(S) : 1;
        const sampleCoverage = coverageEstimate(abundances);
        const margalefRichness = N > 1 ? (S - 1) / Math.log(N) : 0;
        const chao = chao1(abundances);
        const chao1Value = chao.estimate;

        results[siteName] = {
            speciesRichness: S,
            individuals: N,
            genusRichness,
            familyRichness,
            sampleCoverage,
            shannon,
            simpsonDominance,
            pielouEvenness,
            margalefRichness,
            chao1: chao1Value,
            chao1Se: chao.se,
            chao1Lower: chao.lcl,
            chao1Upper: chao.ucl,
        };
    }
    return results;
}


const calculateIVIMetrics = (speciesData: SpeciesData[]): StructuralAnalysisResult => {
     if (speciesData.length === 0) {
        return {};
    }

    const speciesGroups: { [key: string]: SpeciesData[] } = {};
    speciesData.forEach(row => {
        const speciesName = row['N_Científico (Abreviado)'];
        if (!speciesGroups[speciesName]) {
            speciesGroups[speciesName] = [];
        }
        speciesGroups[speciesName].push(row);
    });
    
    const uniqueSpecies = Object.keys(speciesGroups).sort();
    
    const results: { [key: string]: Partial<SpeciesStructuralMetrics> & { dominanceAbs: number } } = {};
    
    uniqueSpecies.forEach(species => {
        const group = speciesGroups[species];
        const abundanceAbs = group.length;
        const frequencyAbs = new Set(group.map(d => `${d['Tipo de vegetación']}-${d['Parcela']}`)).size;
        const dominanceAbs = group.reduce((sum, d) => sum + (Number(d['Área basal (cm²)']) || 0), 0);
        
        results[species] = { abundanceAbs, frequencyAbs, dominanceAbs };
    });

    const totalIndividuals = uniqueSpecies.reduce((sum, sp) => sum + (results[sp].abundanceAbs || 0), 0);
    const sumOfFrequencies = uniqueSpecies.reduce((sum, sp) => sum + (results[sp].frequencyAbs || 0), 0);
    const totalDominance = uniqueSpecies.reduce((sum, sp) => sum + (results[sp].dominanceAbs || 0), 0);
    
    const finalResults: StructuralAnalysisResult = {};

    uniqueSpecies.forEach(species => {
        const abs = results[species];
        const abundanceRel = totalIndividuals > 0 ? (abs.abundanceAbs! / totalIndividuals) * 100 : 0;
        const frequencyRel = sumOfFrequencies > 0 ? (abs.frequencyAbs! / sumOfFrequencies) * 100 : 0;
        const dominanceRel = totalDominance > 0 ? (abs.dominanceAbs! / totalDominance) * 100 : 0;
        
        const ivi300 = abundanceRel + frequencyRel + dominanceRel;
        const ivi100 = ivi300 / 3;

        finalResults[species] = {
            abundanceAbs: abs.abundanceAbs!,
            abundanceRel: parseFloat(abundanceRel.toFixed(2)),
            frequencyAbs: abs.frequencyAbs!,
            frequencyRel: parseFloat(frequencyRel.toFixed(2)),
            dominanceAbs: parseFloat(abs.dominanceAbs.toFixed(2)),
            dominanceRel: parseFloat(dominanceRel.toFixed(2)),
            ivi300: parseFloat(ivi300.toFixed(2)),
            ivi100: parseFloat(ivi100.toFixed(2)),
        };
    });

    return finalResults;
};

// Helper for mean and SD
const calculateMeanAndSD = (arr: number[]): { mean: number; sd: number } => {
    if (arr.length === 0) return { mean: 0, sd: 0 };
    const mean = arr.reduce((acc, val) => acc + val, 0) / arr.length;
    const sd = Math.sqrt(arr.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / (arr.length > 1 ? arr.length - 1 : 1));
    return { mean, sd };
};

// New function to calculate stand characteristics
export const calculateStandCharacteristics = (allSpeciesData: SpeciesData[], plotInfo: PlotInfo | null): SiteStandCharacteristics => {
    const results: SiteStandCharacteristics = {};
    const sites = Array.from(new Set(allSpeciesData.map(d => d['Tipo de vegetación']).filter(Boolean))).sort();

    sites.forEach(site => {
        const siteData = allSpeciesData.filter(d => d['Tipo de vegetación'] === site);
        if (siteData.length === 0) return;

        const heights = siteData.map(d => Number(d['Altura (m)'])).filter(h => h > 0);
        const dbhs = siteData.map(d => Number(d['DAP (cm)'])).filter(d => d > 0);
        const densities = siteData.map(d => Number(d['Densidad (g/cm3)'])).filter(d => d > 0);

        const heightStats = calculateMeanAndSD(heights);
        const dbhStats = calculateMeanAndSD(dbhs);
        const densityStats = calculateMeanAndSD(densities);

        const numPlots = new Set(siteData.map(d => d['Parcela'])).size;

        let stemDensity: number | 'N/A' = 'N/A';
        if (plotInfo && plotInfo[site]) {
            const numPlotsForSite = parseFloat(plotInfo[site].numPlots);
            const plotAreaM2 = parseFloat(plotInfo[site].plotArea);
            if (!isNaN(numPlotsForSite) && numPlotsForSite > 0 && !isNaN(plotAreaM2) && plotAreaM2 > 0) {
                const totalAreaHa = (numPlotsForSite * plotAreaM2) / 10000;
                stemDensity = siteData.length / totalAreaHa;
            }
        }
        
        results[site] = {
            numPlots,
            stemDensity: typeof stemDensity === 'number' ? parseFloat(stemDensity.toFixed(0)) : 'N/A',
            minHeight: heights.length > 0 ? Math.min(...heights) : 0,
            maxHeight: heights.length > 0 ? Math.max(...heights) : 0,
            avgHeight: `${heightStats.mean.toFixed(2)} ± ${heightStats.sd.toFixed(2)}`,
            minDBH: dbhs.length > 0 ? Math.min(...dbhs) : 0,
            maxDBH: dbhs.length > 0 ? Math.max(...dbhs) : 0,
            avgDBH: `${dbhStats.mean.toFixed(2)} ± ${dbhStats.sd.toFixed(2)}`,
            minWoodDensity: densities.length > 0 ? Math.min(...densities) : 0,
            maxWoodDensity: densities.length > 0 ? Math.max(...densities) : 0,
            avgWoodDensity: `${densityStats.mean.toFixed(2)} ± ${densityStats.sd.toFixed(2)}`,
        };
    });

    return results;
};

/**
 * Performs a structural analysis (IVI and stand characteristics).
 * @param allSpeciesData Array of all processed species data.
 * @param plotInfo Information about plots needed for density calculations.
 * @returns A nested object containing both IVI and stand characteristics results.
 */
export function runStructuralAnalysis(allSpeciesData: SpeciesData[], plotInfo: PlotInfo | null): FullStructuralAnalysis {
    if (allSpeciesData.length === 0) {
        return { ivi: {}, stand: {} };
    }
    
    const iviResults: SiteStructuralAnalysis = {};
    const standResults = calculateStandCharacteristics(allSpeciesData, plotInfo);

    // IVI General Analysis
    iviResults['General'] = calculateIVIMetrics(allSpeciesData);

    // IVI Per-Site Analysis
    const sites = Array.from(new Set(allSpeciesData.map(d => d['Tipo de vegetación']).filter(Boolean)));
    sites.forEach(site => {
        const siteData = allSpeciesData.filter(d => d['Tipo de vegetación'] === site);
        iviResults[site] = calculateIVIMetrics(siteData);
    });

    return { ivi: iviResults, stand: standResults };
}


/**
 * Indicator species analysis (IndVal; Dufrêne & Legendre 1997; De Cáceres & Legendre 2009).
 * Groups are vegetation types (or, with targetSite, that type vs. all others). 999 seeded permutations.
 */
export function runIndValAnalysis(speciesData: SpeciesData[], targetSite?: string): IndValResult {
    const community = buildCommunity(speciesData);
    if (community.plots.length === 0) return {};
    const groups = community.groups.map(g => (targetSite ? (g === targetSite ? targetSite : OTHER_GROUP) : g));
    if (new Set(groups).size < 2) return {};

    const out = indicatorSpecies(community.abundance, community.species, groups, { nPermutations: 999, seed: DEFAULT_SEED });
    const results: IndValResult = {};
    out.species.forEach(sp => {
        results[sp.species] = {};
        out.groups.forEach(g => {
            const v = sp.groups[g];
            const isBest = g === sp.bestGroup;
            results[sp.species][g] = {
                indval: parseFloat(v.indvalPct.toFixed(2)),
                stat: parseFloat(v.stat.toFixed(4)),
                A: parseFloat(v.A.toFixed(4)),
                B: parseFloat(v.B.toFixed(4)),
                isBest,
                pvalue: isBest ? parseFloat(sp.p.toFixed(3)) : null,
                pAdj: isBest ? parseFloat(sp.pAdj.toFixed(3)) : null,
            };
        });
    });
    return results;
}

export const OTHER_GROUP = 'Otros';


/**
 * Calculates the Pearson correlation coefficient between two arrays of numbers.
 * @param x First array of numbers.
 * @param y Second array of numbers.
 * @returns The Pearson correlation coefficient.
 */
function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  if (n < 2 || y.length !== n) return 0; 

  const sumX = x.reduce((a, b) => a + b, 0);
  const sumY = y.reduce((a, b) => a + b, 0);
  const sumXY = x.map((xi, i) => xi * y[i]).reduce((a, b) => a + b, 0);
  const sumX2 = x.map(xi => xi * xi).reduce((a, b) => a + b, 0);
  const sumY2 = y.map(yi => yi * yi).reduce((a, b) => a + b, 0);

  const numerator = n * sumXY - sumX * sumY;
  const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));

  if (denominator === 0) return 0;

  return numerator / denominator;
}

/**
 * Calculates the correlation matrix between species presence and environmental factors.
 * @param speciesData Array of processed species data.
 * @param siteData Structured site data.
 * @returns A correlation matrix object.
 */
export function calculateCorrelationMatrix(
  speciesData: SpeciesData[],
  siteData: SiteData
): CorrelationMatrix {
  const presenceByLocation = getSpeciesPresenceByLocation(speciesData);
  const allLocations = Object.keys(siteData).sort();
  const allSpecies = Array.from(new Set(speciesData.map(d => d['N_Científico (Abreviado)'] as string).filter(Boolean))).sort();

  if (allLocations.length === 0 || allSpecies.length === 0) return {};
  
  const allFactorsSet = new Set<string>();
  Object.values(siteData).forEach(siteVariables => {
      if (siteVariables) {
          Object.keys(siteVariables).forEach(factor => allFactorsSet.add(factor));
      }
  });
  const allFactors = Array.from(allFactorsSet).sort();
  
  if (allFactors.length === 0) return {};

  const correlationMatrix: CorrelationMatrix = {};

  allSpecies.forEach(species => {
    correlationMatrix[species] = {};
    const speciesPresenceVector = allLocations.map(loc => presenceByLocation[loc]?.has(species) ? 1 : 0);

    allFactors.forEach(factor => {
      // Create vectors only from locations that have valid numerical data for the current factor
      const pairedPresence: number[] = [];
      const pairedFactor: number[] = [];
      
      allLocations.forEach((loc, i) => {
        const factorValue = siteData[loc]?.[factor];
        if (typeof factorValue === 'number' && isFinite(factorValue)) {
          pairedPresence.push(speciesPresenceVector[i]);
          pairedFactor.push(factorValue);
        }
      });
      
      correlationMatrix[species][factor] = pearsonCorrelation(pairedPresence, pairedFactor);
    });
  });

  return correlationMatrix;
}

/**
 * Canonical Correspondence Analysis computed numerically (equivalent to vegan::cca), with a
 * 999-permutation test, VIFs and 95% ellipses of plots by vegetation type.
 * Species abundances = number of individuals per plot. Only numeric environmental variables are used;
 * plots without species or with missing environmental values are excluded and reported.
 */
export function runCCAAnalysis(speciesData: SpeciesData[], siteData: SiteData): SingleCCAPlotData {
    const empty = (notes: string[]): SingleCCAPlotData => ({
        biplot: { species: [], vectors: [], sites: [] },
        correlationMatrix: {},
        notes,
    });
    const community = buildCommunity(speciesData);
    const envPlots = Object.keys(siteData);
    if (envPlots.length === 0) return empty(['Sin datos ambientales: el CCA requiere la tabla de características del sitio.']);

    // Numeric variables only
    const allVars = Array.from(new Set(envPlots.flatMap(p => Object.keys(siteData[p] || {})))).sort();
    const isNum = (v: unknown) => typeof v === 'number' && Number.isFinite(v);
    const numericVars = allVars.filter(v => envPlots.some(p => isNum(siteData[p]?.[v])));
    const excludedVariables = allVars.filter(v => !numericVars.includes(v));

    const plotIdx = community.plots
        .map((p, i) => ({ p, i }))
        .filter(({ p }) => siteData[p] !== undefined);
    const complete = plotIdx.filter(({ p }) => numericVars.every(v => isNum(siteData[p][v])));
    const excludedPlots = [
        ...community.plots.filter(p => siteData[p] === undefined),
        ...plotIdx.filter(o => !complete.includes(o)).map(o => o.p),
    ];

    // Drop constant variables (no information) and species absent from the retained plots
    const vars = numericVars.filter(v => {
        const vals = complete.map(({ p }) => siteData[p][v] as number);
        return vals.length > 0 && Math.max(...vals) - Math.min(...vals) > 0;
    });
    excludedVariables.push(...numericVars.filter(v => !vars.includes(v)));
    const Yfull = complete.map(({ i }) => community.abundance[i]);
    const keepSp = community.species.map((_, j) => Yfull.some(row => row[j] > 0));
    const speciesNames = community.species.filter((_, j) => keepSp[j]);
    const Y = Yfull.map(row => row.filter((_, j) => keepSp[j]));

    const notes: string[] = [];
    if (excludedPlots.length) notes.push(`Parcelas excluidas (sin datos de especies o con datos ambientales incompletos): ${excludedPlots.join(', ')}.`);
    if (excludedVariables.length) notes.push(`Variables excluidas (no numéricas o constantes): ${excludedVariables.join(', ')}.`);
    if (vars.length === 0) return empty([...notes, 'No hay variables ambientales numéricas con variación.']);
    if (complete.length < 3 || speciesNames.length < 2) return empty([...notes, 'Se necesitan al menos 3 parcelas y 2 especies con datos completos.']);
    if (vars.length >= complete.length - 1) {
        notes.push(`Atención: hay ${vars.length} variables para ${complete.length} parcelas. Con tantas variables el CCA queda casi sin restricciones y el test no es fiable; reduzca el número de variables.`);
    }

    const siteNames = complete.map(({ p }) => p);
    const groups = complete.map(({ i }) => community.groups[i]);
    const input = {
        Y,
        X: complete.map(({ p }) => vars.map(v => siteData[p][v] as number)),
        siteNames,
        speciesNames,
        envNames: vars,
    };
    const res = cca(input);
    const test = ccaPermutationTest(input, { nPermutations: 999, seed: DEFAULT_SEED });

    // Label the 15 most abundant species; the rest are drawn as unlabeled points
    const labeled = new Set(
        res.species.slice().sort((a, b) => b.weight - a.weight).slice(0, 15).map(s => s.name),
    );
    const species: CCACoordinates[] = res.species.map(s => ({ name: s.name, x: s.x, y: s.y, isBackground: !labeled.has(s.name) }));
    const sites: CCACoordinates[] = res.sitesWA.map((s, k) => ({ name: s.name, x: s.x, y: s.y, group: groups[k] }));
    const ellipses = new Set(groups).size > 1
        ? groupEllipses(res.sitesWA, groups).map(e => ({ cx: e.cx, cy: e.cy, rx: e.rx, ry: e.ry, angle: e.angle, group: e.group }))
        : [];

    if (res.rank < 2) notes.push('Solo hay un eje restringido (una variable ambiental): el eje vertical del gráfico es nulo.');

    return {
        biplot: { species, vectors: res.biplot.map(b => ({ name: b.name, x: b.x, y: b.y })), sites },
        correlationMatrix: calculateCorrelationMatrix(speciesData, siteData),
        ellipses,
        varianceExplained: [res.axisPercent[0] ?? 0, res.axisPercent[1] ?? 0],
        stats: {
            nSites: siteNames.length,
            nSpecies: speciesNames.length,
            totalInertia: res.totalInertia,
            constrainedInertia: res.constrainedInertia,
            constrainedPercent: (100 * res.constrainedInertia) / res.totalInertia,
            eigenvalues: res.eigenvalues,
            axisPercent: res.axisPercent,
            F: test.F,
            df: test.df,
            dfResidual: test.dfResidual,
            pValue: test.p,
            nPermutations: test.nPermutations,
            seed: test.seed,
            vif: res.vif,
            excludedPlots,
            excludedVariables,
        },
        notes,
    };
}

/**
 * Rarefaction and extrapolation of Hill numbers (q = 0, 1, 2) per vegetation type, following iNEXT
 * (Chao et al. 2014): extrapolation up to twice the observed sample size, 95% CI from 100 seeded
 * bootstrap replicates.
 */
export function calculateRarefactionData(allSpeciesData: SpeciesData[]): RarefactionData {
    const results: RarefactionData = {};
    const sites = Array.from(new Set(allSpeciesData.map(d => d['Tipo de vegetación'] as string).filter(Boolean))).sort();

    sites.forEach(site => {
        const counts: Record<string, number> = {};
        allSpeciesData.forEach(d => {
            if (d['Tipo de vegetación'] !== site) return;
            const sp = d['N_Científico (Abreviado)'] as string;
            if (sp) counts[sp] = (counts[sp] || 0) + 1;
        });
        const values = Object.values(counts);
        const n = values.reduce((a, b) => a + b, 0);
        if (n < 2) return;
        const res = rarefactionExtrapolation(values, { nBoot: 100, seed: DEFAULT_SEED });

        const toCurve = (q: 0 | 1 | 2): RarefactionCurve => {
            const pts = res.curves.find(c => c.q === q)!.points;
            const obs = pts.find(p => p.method === 'observed')!;
            return {
                observed: {
                    point: { x: obs.m, y: obs.qD },
                    curve: pts.filter(p => p.m <= n).map(p => ({ x: p.m, y: p.qD })),
                },
                extrapolated: { curve: pts.filter(p => p.m >= n).map(p => ({ x: p.m, y: p.qD })) },
                confidenceInterval: {
                    lower: pts.map(p => ({ x: p.m, y: p.lcl })),
                    upper: pts.map(p => ({ x: p.m, y: p.ucl })),
                },
            };
        };
        results[site] = {
            n: res.n,
            S: res.S,
            byOrder: { '0': toCurve(0), '1': toCurve(1), '2': toCurve(2) },
            coverage: res.curves[0].points.map(p => ({ m: p.m, SC: p.SC, lcl: p.scLcl, ucl: p.scUcl })),
            nBoot: res.nBoot,
            seed: res.seed,
        };
    });

    return results;
}


// --- BIOMASS CALCULATION LOGIC ---

export const EQUATION_OPTIONS: Record<string, string> = {
    '': 'Seleccione una ecuación',
    cacao: 'Cacao (Fomekong et al., 2024)',
    cafe: 'Café (Segura et al., 2006)',
    citrus_sinensis: 'Citrus sinensis (Schroth et al., 2002)',
    musa_sp: 'Musa sp. (Hairiah et al., 2001)',
    dry: 'Dry Forest (Chave et al., 2005)',
    moist: 'Moist Forest (Chave et al., 2005)',
    wet: 'Wet Forest (Chave et al., 2005)',
    generic_no_height: 'Bosque Tropical Genérico (Chave et al., 2005, sin altura)',
};

const robustParse = (value: string | number | null | undefined): number => {
    if (value === null || value === undefined) return NaN;
    const strValue = String(value).trim().replace(',', '.');
    if (strValue === '') return NaN;
    return parseFloat(strValue);
};

const robustDAP = (row: ForestDataRow) => robustParse(row['DAP (cm)']);
const robustHeight = (row: ForestDataRow) => robustParse(row['Altura (m)']);
const robustDensity = (row: ForestDataRow) => robustParse(row['Densidad (g/cm3)']);


const calculationFunctions: Record<string, (row: ForestDataRow) => number | null> = {
    cacao: (row) => {
        const d30 = robustDAP(row);
        if (d30 > 0) {
            return Math.exp(-1.613 + 1.83 * Math.log(d30));
        }
        return null;
    },
    cafe: (row) => {
        const d15 = robustDAP(row);
        if (d15 > 0) {
            return Math.pow(10, -1.181 + 1.991 * Math.log10(d15));
        }
        return null;
    },
    citrus_sinensis: (row) => {
        const dap = robustDAP(row);
        if (dap > 0) {
            const AB = calculateBasalArea(dap); 
            const biomassInKg = -6.64 + 0.279 * AB + 0.000514 * Math.pow(AB, 2);
            return Math.max(0, biomassInKg); 
        }
        return null;
    },
    musa_sp: (row) => {
        const D = robustDAP(row);
        if (D > 0) {
            return 0.0303 * Math.pow(D, 2.1345);
        }
        return null;
    },
    dry: (row) => {
        const p = robustDensity(row);
        const D = robustDAP(row);
        const H = robustHeight(row);
        if (p > 0 && D > 0 && H > 0) {
            return 0.112 * Math.pow(p * Math.pow(D, 2) * H, 0.916);
        }
        return null;
    },
    moist: (row) => {
        const p = robustDensity(row);
        const D = robustDAP(row);
        const H = robustHeight(row);
        if (p > 0 && D > 0 && H > 0) {
            return 0.0509 * p * Math.pow(D, 2) * H;
        }
        return null;
    },
    wet: (row) => {
        const p = robustDensity(row);
        const D = robustDAP(row);
        const H = robustHeight(row);
        if (p > 0 && D > 0 && H > 0) {
            return 0.0776 * Math.pow(p * Math.pow(D, 2) * H, 0.940);
        }
        return null;
    },
    generic_no_height: (row) => {
        const p = robustDensity(row);
        const D = robustDAP(row);
        if (p > 0 && D > 0) {
             const lnD = Math.log(D);
             return p * Math.exp(-1.499 + 2.148 * lnD + 0.207 * Math.pow(lnD, 2) - 0.0281 * Math.pow(lnD, 3));
        }
        return null;
    },
};

const CACAO_SCIENTIFIC_NAME = 'theobroma cacao';
const COFFEE_SCIENTIFIC_NAME = 'coffea';
const COFFEE_COMMON_NAME_TILDE = 'café';
const COFFEE_COMMON_NAME_NO_TILDE = 'cafe';
const CITRUS_SCIENTIFIC_NAME = 'citrus sinensis';
const MUSA_SCIENTIFIC_NAME = 'musa';

const processBiomassData = (
    data: ForestDataRow[],
    selections: EquationSelection
): ForestDataRow[] => {
    return data.map(row => {
        const scientificName = String(row['Nombre científico (Completo)'] || '').toLowerCase();
        const vegetationType = row['Tipo de vegetación'] as string;
        
        let equationKeyToUse: string | null = null;

        if (scientificName.includes(CACAO_SCIENTIFIC_NAME)) {
            equationKeyToUse = 'cacao';
        } else if (
            scientificName.includes(COFFEE_SCIENTIFIC_NAME) || 
            scientificName.includes(COFFEE_COMMON_NAME_TILDE) ||
            scientificName.includes(COFFEE_COMMON_NAME_NO_TILDE)
        ) {
            equationKeyToUse = 'cafe';
        } else if (scientificName.includes(CITRUS_SCIENTIFIC_NAME)) {
            equationKeyToUse = 'citrus_sinensis';
        } else if (scientificName.includes(MUSA_SCIENTIFIC_NAME)) {
            equationKeyToUse = 'musa_sp';
        } else if (typeof vegetationType === 'string' && selections[vegetationType]) {
            equationKeyToUse = selections[vegetationType];
        }

        let agb_kg = null;
        if (equationKeyToUse && calculationFunctions[equationKeyToUse]) {
            agb_kg = calculationFunctions[equationKeyToUse](row);
        }

        const agb_mg = agb_kg !== null ? agb_kg / 1000 : null;
        const carbon = agb_mg !== null ? agb_mg * 0.50 : null;

        return {
            ...row,
            'AGB_Mg': agb_mg,
            'Carbono_Almacenado_Mg': carbon,
        };
    });
};

const calculateSummaryAndTotals = (
    data: ForestDataRow[], 
    plotInfo: PlotInfo
): { 
    summary: SummaryRow[], 
    summaryByPlot: PlotSummaryRow[],
    totals: { 
        agb: number, 
        carbon: number, 
        carbonPerHa?: number 
    } 
} => {
    const summaryMap: Record<string, { agb: number, carbon: number }> = {};
    data.forEach(row => {
        const vegType = row['Tipo de vegetación'] as string;
        const agb = row['AGB_Mg'] as number;
        const carbon = row['Carbono_Almacenado_Mg'] as number;

        if (typeof vegType === 'string' && typeof agb === 'number' && typeof carbon === 'number') {
            if (!summaryMap[vegType]) {
                summaryMap[vegType] = { agb: 0, carbon: 0 };
            }
            summaryMap[vegType].agb += agb;
            summaryMap[vegType].carbon += carbon;
        }
    });

    const detailedSummary = Object.entries(summaryMap).map(([vegType, totals]) => {
        const info = plotInfo[vegType];
        const numPlots = Number(String(info?.numPlots ?? '0').replace(',', '.'));
        const plotAreaM2 = Number(String(info?.plotArea ?? '0').replace(',', '.'));
        
        const plotAreaHa = plotAreaM2 / 10000;
        const totalAreaHa = (numPlots > 0 && plotAreaHa > 0) ? numPlots * plotAreaHa : 0;

        const carbonPerHa = totalAreaHa > 0 ? totals.carbon / totalAreaHa : undefined;
        
        return {
            'Tipo de vegetación': vegType,
            'AGB_Mg_Total': totals.agb,
            'Carbono_Mg_Total': totals.carbon,
            'Carbono_Mg/ha': carbonPerHa,
        };
    });

    const summary: SummaryRow[] = detailedSummary.map(item => ({
        'Tipo de vegetación': item['Tipo de vegetación'],
        'AGB_Mg_Total': item['AGB_Mg_Total'],
        'Carbono_Mg_Total': item['Carbono_Mg_Total'],
        'Carbono_Mg/ha': item['Carbono_Mg/ha'],
    }));

    const summaryByPlotMap: Record<string, { agb: number, carbon: number, vegType: string, plot: string }> = {};
    data.forEach(row => {
        const vegType = row['Tipo de vegetación'] as string;
        const plot = row['Parcela'] as string;
        const agb = row['AGB_Mg'] as number;
        const carbon = row['Carbono_Almacenado_Mg'] as number;
        
        if (typeof vegType === 'string' && vegType && plot != null && typeof agb === 'number' && typeof carbon === 'number') {
            const plotStr = String(plot);
            const key = `${vegType}-${plotStr}`;
            if (!summaryByPlotMap[key]) {
                summaryByPlotMap[key] = { agb: 0, carbon: 0, vegType, plot: plotStr };
            }
            summaryByPlotMap[key].agb += agb;
            summaryByPlotMap[key].carbon += carbon;
        }
    });

    const summaryByPlot: PlotSummaryRow[] = Object.values(summaryByPlotMap).map(item => {
        const info = plotInfo[item.vegType];
        const plotAreaM2 = Number(String(info?.plotArea ?? '0').replace(',', '.'));
        const plotAreaHa = plotAreaM2 / 10000;
        
        const carbonPerHa = plotAreaHa > 0 ? item.carbon / plotAreaHa : undefined;
        
        return {
            'Tipo de vegetación': item.vegType,
            'Parcela': item.plot,
            'AGB_Mg_Total': item.agb,
            'Carbono_Mg_Total': item.carbon,
            // Fixed: use local carbonPerHa variable instead of non-existent property on item
            'Carbono_Mg/ha': carbonPerHa,
        };
    }).sort((a, b) => {
        if (a['Tipo de vegetación'] !== b['Tipo de vegetación']) {
            return a['Tipo de vegetación'].localeCompare(b['Tipo de vegetación']);
        }
        return a['Parcela'].localeCompare(b['Parcela']);
    });

    const totalAgb = detailedSummary.reduce((sum, item) => sum + item['AGB_Mg_Total'], 0);
    const totalCarbon = detailedSummary.reduce((sum, item) => sum + item['Carbono_Mg_Total'], 0);

    const perHaItems = detailedSummary.filter(item => item['Carbono_Mg/ha'] !== undefined);
            
    const totalCarbonPerHa = perHaItems.length > 0
        ? perHaItems.reduce((sum, item) => sum + (item['Carbono_Mg/ha'] || 0), 0) / perHaItems.length
        : undefined;

    return {
        summary,
        summaryByPlot,
        totals: { 
            agb: totalAgb, 
            carbon: totalCarbon,
            carbonPerHa: totalCarbonPerHa
        }
    };
};

export function runBiomassAnalysis(
  speciesData: ForestDataRow[],
  equationSelections: EquationSelection,
  plotInfo: PlotInfo,
  originalHeaders: string[]
): BiomassAnalysisResults {
  const processedData = processBiomassData(speciesData, equationSelections);
  const { summary, totals, summaryByPlot } = calculateSummaryAndTotals(processedData, plotInfo);
  return { summary, summaryByPlot, totals, processedData, originalHeaders };
}
