
import React, { useState, useCallback, useMemo } from 'react';
import { SpeciesData, SiteCooccurrenceMatrix, SignificantPair, AllEnvironmentalAnalyses, SingleNicheData, SingleCCAPlotData, CooccurrenceCell, SiteEcologicalParameters, RarefactionData, IndValResult, FullStructuralAnalysis, SiteNicheData, SiteCCAPlotData, BiomassAnalysisResults, EquationSelection, PlotInfo, ForestDataRow, SiteData } from './types';
import { parseData, parseSiteData, runCooccurrenceAnalysis, getSignificantPairs, analyzeAllEnvironmentalFactors, calculateSpeciesEnvironmentalNiche, runStructuralAnalysis, calculateCorrelationMatrix, calculateEllipsesFromClusteredPoints, calculateEcologicalParameters, runIndValAnalysis, runBiomassAnalysis, calculateRarefactionData } from './services/analysisService';
import { generateFinalInterpretation, generateCCAPlotData, generateMethodology, hasApiKeyConfigured, getApiKey } from './services/geminiService';
import { generateMethodologyDocx, generateInterpretationDocx } from './services/docxGenerator';
import DataInput from './components/DataInput';
import CooccurrenceTable from './components/CooccurrenceTable';
import InterpretationDisplay from './components/InterpretationDisplay';
import SpeciesNicheTable from './components/SpeciesNicheTable';
import { CCAPlot } from './components/CCAPlot';
import StructuralAnalysisTable from './components/StructuralAnalysisTable';
import EcologicalParametersTable from './components/EcologicalParametersTable';
import RarefactionCurvePlot from './components/RarefactionCurvePlot';
import IndValTable from './components/IndValTable';
import LanguageSwitcher from './components/LanguageSwitcher';
import BiomassCalculatorTab from './components/BiomassCalculatorTab';
import BiomassConfigPanel from './components/BiomassConfigPanel';
import { LeafIcon, LineChartIcon, ScienceIcon, ChartBarIcon, ScatterChartIcon, TreeIcon, DocumentTextIcon, DocxIcon, PieChartIcon, TagIcon, CalculatorIcon } from './components/Icons';
import { sampleSpeciesData } from './sample-data/species';
import { sampleSiteData } from './sample-data/site';
import { useTranslations } from './translations';
import { useLanguage } from './LanguageContext';

const formatMatrixForPrompt = (matrix: SiteCooccurrenceMatrix['General']): string => {
  const positivePairs: string[] = [];
  const negativePairs: string[] = [];
  const species = Object.keys(matrix).sort();

  species.forEach(spA => {
    species.forEach(spB => {
      if (spA >= spB) return; 
      
      const cell = matrix[spA][spB] as CooccurrenceCell;
      if ('effect' in cell) {
        const p_value = cell.obs > cell.exp ? cell.p_gt : cell.p_lt;
        if (cell.effect === 'positive') {
          positivePairs.push(`- *${spA}* & *${spB}*: co-occur more than expected (Obs: ${cell.obs}, Exp: ${cell.exp.toFixed(1)}, p-value: ${p_value.toPrecision(2)})`);
        } else if (cell.effect === 'negative') {
          negativePairs.push(`- *${spA}* & *${spB}*: co-occur less than expected (Obs: ${cell.obs}, Exp: ${cell.exp.toFixed(1)}, p-value: ${p_value.toPrecision(2)})`);
        }
      }
    });
  });

  let summary = 'Co-occurrence Statistical Analysis Summary (alpha = 0.05):\n\n';
  if (positivePairs.length > 0) {
    summary += 'Pairs with **significant POSITIVE association**:\n';
    summary += positivePairs.join('\n');
    summary += '\n\n';
  } else {
    summary += '**No pairs with significant positive association were found.**\n\n';
  }
  
  if (negativePairs.length > 0) {
    summary += 'Pairs with **significant NEGATIVE association**:\n';
    summary += negativePairs.join('\n');
    summary += '\n';
  } else {
    summary += '**No pairs with significant negative association were found.**\n';
  }

  return summary;
};

const formatEnvironmentalAnalysisForPrompt = (allAnalyses: AllEnvironmentalAnalyses | null): string => {
    if (!allAnalyses || Object.keys(allAnalyses).length === 0) {
        return "No environmental data was provided or it was not applicable for the significant pairs.";
    }
    let analysesString = 'Comparative Environmental Analysis Results for Significant Pairs:\n\n';
    const sortedPairKeys = Object.keys(allAnalyses).sort();
    for (const pairKey of sortedPairKeys) {
        const { pair, analysis } = allAnalyses[pairKey];
        analysesString += `**Pair: *${pair.speciesA}* & *${pair.speciesB}* (${pair.effect.toUpperCase()} Association)**\n`;
        analysis.forEach(res => {
            analysesString += `- *${res.factor}*: Co-occurrence Mean: ${res.cooccurrenceMean}, Control Mean: ${res.controlMean}\n`;
        });
        analysesString += '\n';
    }
    return analysesString;
};

const formatNicheAnalysisForPrompt = (nicheData: SingleNicheData | null): string => {
    if (!nicheData || Object.keys(nicheData).length === 0) {
        return "No environmental niche analysis was performed.";
    }

    const species = Object.keys(nicheData).sort();
    if (species.length === 0) {
        return "No data found for environmental niche analysis.";
    }
    const factors = Object.keys(nicheData[species[0]]).sort();

    let table = `Environmental Niche Analysis (average conditions where each species is present):\n\n`;
    table += `| Species | ${factors.join(' | ')} |\n`;
    table += `|---|${factors.map(() => '---').join('|')}|\n`;

    species.forEach(s => {
        const values = factors.map(f => nicheData[s][f]).join(' | ');
        table += `| *${s}* | ${values} |\n`;
    });

    return table;
};

const formatCCAPlotDataForPrompt = (ccaPlotData: SingleCCAPlotData | null): string => {
    if (!ccaPlotData) {
        return "CCA analysis was not performed.";
    }

    let summary = 'Canonical Correspondence Analysis (CCA) - Relationship Summary:\n\n';

    if(ccaPlotData.varianceExplained) {
        summary += `The first two axes explain **${ccaPlotData.varianceExplained[0]}%** and **${ccaPlotData.varianceExplained[1]}%** of the variance in the species-environment relationship, respectively.\n\n`;
    }

    summary += '**Key Biplot Relationships:**\n';
    ccaPlotData.biplot.vectors.forEach(vector => {
        summary += `- The variable **${vector.name}** is an important gradient.\n`;
        const associatedSpecies = ccaPlotData.biplot.species
            .filter(sp => {
                const dotProduct = sp.x * vector.x + sp.y * vector.y;
                const vectorMagnitude = Math.sqrt(vector.x * vector.x + vector.y * vector.y);
                return dotProduct > (vectorMagnitude * vectorMagnitude * 0.5); 
            })
            .map(sp => sp.name);

        if (associatedSpecies.length > 0) {
            summary += `  - Species like *${associatedSpecies.join(', ')}* are positively associated with this factor.\n`;
        }
    });

    summary += '\n**Strongest Species-Environment Correlations:**\n';
    const correlations: { species: string; factor: string; value: number }[] = [];
    const sortedSpecies = Object.keys(ccaPlotData.correlationMatrix).sort();
    
    sortedSpecies.forEach(species => {
        const sortedFactors = Object.keys(ccaPlotData.correlationMatrix[species]).sort();
        sortedFactors.forEach(factor => {
            correlations.push({ species, factor, value: ccaPlotData.correlationMatrix[species][factor] });
        });
    });

    correlations.sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
    const topCorrelations = correlations.slice(0, 5);
    
    summary += '  - Top Correlations: ' + topCorrelations.map(c => `*${c.species}* & **${c.factor}** (${c.value.toFixed(2)})`).join('; ') + '\n';

    return summary;
};

const formatEcoParamsForPrompt = (ecoParams: SiteEcologicalParameters | null): string => {
    if (!ecoParams) return "No ecological parameter analysis was performed.";
    const sites = Object.keys(ecoParams).sort();
    if (sites.length === 0) return "No ecological parameter data available.";

    let table = `Summary of Ecological Parameters per Site:\n\n`;
    table += `| Site | Richness (S) | Individuals (N) | Shannon (H') | Simpson (D) | Pielou (J') | Sample Coverage (SC) | Margalef (d) | Chao-1 |\n`;
    table += `|---|---|---|---|---|---|---|---|---|\n`;

    sites.forEach(site => {
        const d = ecoParams[site];
        table += `| ${site} | ${d.speciesRichness} | ${d.individuals} | ${d.shannon.toFixed(3)} | ${d.simpsonDominance.toFixed(3)} | ${d.pielouEvenness.toFixed(3)} | ${d.sampleCoverage.toFixed(3)} | ${d.margalefRichness.toFixed(3)} | ${d.chao1.toFixed(3)} |\n`;
    });

    return table;
};

const formatIndValForPrompt = (indValData: IndValResult | null): string => {
    if (!indValData) return "No indicator species analysis was performed.";
    const species = Object.keys(indValData).sort();
    if (species.length === 0) return "No indicator species data available.";

    let summary = 'Indicator Species Analysis (IndVal) - Significant Indicators (p < 0.05):\n\n';
    let significantFound = false;
    
    species.forEach(sp => {
        const sites = Object.keys(indValData[sp]).sort();
        sites.forEach(site => {
            const { indval, pvalue } = indValData[sp][site];
            if (pvalue < 0.05) {
                summary += `- ***${sp}*** is a significant indicator for site **${site}** (IndVal: ${indval.toFixed(1)}%, p: ${pvalue.toFixed(3)})\n`;
                significantFound = true;
            }
        });
    });

    if (!significantFound) {
        return "No significant indicator species were found for any site group (p < 0.05).";
    }
    return summary;
};

const formatRarefactionForPrompt = (rarefactionData: RarefactionData | null): string => {
    if (!rarefactionData) return "No rarefaction analysis was performed.";
    const sites = Object.keys(rarefactionData).sort();
    if (sites.length === 0) return "No rarefaction data available.";

    let summary = 'Rarefaction and Extrapolation Analysis Summary:\n\n';
    sites.forEach(site => {
        const data = rarefactionData[site];
        const observedPoint = data.observed.point;
        const extrapolatedEndPoint = data.extrapolated.curve[data.extrapolated.curve.length - 1];
        
        summary += `**Site: ${site}**\n`;
        summary += `- **Sampling Completeness:** Observed ${observedPoint.y} species from ${observedPoint.x} individuals.\n`;
        if (extrapolatedEndPoint) {
            summary += `- **Extrapolation:** Doubling the sample size to ${extrapolatedEndPoint.x} individuals is expected to yield approximately ${Math.round(extrapolatedEndPoint.y)} species.\n`;
        }
        summary += `- **Interpretation:** Assess if the rarefaction curve is approaching an asymptote. If it's still rising steeply, significant diversity remains unsampled.\n\n`;
    });
    return summary;
};

const formatBiomassForPrompt = (biomassResults: BiomassAnalysisResults | null): string => {
    if (!biomassResults) return "No biomass/carbon analysis was performed.";
    let summary = 'Biomass and Carbon Stock Analysis Summary:\n\n';

    summary += `**Overall Totals:**\n`;
    summary += `- Total Above-Ground Biomass (AGB): ${biomassResults.totals.agb.toFixed(2)} Mg\n`;
    summary += `- Total Stored Carbon: ${biomassResults.totals.carbon.toFixed(2)} Mg\n`;
    if (biomassResults.totals.carbonPerHa) {
        summary += `- Average Carbon Density: ${biomassResults.totals.carbonPerHa.toFixed(2)} Mg/ha\n\n`;
    }

    summary += `**Carbon Stocks by Vegetation Type:**\n`;
    summary += `| Vegetation Type | Carbon (Mg) | Carbon (Mg/ha) |\n`;
    summary += `|---|---|---|\n`;
    biomassResults.summary.forEach(row => {
        const carbonPerHa = row['Carbono_Mg/ha'] ? row['Carbono_Mg/ha'].toFixed(2) : 'N/A';
        summary += `| ${row['Tipo de vegetación']} | ${row.Carbono_Mg_Total.toFixed(2)} | ${carbonPerHa} |\n`;
    });
    summary += '\n';

    return summary;
};


const App: React.FC = () => {
    const t = useTranslations();
    const { language } = useLanguage();
    
    // State for raw grid data
    const [speciesGridData, setSpeciesGridData] = useState<string[][]>([[]]);
    const [siteGridData, setSiteGridData] = useState<string[][]>([[]]);

    // State for analysis results
    const [cooccurrenceMatrix, setCooccurrenceMatrix] = useState<SiteCooccurrenceMatrix | null>(null);
    const [significantPairs, setSignificantPairs] = useState<SignificantPair[] | null>(null);
    const [allEnvironmentalAnalyses, setAllEnvironmentalAnalyses] = useState<AllEnvironmentalAnalyses | null>(null);
    const [nicheData, setNicheData] = useState<SiteNicheData | null>(null);
    const [ccaPlotData, setCcaPlotData] = useState<SiteCCAPlotData | null>(null);
    const [structuralAnalysis, setStructuralAnalysis] = useState<FullStructuralAnalysis | null>(null);
    const [ecologicalParameters, setEcologicalParameters] = useState<SiteEcologicalParameters | null>(null);
    const [rarefactionData, setRarefactionData] = useState<RarefactionData | null>(null);
    const [indValResults, setIndValResults] = useState<IndValResult | null>(null);
    const [biomassResults, setBiomassResults] = useState<BiomassAnalysisResults | null>(null);

    // State for interpretation text from Gemini
    const [methodologyText, setMethodologyText] = useState<string>('');
    const [interpretationText, setInterpretationText] = useState<string>('');
    
    // UI/App state
    const [isLoading, setIsLoading] = useState(false);
    const [isGeneratingInterpretation, setIsGeneratingInterpretation] = useState(false);
    const [isGeneratingMethodology, setIsGeneratingMethodology] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('cooccurrence');
    const [isBiomassAnalysisEnabled, setIsBiomassAnalysisEnabled] = useState(false);
    
    // State for fine-grained loading
    const [isCcaSiteLoading, setIsCcaSiteLoading] = useState<boolean>(false);
    const [isIndValLoading, setIsIndValLoading] = useState<boolean>(false);

    // State for UI controls
    const [coocSelectedSite, setCoocSelectedSite] = useState('General');
    const [ccaSelectedSite, setCcaSelectedSite] = useState('General');
    const [indValSelectedSite, setIndValSelectedSite] = useState('General');

    // State for biomass configuration
    const [biomassConfig, setBiomassConfig] = useState<{ selections: EquationSelection, plotInfo: PlotInfo, descriptions: Record<string, string> } | null>(null);
    const [isBiomassConfigValid, setIsBiomassConfigValid] = useState(false);

    // API Key states
    const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
    const [tempApiKey, setTempApiKey] = useState(getApiKey());
    const [isKeyConfigured, setIsKeyConfigured] = useState(hasApiKeyConfigured());
    
    // Reset analysis results when data changes
    const resetAnalysis = useCallback(() => {
        setCooccurrenceMatrix(null);
        setSignificantPairs(null);
        setAllEnvironmentalAnalyses(null);
        setNicheData(null);
        setCcaPlotData(null);
        setStructuralAnalysis(null);
        setEcologicalParameters(null);
        setRarefactionData(null);
        setIndValResults(null);
        setBiomassResults(null);
        setInterpretationText('');
        setMethodologyText('');
        setError(null);
        setActiveTab('cooccurrence');
        setBiomassConfig(null);
        setIsBiomassConfigValid(false);
        setIsBiomassAnalysisEnabled(false);
    }, []);

    // Load sample data
    const loadSampleData = useCallback(() => {
        setSpeciesGridData(sampleSpeciesData);
        setSiteGridData(sampleSiteData);
        resetAnalysis();
    }, [resetAnalysis]);

    const handleAnalyze = useCallback(async () => {
        setIsLoading(true);
        setError(null);

        if (speciesGridData.length <= 1) {
            setError(t.speciesDataError);
            setIsLoading(false);
            return;
        }

        try {
            const speciesData = parseData(speciesGridData, true) as SpeciesData[];
            const siteData = siteGridData.length > 1 ? parseSiteData(siteGridData) : {};
            const allSites = Array.from(new Set(speciesData.map(d => d['Tipo de vegetación']).filter(Boolean))).sort();

            const [
                coocMatrix, 
                siteNicheData,
                siteStructuralAnalysis,
                ecoParams,
                generalIndVal,
                biomassRes,
                rarefactionRes
            ] = await Promise.all([
                Promise.resolve(runCooccurrenceAnalysis(speciesData)),
                Promise.resolve(calculateSpeciesEnvironmentalNiche(speciesData, siteData)),
                Promise.resolve(runStructuralAnalysis(speciesData, isBiomassAnalysisEnabled && biomassConfig ? biomassConfig.plotInfo : null)),
                Promise.resolve(calculateEcologicalParameters(speciesData)),
                Promise.resolve(runIndValAnalysis(speciesData)),
                isBiomassAnalysisEnabled && biomassConfig ? Promise.resolve(runBiomassAnalysis(speciesData as ForestDataRow[], biomassConfig.selections, biomassConfig.plotInfo, speciesGridData[0])) : Promise.resolve(null),
                Promise.resolve(calculateRarefactionData(speciesData))
            ]);

            setCooccurrenceMatrix(coocMatrix);
            setNicheData(siteNicheData);
            setStructuralAnalysis(siteStructuralAnalysis);
            setEcologicalParameters(ecoParams);
            setIndValResults(generalIndVal);
            setBiomassResults(biomassRes);
            setRarefactionData(rarefactionRes);
            
            setCoocSelectedSite('General');
            setCcaSelectedSite('General');
            setIndValSelectedSite('General');

            const sigPairs = getSignificantPairs(coocMatrix['General']);
            setSignificantPairs(sigPairs);

            const envAnalyses = analyzeAllEnvironmentalFactors(sigPairs, speciesData, siteData);
            setAllEnvironmentalAnalyses(envAnalyses);

            setIsCcaSiteLoading(true);
            const [ccaResult] = await Promise.allSettled([
                generateCCAPlotData(speciesData, siteData)
            ]);
            
            if(ccaResult.status === 'fulfilled') {
                const correlationMatrix = calculateCorrelationMatrix(speciesData, siteData);
                const ellipses = calculateEllipsesFromClusteredPoints(ccaResult.value.species);
                const newCcaData: SiteCCAPlotData = {
                  General: {
                    isPlaceholder: false,
                    biplot: ccaResult.value,
                    correlationMatrix,
                    ellipses,
                    varianceExplained: ccaResult.value.varianceExplained,
                  }
                };
                allSites.forEach(site => { 
                    newCcaData[site] = { 
                        isPlaceholder: true,
                        biplot: { species: [], vectors: [] }, 
                        correlationMatrix: {},
                    }; 
                });
                setCcaPlotData(newCcaData);
            } else {
                 setError(`${t.ccaPlotError} ${ccaResult.reason?.message || t.unknownCcaError}`);
            }
             setIsCcaSiteLoading(false);

        } catch (e: any) {
            setError(`${t.analysisFailedError} ${e.message || t.unknownAnalysisError}`);
        } finally {
            setIsLoading(false);
        }
    }, [speciesGridData, siteGridData, biomassConfig, t, isBiomassAnalysisEnabled]);
    
    const handleCCASiteChange = useCallback(async (site: string) => {
        setCcaSelectedSite(site);
        if (!ccaPlotData || !ccaPlotData[site]?.isPlaceholder) {
           return;
        }
        
        setIsCcaSiteLoading(true);
        setError(null);
        try {
            const speciesData = parseData(speciesGridData, true) as SpeciesData[];
            const allSiteData = parseSiteData(siteGridData);
            
            const siteSpeciesData = speciesData.filter(d => d['Tipo de vegetación'] === site);
            const sitePlots = new Set(siteSpeciesData.map(d => `${d['Tipo de vegetación']}-${d.Parcela}`));
            const currentSiteData: SiteData = Object.entries(allSiteData)
                .filter(([key]) => sitePlots.has(key))
                .reduce((acc, [key, value]) => {
                    acc[key] = value;
                    return acc;
                }, {} as SiteData);

            if (siteSpeciesData.length < 2 || Object.keys(currentSiteData).length < 2) {
                setCcaPlotData(prev => prev ? { ...prev, [site]: { isPlaceholder: false, biplot: { species: [], vectors: [] }, correlationMatrix: {} } } : null);
                setIsCcaSiteLoading(false);
                return;
            }

            const biplot = await generateCCAPlotData(siteSpeciesData, currentSiteData);
            const correlationMatrix = calculateCorrelationMatrix(siteSpeciesData, currentSiteData);
            const ellipses = calculateEllipsesFromClusteredPoints(biplot.species);

            setCcaPlotData(prev => {
                if (!prev) return null;
                return {
                    ...prev,
                    [site]: {
                        isPlaceholder: false,
                        biplot: biplot,
                        correlationMatrix,
                        ellipses,
                        varianceExplained: biplot.varianceExplained,
                    }
                };
            });
        } catch (e: any) {
             setError(`${t.ccaPlotError} ${e.message || t.unknownCcaError}`);
        } finally {
            setIsCcaSiteLoading(false);
        }
    }, [ccaPlotData, speciesGridData, siteGridData, t]);
    
    const handleIndValSiteChange = useCallback(async (site: string) => {
        setIndValSelectedSite(site);
        setIsIndValLoading(true);
        setError(null);
        try {
            const speciesData = parseData(speciesGridData, true) as SpeciesData[];
            const result = runIndValAnalysis(speciesData, site === 'General' ? undefined : site);
            setIndValResults(result);
        } catch (e: any) {
             setError(`${t.analysisFailedError} ${e.message || t.unknownAnalysisError}`);
        } finally {
            setIsIndValLoading(false);
        }
    }, [speciesGridData, t]);

    const handleGenerateInterpretation = useCallback(async () => {
        setIsGeneratingInterpretation(true);
        setError(null);
        if (!cooccurrenceMatrix) {
            setError(t.noCooccurrenceError);
            setIsGeneratingInterpretation(false);
            return;
        }

        try {
            const matrixString = formatMatrixForPrompt(cooccurrenceMatrix['General']);
            const analysesString = formatEnvironmentalAnalysisForPrompt(allEnvironmentalAnalyses);
            const nicheString = formatNicheAnalysisForPrompt(nicheData ? nicheData['General'] : null);
            const ccaString = formatCCAPlotDataForPrompt(ccaPlotData ? ccaPlotData['General'] : null);
            const ecoParamsString = formatEcoParamsForPrompt(ecologicalParameters);
            const indValString = formatIndValForPrompt(indValResults);
            const rarefactionString = formatRarefactionForPrompt(rarefactionData);
            const biomassString = formatBiomassForPrompt(biomassResults);

            const descriptions = biomassConfig?.descriptions ?? {};
            let descriptionsString = '';
            if (Object.keys(descriptions).filter(k => typeof descriptions[k] === 'string' && (descriptions[k] as string).trim()).length > 0) {
                 descriptionsString = Object.entries(descriptions)
                    .filter(([, desc]) => typeof desc === 'string' && desc.trim())
                    .map(([site, desc]) => `- **${site}:** ${desc}`)
                    .join('\n');
            } else {
                 descriptionsString = language === 'es'
                    ? "No se proporcionaron caracterizaciones detalladas para los sitios de muestreo."
                    : "No detailed characterizations were provided for the study sites.";
            }

            const prompt = t.finalInterpretationPromptTemplate
                .replace('{matrixString}', matrixString)
                .replace('{analysesString}', analysesString)
                .replace('{nicheString}', nicheString)
                .replace('{ccaString}', ccaString)
                .replace('{ecoParamsString}', ecoParamsString)
                .replace('{indValString}', indValString)
                .replace('{rarefactionString}', rarefactionString)
                .replace('{biomassString}', biomassString)
                .replace('{vegetationDescriptions}', descriptionsString);

            const result = await generateFinalInterpretation(prompt);
            setInterpretationText(result);

        } catch (e: any) {
            setError(`${t.interpretationError} ${e.message || t.unknownInterpretationError}`);
        } finally {
            setIsGeneratingInterpretation(false);
        }
    }, [cooccurrenceMatrix, allEnvironmentalAnalyses, nicheData, ccaPlotData, ecologicalParameters, indValResults, rarefactionData, biomassResults, t, biomassConfig, language]);
    
    const handleGenerateMethodology = useCallback(async () => {
        setIsGeneratingMethodology(true);
        setError(null);
        try {
            const descriptions = biomassConfig?.descriptions ?? {};
            let descriptionsString = '';
            if (Object.keys(descriptions).filter(k => typeof descriptions[k] === 'string' && (descriptions[k] as string).trim()).length > 0) {
                 descriptionsString = Object.entries(descriptions)
                    .filter(([, desc]) => typeof desc === 'string' && desc.trim())
                    .map(([site, desc]) => `**${site}:** ${desc}`)
                    .join('\n\n');
            } else {
                 descriptionsString = language === 'es' 
                    ? "No se proporcionaron caracterizaciones detalladas para los sitios de muestreo." 
                    : "No detailed characterizations were provided for the study sites.";
            }
            
            const prompt = t.methodologyPrompt.replace('{vegetationDescriptions}', descriptionsString);
            const result = await generateMethodology(prompt);
            setMethodologyText(result);
        } catch (e: any) {
            setError(`${t.methodologyError} ${e.message || t.unknownMethodologyError}`);
        } finally {
            setIsGeneratingMethodology(false);
        }
    }, [t, biomassConfig, language]);
    
    const [isGeneratingMethodologyDocx, setIsGeneratingMethodologyDocx] = useState(false);
    const handleExportMethodologyDocx = useCallback(async () => {
        setIsGeneratingMethodologyDocx(true);
        try {
            await generateMethodologyDocx(methodologyText, t);
        } catch(e: any) {
            setError(`${t.docxGenerationError} ${e.message}`);
        } finally {
            setIsGeneratingMethodologyDocx(false);
        }
    }, [methodologyText, t]);
    
    const [isGeneratingInterpretationDocx, setIsGeneratingInterpretationDocx] = useState(false);
    const handleExportInterpretationDocx = useCallback(async () => {
        setIsGeneratingInterpretationDocx(true);
        try {
            await generateInterpretationDocx(interpretationText, t);
        } catch(e: any) {
            setError(`${t.docxGenerationError} ${e.message}`);
        } finally {
            setIsGeneratingInterpretationDocx(false);
        }
    }, [interpretationText, t]);

    const vegetationTypes = useMemo(() => {
        if(speciesGridData.length <= 1) return [];
        const headers = speciesGridData[0];
        const siteIndex = headers.findIndex(h => h.toLowerCase() === 'tipo de vegetación');
        if (siteIndex === -1) return [];
        return Array.from(new Set(speciesGridData.slice(1).map(row => row[siteIndex]).filter(Boolean))).sort();
    }, [speciesGridData]);


    const tabs = useMemo(() => [
        { id: 'cooccurrence', label: t.cooccurrenceTab, icon: LeafIcon },
        { id: 'structure', label: t.structureTab, icon: TreeIcon },
        { id: 'ecoParams', label: t.ecoParamsTab, icon: PieChartIcon },
        { id: 'rarefaction', label: t.rarefactionTab, icon: LineChartIcon },
        { id: 'indval', label: t.indValTab, icon: TagIcon },
        { id: 'niche', label: t.nicheTab, icon: ChartBarIcon },
        { id: 'cca', label: t.ccaTab, icon: ScatterChartIcon },
        { id: 'biomass', label: t.biomassTab, icon: CalculatorIcon },
    ], [t]);


    return (
        <div className="min-h-screen bg-gray-100 p-4 sm:p-6 lg:p-8">
            <div className="max-w-7xl mx-auto">
                <header className="bg-primary text-white p-6 rounded-xl shadow-lg mb-8">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                            <h1 className="text-3xl font-bold">{t.appTitle}</h1>
                            <p className="text-secondary-light mt-1">{t.appSubtitle}</p>
                        </div>
                        <div className="flex items-center space-x-3 self-stretch sm:self-auto justify-between sm:justify-end">
                            <button
                                onClick={() => {
                                    setTempApiKey(getApiKey());
                                    setIsApiKeyModalOpen(true);
                                }}
                                className={`flex items-center space-x-1.5 py-1.5 px-3 rounded-lg text-sm font-semibold border transition-all cursor-pointer ${
                                    isKeyConfigured
                                    ? 'bg-emerald-600/20 border-emerald-500/30 text-emerald-300 hover:bg-emerald-600/30'
                                    : 'bg-amber-600/20 border-amber-500/30 text-amber-300 hover:bg-amber-600/30 animate-pulse'
                                }`}
                            >
                                <span className={`block w-2 h-2 rounded-full ${isKeyConfigured ? 'bg-emerald-400' : 'bg-amber-400'}`} />
                                <span>Gemini Key</span>
                            </button>
                            <LanguageSwitcher />
                        </div>
                    </div>
                </header>

                <main>
                    {!isKeyConfigured && (
                        <div className="bg-amber-50 border-l-4 border-amber-500 text-amber-900 p-4 rounded-xl shadow-xs mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <div>
                                <p className="font-bold text-sm mb-1 flex items-center">
                                    <span className="mr-2">🔑</span>
                                    {language === 'es' ? 'Clave de API de Gemini Requerida' : 'Gemini API Key Required'}
                                </p>
                                <p className="text-xs text-amber-800 leading-relaxed md:max-w-3xl">
                                    {language === 'es' 
                                        ? 'Para usar las funciones de Inteligencia Artificial (Análisis CCA, generar interpretaciones históricas, metodología y rarefacción), configure una clave de API de Gemini personal y gratuita. Sus datos nunca saldrán de su navegador.' 
                                        : 'To use the Artificial Intelligence features (CCA analysis, generating historical interpretations, methodology, and rarefaction), please configure a personal and free Gemini API key. Your data never leaves your browser.'}
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setTempApiKey(getApiKey());
                                    setIsApiKeyModalOpen(true);
                                }}
                                className="shrink-0 bg-amber-600 hover:bg-amber-700 text-white font-bold py-1.5 px-4 rounded-lg shadow-xs text-xs transition-colors cursor-pointer"
                            >
                                {language === 'es' ? 'Configurar Clave API' : 'Configure API Key'}
                            </button>
                        </div>
                    )}
                    <div className="bg-white p-6 rounded-xl shadow-md mb-8">
                        <h2 className="text-2xl font-bold text-primary mb-3">{t.dataInputSectionTitle}</h2>
                        <p className="text-gray-600 mb-4">{t.dataInputDescription}</p>
                        <div className="flex items-center space-x-4 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-200">
                             <p className="text-sm text-blue-800 font-medium">{t.sampleDataPrompt}</p>
                            <button onClick={loadSampleData} className="bg-secondary hover:bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-colors duration-200 text-sm">
                               {t.loadSampleSpecies} & {t.loadSampleSite}
                            </button>
                        </div>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            <DataInput title={t.speciesDataTitle} onGridDataChange={setSpeciesGridData} gridData={speciesGridData} onReset={resetAnalysis} templateHeaders={['Tipo de vegetación', 'Parcela', 'Código de árbol', 'Latitud', 'Longitud', 'Altitud', 'Precisión', 'N.Com_campo', 'N.Com_identificado', 'Nombre científico (Completo)', 'N_Científico (Abreviado)', 'Género', 'Familia', 'Densidad (g/cm3)', 'DAP (cm)', 'Altura (m)']} />
                            <DataInput title={t.siteFeaturesTitle} onGridDataChange={setSiteGridData} gridData={siteGridData} onReset={resetAnalysis} templateHeaders={['Tipo de vegetación', 'Parcela', 'pH', 'Temperatura (°C)', 'Fósforo (P ppm)', 'Nitrógeno Total (%)', 'Carbono Orgánico (%)']} />
                        </div>
                        
                        <div className="mt-8 pt-6 border-t border-gray-200">
                            <div className="flex items-center">
                                <input
                                    type="checkbox"
                                    id="enable-biomass-analysis"
                                    checked={isBiomassAnalysisEnabled}
                                    onChange={(e) => {
                                        setIsBiomassAnalysisEnabled(e.target.checked);
                                        if (!e.target.checked) {
                                            setBiomassConfig(null);
                                            setIsBiomassConfigValid(false);
                                        }
                                    }}
                                    className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                                />
                                <label htmlFor="enable-biomass-analysis" className="ml-3 block text-sm font-medium text-gray-700">
                                    {t.includeBiomassAnalysis}
                                </label>
                            </div>
                        </div>

                        {isBiomassAnalysisEnabled && vegetationTypes.length > 0 && (
                            <BiomassConfigPanel 
                                vegetationTypes={vegetationTypes} 
                                onConfigChange={setBiomassConfig}
                                onValidityChange={setIsBiomassConfigValid}
                            />
                        )}

                        <div className="mt-6 text-center">
                            <button onClick={handleAnalyze} disabled={isLoading || (isBiomassAnalysisEnabled && vegetationTypes.length > 0 && (!isBiomassConfigValid))} className="bg-accent hover:bg-orange-500 text-white font-bold py-3 px-8 rounded-lg shadow-md transition-transform transform hover:scale-105 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:scale-100">
                                {isLoading ? t.analyzingButton : t.analyzeButton}
                            </button>
                        </div>
                    </div>

                    {isLoading && <div className="text-center p-4"><div className="loader inline-block w-8 h-8 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div></div>}
                    
                    {error && (
                        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md mb-6" role="alert">
                            <p className="font-bold">{t.errorTitle}</p>
                            <p className="whitespace-pre-wrap">{error}</p>
                        </div>
                    )}

                    {cooccurrenceMatrix && !isLoading && (
                        <div className="bg-white p-6 rounded-xl shadow-md">
                             <h2 className="text-2xl font-bold text-primary mb-2">{t.resultsSectionTitle}</h2>
                             <p className="text-sm text-gray-500 mb-6" dangerouslySetInnerHTML={{ __html: t.reproducibilityNote }} />


                            <div className="mb-6 border-b border-gray-200">
                                <nav className="-mb-px flex space-x-4 overflow-x-auto" aria-label="Tabs">
                                    {tabs.map(tab => {
                                        if (tab.id === 'biomass' && !biomassResults) {
                                            return null;
                                        }
                                        return (
                                            <button
                                                key={tab.id}
                                                onClick={() => setActiveTab(tab.id)}
                                                className={`${
                                                    activeTab === tab.id
                                                    ? 'border-primary text-primary'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                                } group inline-flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-colors duration-200 whitespace-nowrap`}
                                                aria-current={activeTab === tab.id ? 'page' : undefined}
                                            >
                                            <tab.icon className={`-ml-0.5 mr-2 h-5 w-5 ${activeTab === tab.id ? 'text-primary' : 'text-gray-400 group-hover:text-gray-500'}`} aria-hidden="true" />
                                                <span>{tab.label}</span>
                                            </button>
                                        );
                                    })}
                                </nav>
                            </div>

                            <div className="mt-4">
                                {activeTab === 'cooccurrence' && cooccurrenceMatrix && (
                                    <CooccurrenceTable matrix={cooccurrenceMatrix} sites={vegetationTypes} selectedSite={coocSelectedSite} onSiteChange={setCoocSelectedSite} />
                                )}
                                {activeTab === 'biomass' && biomassResults && (
                                    <BiomassCalculatorTab results={biomassResults} />
                                )}
                                {activeTab === 'structure' && structuralAnalysis && (
                                    <StructuralAnalysisTable analysisData={structuralAnalysis} />
                                )}
                                {activeTab === 'ecoParams' && ecologicalParameters && (
                                    <EcologicalParametersTable data={ecologicalParameters} />
                                )}
                                {activeTab === 'rarefaction' && (
                                    rarefactionData ? (
                                        <RarefactionCurvePlot data={rarefactionData} />
                                    ) : <p className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm">{t.noData}</p>
                                )}
                                {activeTab === 'indval' && (
                                    <IndValTable analysisData={indValResults!} sites={vegetationTypes} selectedSite={indValSelectedSite} onSiteChange={handleIndValSiteChange} isLoading={isIndValLoading} />
                                )}
                                {activeTab === 'niche' && nicheData && (
                                    <SpeciesNicheTable nicheData={nicheData} />
                                )}
                                {activeTab === 'cca' && (
                                    <CCAPlot data={ccaPlotData} sites={vegetationTypes} selectedSite={ccaSelectedSite} onSiteChange={handleCCASiteChange} isLoading={isCcaSiteLoading}/>
                                )}
                            </div>
                            
                            {cooccurrenceMatrix && (
                                <div className="mt-10 pt-6 border-t-2 border-dashed border-gray-200">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <button onClick={handleGenerateMethodology} disabled={isGeneratingMethodology} className="flex items-center bg-secondary hover:bg-primary text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 disabled:bg-gray-400">
                                                    <DocumentTextIcon className="h-5 w-5 mr-2"/>
                                                    {isGeneratingMethodology ? t.writingButton : t.methodologyButton}
                                                </button>
                                                {methodologyText && (
                                                    <button onClick={handleExportMethodologyDocx} disabled={isGeneratingMethodologyDocx} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 disabled:bg-gray-400">
                                                        <DocxIcon className="h-5 w-5 mr-2" />
                                                        {isGeneratingMethodologyDocx ? t.generatingMethodologyDocx : t.exportMethodologyDocx}
                                                    </button>
                                                )}
                                            </div>
                                            {isGeneratingMethodology && <div className="flex items-center p-2"><div className="loader w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div><p className="text-gray-600">{t.loadingMethodology}</p></div>}
                                            {methodologyText && (
                                                <div className="p-4 border rounded-lg bg-gray-50 max-h-[600px] overflow-y-auto">
                                                    <h3 className="text-xl font-bold text-primary mb-4">{t.methodologySectionTitle}</h3>
                                                    <InterpretationDisplay text={methodologyText} />
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center">
                                                <button onClick={handleGenerateInterpretation} disabled={isGeneratingInterpretation} className="flex items-center bg-accent hover:bg-orange-500 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 disabled:bg-gray-400">
                                                    <ScienceIcon className="h-5 w-5 mr-2"/>
                                                    {isGeneratingInterpretation ? t.generatingInterpretationButton : t.interpretationButton}
                                                </button>
                                                {interpretationText && (
                                                     <button onClick={handleExportInterpretationDocx} disabled={isGeneratingInterpretationDocx} className="flex items-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg shadow-md transition-all duration-200 disabled:bg-gray-400">
                                                        <DocxIcon className="h-5 w-5 mr-2" />
                                                        {isGeneratingInterpretationDocx ? t.generatingInterpretationDocx : t.exportInterpretationDocx}
                                                    </button>
                                                )}
                                            </div>
                                            {isGeneratingInterpretation && <div className="flex items-center p-2"><div className="loader w-5 h-5 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-2"></div><p className="text-gray-600">{t.loadingInterpretation}</p></div>}
                                            {interpretationText && (
                                                <div className="p-4 border rounded-lg bg-gray-50 max-h-[600px] overflow-y-auto">
                                                    <h3 className="text-xl font-bold text-primary mb-4">{t.interpretationSectionTitle}</h3>
                                                    <InterpretationDisplay text={interpretationText} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </main>
                
                <footer className="text-center text-gray-500 text-sm mt-8">
                    <p>{t.footerText}</p>
                </footer>

                {/* Gemini API Key Configuration Modal */}
                {isApiKeyModalOpen && (
                    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs">
                        <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 relative border border-gray-100">
                            <button 
                                onClick={() => setIsApiKeyModalOpen(false)} 
                                className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 focus:outline-hidden cursor-pointer"
                            >
                                ✕
                            </button>
                            <h3 className="text-xl font-bold text-primary mb-3 flex items-center">
                                <ScienceIcon className="h-6 w-6 text-secondary mr-2" />
                                {t.apiKeyConfigTitle}
                            </h3>
                            <p className="text-sm text-gray-600 mb-4 leading-relaxed">
                                {t.apiKeyConfigDesc}
                            </p>
                            
                            <div className="mb-4">
                                <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
                                    {t.apiKeyInputLabel}
                                </label>
                                <input
                                    type="password"
                                    placeholder={t.apiKeyInputPlaceholder}
                                    value={tempApiKey}
                                    onChange={(e) => setTempApiKey(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg shadow-xs focus:outline-hidden focus:ring-2 focus:ring-primary focus:border-transparent font-mono text-sm"
                                />
                            </div>

                            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mb-4">
                                <button
                                    onClick={() => {
                                        const trimmed = tempApiKey.trim();
                                        if (trimmed && trimmed !== 'PLACEHOLDER_API_KEY') {
                                            localStorage.setItem('GEMINI_API_KEY', trimmed);
                                            setIsKeyConfigured(true);
                                        } else {
                                            localStorage.removeItem('GEMINI_API_KEY');
                                            setIsKeyConfigured(false);
                                        }
                                        setIsApiKeyModalOpen(false);
                                    }}
                                    className="w-full bg-primary hover:bg-opacity-90 text-white font-bold py-2 @lg:py-2.5 px-4 rounded-lg shadow-sm transition-all text-sm cursor-pointer"
                                >
                                    {t.apiKeySaveBtn}
                                </button>
                                {isKeyConfigured && (
                                    <button
                                        onClick={() => {
                                            localStorage.removeItem('GEMINI_API_KEY');
                                            setTempApiKey('');
                                            setIsKeyConfigured(false);
                                            setIsApiKeyModalOpen(false);
                                        }}
                                        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded-lg shadow-sm transition-all text-sm cursor-pointer"
                                    >
                                        {t.apiKeyDeleteBtn}
                                    </button>
                                )}
                            </div>

                            <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-900">
                                <p className="font-semibold mb-1 flex items-center">
                                    <span>💡 {t.apiKeyHowToGet}</span>
                                </p>
                                <p className="mb-2 text-blue-800 leading-relaxed">
                                    {t.apiKeyHowToGetDesc}
                                </p>
                                <a
                                    href="https://aistudio.google.com/"
                                    target="_blank"
                                    rel="noreferrer noopener"
                                    className="text-primary font-bold underline hover:text-opacity-80 flex items-center"
                                >
                                    {t.apiKeyAIStudioLinkText} ↗
                                </a>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default App;
