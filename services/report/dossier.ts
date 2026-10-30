/**
 * Resumen textual de los resultados calculados que se entrega a la IA. Es la única fuente de datos
 * que la IA puede usar; el auditor (aiReport.ts) comprueba que las cifras del texto salgan de aquí.
 */
import { ANALYSIS_SETTINGS } from '../analysisService';
import type { SiteCooccurrenceMatrix, CooccurrenceCell, AllEnvironmentalAnalyses, SingleNicheData, SingleCCAPlotData, SiteEcologicalParameters, IndValResult, RarefactionData, BiomassAnalysisResults } from '../../types';

export const formatMatrixForPrompt = (matrix: SiteCooccurrenceMatrix['General']): string => {
  const positivePairs: string[] = [];
  const negativePairs: string[] = [];
  const species = Object.keys(matrix).sort();

  species.forEach(spA => {
    species.forEach(spB => {
      if (spA >= spB) return; 
      
      const cell = matrix[spA][spB] as CooccurrenceCell;
      if ('effect' in cell) {
        const p_value = cell.obs > cell.exp ? cell.p_gt : cell.p_lt;
        const pText = `p = ${p_value.toPrecision(2)}, FDR-adjusted p = ${cell.p_adj !== null ? cell.p_adj.toPrecision(2) : 'n/a'}`;
        if (cell.effect === 'positive') {
          positivePairs.push(`- *${spA}* & *${spB}*: co-occur more than expected (Obs: ${cell.obs}, Exp: ${cell.exp.toFixed(1)}, ${pText})`);
        } else if (cell.effect === 'negative') {
          negativePairs.push(`- *${spA}* & *${spB}*: co-occur less than expected (Obs: ${cell.obs}, Exp: ${cell.exp.toFixed(1)}, ${pText})`);
        }
      }
    });
  });

  let summary = 'Co-occurrence Statistical Analysis Summary (exact hypergeometric probabilistic model; pairs with expected co-occurrence < 1 not tested; significance at FDR-adjusted p < 0.05, Benjamini–Hochberg):\n\n';
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

export const formatEnvironmentalAnalysisForPrompt = (allAnalyses: AllEnvironmentalAnalyses | null): string => {
    if (!allAnalyses || Object.keys(allAnalyses).length === 0) {
        return "No environmental data was provided or it was not applicable for the significant pairs.";
    }
    let analysesString = 'Environmental conditions of significant pairs (two-sided permutation test of the difference in means; BH correction over all pair × variable tests):\n\n';
    const sortedPairKeys = Object.keys(allAnalyses).sort();
    for (const pairKey of sortedPairKeys) {
        const { pair, analysis } = allAnalyses[pairKey];
        analysesString += `**Pair: *${pair.speciesA}* & *${pair.speciesB}* (${pair.effect.toUpperCase()} Association)**\n`;
        analysis.forEach(res => {
            const test = res.pValue === null ? 'not tested (fewer than 2 plots in a group)' : `permutation p = ${res.pValue.toPrecision(2)}, BH-adjusted p = ${res.pAdj?.toPrecision(2)}`;
            analysesString += `- *${res.factor}*: mean where both occur = ${res.cooccurrenceMean} (n = ${res.nCooccurrence}); mean where only one occurs = ${res.controlMean} (n = ${res.nControl}); ${test}\n`;
        });
        analysesString += '\n';
    }
    return analysesString;
};

export const formatNicheAnalysisForPrompt = (nicheData: SingleNicheData | null): string => {
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

export const formatCCAPlotDataForPrompt = (ccaPlotData: SingleCCAPlotData | null): string => {
    if (!ccaPlotData || !ccaPlotData.stats) {
        return `CCA analysis was not performed. ${(ccaPlotData?.notes || []).join(' ')}`;
    }
    const st = ccaPlotData.stats;
    let summary = 'Canonical Correspondence Analysis (CCA; computed numerically, equivalent to vegan::cca):\n\n';
    summary += `- Plots: ${st.nSites}; species: ${st.nSpecies}; environmental variables: ${Object.keys(st.vif).join(', ')}.\n`;
    summary += `- Total inertia: ${st.totalInertia.toFixed(4)}; constrained inertia: ${st.constrainedInertia.toFixed(4)} (${st.constrainedPercent.toFixed(1)}% of total).\n`;
    summary += `- CCA1 explains ${st.axisPercent[0]?.toFixed(1) ?? 0}% and CCA2 ${st.axisPercent[1]?.toFixed(1) ?? 0}% of total inertia (eigenvalues: ${st.eigenvalues.slice(0, 2).map(e => e.toFixed(4)).join(', ')}).\n`;
    summary += `- Permutation test of the whole model: pseudo-F = ${st.F.toFixed(3)}, df = ${st.df}, ${st.dfResidual}, p = ${st.pValue.toFixed(3)} (${st.nPermutations} permutations).\n`;
    summary += `- Variance inflation factors: ${Object.entries(st.vif).map(([k, v]) => `${k} = ${Number.isFinite(v) ? v.toFixed(2) : '∞'}`).join('; ')}.\n`;
    summary += '\n**Biplot scores of environmental variables (correlation with CCA1, CCA2):**\n';
    ccaPlotData.biplot.vectors.forEach(v => {
        summary += `- ${v.name}: ${v.x.toFixed(3)}, ${v.y.toFixed(3)}\n`;
    });
    const labeled = ccaPlotData.biplot.species.filter(s => !s.isBackground);
    summary += '\n**Scores (scaling 2) of the most abundant species (CCA1, CCA2):**\n';
    labeled.forEach(sp => {
        summary += `- *${sp.name}*: ${sp.x.toFixed(3)}, ${sp.y.toFixed(3)}\n`;
    });
    if (ccaPlotData.notes?.length) summary += `\nNotes: ${ccaPlotData.notes.join(' ')}\n`;
    return summary;
};

export const formatEcoParamsForPrompt = (ecoParams: SiteEcologicalParameters | null): string => {
    if (!ecoParams) return "No ecological parameter analysis was performed.";
    const sites = Object.keys(ecoParams).sort();
    if (sites.length === 0) return "No ecological parameter data available.";

    let table = `Summary of Ecological Parameters per Site:\n\n`;
    table += `| Site | Richness (S) | Individuals (N) | Shannon (H') | Simpson (D) | Pielou (J') | Sample Coverage (SC) | Margalef (d) | Chao-1 (95% CI) |\n`;
    table += `|---|---|---|---|---|---|---|---|---|\n`;

    sites.forEach(site => {
        const d = ecoParams[site];
        table += `| ${site} | ${d.speciesRichness} | ${d.individuals} | ${d.shannon.toFixed(3)} | ${d.simpsonDominance.toFixed(3)} | ${d.pielouEvenness.toFixed(3)} | ${d.sampleCoverage.toFixed(3)} | ${d.margalefRichness.toFixed(3)} | ${d.chao1.toFixed(2)} (${d.chao1Lower.toFixed(2)}–${d.chao1Upper.toFixed(2)}) |\n`;
    });

    return table;
};

export const formatIndValForPrompt = (indValData: IndValResult | null): string => {
    if (!indValData) return "No indicator species analysis was performed.";
    const species = Object.keys(indValData).sort();
    if (species.length === 0) return "No indicator species data available.";

    let summary = 'Indicator Species Analysis (IndVal.g; ${ANALYSIS_SETTINGS.indval.nPermutations} permutations) - Significant Indicators (p < 0.05):\n\n';
    let significantFound = false;
    
    species.forEach(sp => {
        const sites = Object.keys(indValData[sp]).sort();
        sites.forEach(site => {
            const { indval, pvalue, pAdj, isBest } = indValData[sp][site];
            if (isBest && pvalue !== null && pvalue < 0.05) {
                summary += `- ***${sp}*** is a significant indicator for site **${site}** (IndVal: ${indval.toFixed(1)}%, p: ${pvalue.toFixed(3)}, FDR-adjusted p: ${pAdj?.toFixed(3)})\n`;
                significantFound = true;
            }
        });
    });

    if (!significantFound) {
        return "No significant indicator species were found for any site group (p < 0.05).";
    }
    return summary;
};

export const formatRarefactionForPrompt = (rarefactionData: RarefactionData | null): string => {
    if (!rarefactionData) return "No rarefaction analysis was performed.";
    const sites = Object.keys(rarefactionData).sort();
    if (sites.length === 0) return "No rarefaction data available.";

    let summary = 'Rarefaction and Extrapolation of Hill numbers (iNEXT method; 95% bootstrap CI):\n\n';
    sites.forEach(site => {
        const data = rarefactionData[site];
        summary += `**Site: ${site}** (n = ${data.n} individuals, S = ${data.S} species)\n`;
        const obsCov = data.coverage.find(c => c.m === data.n);
        if (obsCov) summary += `- Sample coverage at n: ${(100 * obsCov.SC).toFixed(1)}%.\n`;
        (['0', '1', '2'] as const).forEach(q => {
            const curve = data.byOrder[q];
            const end = curve.extrapolated.curve[curve.extrapolated.curve.length - 1];
            const endIdx = curve.confidenceInterval.upper.length - 1;
            summary += `- q = ${q}: observed ${curve.observed.point.y.toFixed(2)}`;
            if (end) summary += `; extrapolated to ${end.x} individuals: ${end.y.toFixed(2)} (95% CI ${curve.confidenceInterval.lower[endIdx].y.toFixed(2)}–${curve.confidenceInterval.upper[endIdx].y.toFixed(2)})`;
            summary += '\n';
        });
        summary += '\n';
    });
    return summary;
};

export const formatBiomassForPrompt = (biomassResults: BiomassAnalysisResults | null): string => {
    if (!biomassResults) return "No biomass/carbon analysis was performed.";
    let summary = 'Biomass and Carbon Stock Analysis Summary:\n\n';

    summary += `**Overall Totals:**\n`;
    summary += `- Total Above-Ground Biomass (AGB): ${biomassResults.totals.agb.toFixed(2)} Mg\n`;
    summary += `- Total Stored Carbon: ${biomassResults.totals.carbon.toFixed(2)} Mg (carbon fraction ${biomassResults.carbonFraction})\n`;
    if (biomassResults.totals.carbonPerHa) {
        summary += `- Carbon Density of the sampled area (total carbon / total sampled area): ${biomassResults.totals.carbonPerHa.toFixed(2)} Mg/ha\n\n`;
    }

    summary += `**Carbon Stocks by Vegetation Type:**\n`;
    summary += `| Vegetation Type | Carbon (Mg) | Carbon (Mg/ha) |\n`;
    summary += `|---|---|---|\n`;
    biomassResults.summary.forEach(row => {
        const carbonPerHa = row['Carbono_Mg/ha'] ? row['Carbono_Mg/ha'].toFixed(2) : 'N/A';
        summary += `| ${row['Tipo de vegetación']} | ${row.Carbono_Mg_Total.toFixed(2)} | ${carbonPerHa} |\n`;
    });
    summary += '\n';
    const u = biomassResults.uncertainty;
    if (u?.byType.length) {
        const ci = (c: [number, number] | null) => (c ? `${c[0].toFixed(2)}–${c[1].toFixed(2)}` : 'n/a');
        summary += `**Aboveground carbon per plot (Mg C/ha): mean ± SE across plots; 95% CI from sampling (t) and total 95% CI from ${u.nSimulations} Monte Carlo simulations (allometric error, wood density, plot resampling):**\n`;
        u.byType.forEach(b => {
            summary += `- ${b.type}: ${b.mean.toFixed(2)} ± ${b.se.toFixed(2)} (n = ${b.nPlots} plots); sampling CI ${ci(b.ciSampling)}; total CI ${ci(b.ciTotal)}\n`;
        });
        summary += `- Whole study (area-weighted): ${u.overall.carbonPerHa.toFixed(2)}; total CI ${ci(u.overall.ciTotal)}\n`;
        if (u.comparison) {
            const k = u.comparison.kruskal;
            summary += `- Kruskal–Wallis among vegetation types: H = ${k.H.toFixed(2)}, df = ${k.df}, p = ${k.p.toPrecision(2)}\n`;
            u.comparison.dunn.forEach(d => { summary += `  - Dunn ${d.a} vs ${d.b}: z = ${d.z.toFixed(2)}, BH-adjusted p = ${d.pAdj.toPrecision(2)}\n`; });
        }
        if (u.equationsWithoutModelError.length) summary += `- Equations without published residual error (total CI underestimates uncertainty): ${u.equationsWithoutModelError.join(', ')}\n`;
        summary += '\n';
    }
    if (biomassResults.equationsUsed?.length) {
        summary += '**Allometric equations applied (individuals; outside calibration range; coefficients verified):**\n';
        biomassResults.equationsUsed.forEach(u => {
            summary += `- ${u.label}: ${u.trees}; ${u.outsideRange}; ${u.verified ? 'yes' : 'NO'}\n`;
        });
    }

    return summary;
};

export interface DossierInput {
    cooccurrence: SiteCooccurrenceMatrix | null;
    environmental: AllEnvironmentalAnalyses | null;
    niche: SingleNicheData | null;
    cca: SingleCCAPlotData | null;
    ecoParams: SiteEcologicalParameters | null;
    indval: IndValResult | null;
    rarefaction: RarefactionData | null;
    biomass: BiomassAnalysisResults | null;
    siteDescriptions: Record<string, string>;
}

/** Todos los resultados en un solo bloque de texto, en el orden de las secciones del informe. */
export const buildDossier = (d: DossierInput): string => {
    const desc = Object.entries(d.siteDescriptions).filter(([, v]) => v && v.trim());
    return [
        d.cooccurrence ? formatMatrixForPrompt(d.cooccurrence['General']) : 'No co-occurrence analysis was performed.',
        formatEnvironmentalAnalysisForPrompt(d.environmental),
        formatNicheAnalysisForPrompt(d.niche),
        formatCCAPlotDataForPrompt(d.cca),
        formatEcoParamsForPrompt(d.ecoParams),
        formatIndValForPrompt(d.indval),
        formatRarefactionForPrompt(d.rarefaction),
        formatBiomassForPrompt(d.biomass),
        desc.length ? 'Site descriptions provided by the authors:\n' + desc.map(([k, v]) => `- ${k}: ${v.trim()}`).join('\n') : 'No site descriptions were provided.',
    ].join('\n\n');
};
