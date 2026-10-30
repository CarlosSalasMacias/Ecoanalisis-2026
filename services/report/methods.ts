/**
 * Sección de Metodología generada sin IA, a partir de los parámetros reales del análisis.
 *
 * Todo lo que se afirma aquí (permutaciones, semillas, umbrales, ecuaciones, fracción de carbono)
 * sale de ANALYSIS_SETTINGS o de los resultados calculados, y cada cita sale de la bibliografía
 * fija (services/references.ts). Así el texto describe exactamente lo que hizo la aplicación.
 */
import { ANALYSIS_SETTINGS } from '../analysisService';
import { EQUATIONS } from '../biomassEquations';
import { cite, citeNarrative, formatBibliography } from '../references';
import type { BiomassAnalysisResults, FullStructuralAnalysis, SingleCCAPlotData } from '../../types';

export interface MethodsContext {
  lang: 'es' | 'en';
  nPlots: number;
  nVegetationTypes: number;
  nSpecies: number;
  nIndividuals: number;
  hasEnvironmentalData: boolean;
  /** Para describir el IVI con y sin cultivo y el diámetro usado en el área basal. */
  structure?: FullStructuralAnalysis | null;
  cca: SingleCCAPlotData | null;
  biomass: BiomassAnalysisResults | null;
  /** Descripción de los sitios aportada por el usuario. */
  siteDescriptions: Record<string, string>;
}

export interface GeneratedText {
  markdown: string;
  /** Claves de las referencias citadas, para la lista final. */
  citedKeys: string[];
}

const fmt = (x: number, lang: 'es' | 'en', digits = 2) =>
  x.toLocaleString(lang === 'es' ? 'es-ES' : 'en-US', { maximumFractionDigits: digits });

export function buildMethodology(ctx: MethodsContext): GeneratedText {
  const { lang } = ctx;
  const es = lang === 'es';
  const used = new Set<string>();
  const c = (...keys: string[]) => { keys.forEach(k => used.add(k)); return cite(keys, lang); };
  const n = (key: string) => { used.add(key); return citeNarrative(key, lang); };
  const S = ANALYSIS_SETTINGS;
  const out: string[] = [];

  // Contexto y datos
  out.push(es ? '### Área de estudio y datos' : '### Study area and data');
  const desc = Object.entries(ctx.siteDescriptions).filter(([, d]) => d && d.trim());
  if (desc.length) out.push(desc.map(([site, d]) => `**${site}.** ${d.trim()}`).join('\n\n'));
  out.push(es
    ? `Se analizaron ${ctx.nIndividuals} individuos de ${ctx.nSpecies} especies registrados en ${ctx.nPlots} parcelas distribuidas en ${ctx.nVegetationTypes} tipos de vegetación. Todos los análisis se realizaron con EcoAnalytics; los procedimientos aleatorios (permutaciones y remuestreo) usan un generador pseudoaleatorio con semilla fija (${S.seed}), por lo que los resultados son reproducibles. Los cálculos se validaron numéricamente contra los paquetes de R vegan, iNEXT, indicspecies y labdsv ${c('vegan', 'hsieh2016', 'deCaceres2009')}.`
    : `We analysed ${ctx.nIndividuals} individuals of ${ctx.nSpecies} species recorded in ${ctx.nPlots} plots across ${ctx.nVegetationTypes} vegetation types. All analyses were run in EcoAnalytics; random procedures (permutations and resampling) use a pseudo-random generator with a fixed seed (${S.seed}), so results are reproducible. Calculations were validated numerically against the R packages vegan, iNEXT, indicspecies and labdsv ${c('vegan', 'hsieh2016', 'deCaceres2009')}.`);

  // Estructura
  out.push(es ? '### Estructura de la vegetación' : '### Vegetation structure');
  out.push(es
    ? `Para cada especie se calcularon la abundancia, la frecuencia (número de parcelas con presencia) y la dominancia (área basal, a partir del DAP) absolutas y relativas. El índice de valor de importancia (IVI) es la suma de los tres valores relativos (0–300) y se presenta también dividido entre tres (0–100) ${c('curtis1951')}.`
    : `For each species we computed absolute and relative abundance, frequency (number of plots where present) and dominance (basal area from DBH). The importance value index (IVI) is the sum of the three relative values (0–300) and is also reported divided by three (0–100) ${c('curtis1951')}.`);
  const st0 = ctx.structure;
  if (st0 && st0.cropSpecies.length) {
    const d30 = st0.basalAreaSources['D30'] ?? 0, d15 = st0.basalAreaSources['D15'] ?? 0;
    const crops = st0.cropSpecies.map(x => `*${x}*`).join(', ');
    const diam = d30 + d15 > 0
      ? (es ? ` En los individuos sin DAP, el área basal se calculó con el diámetro a 30 cm (${d30} individuos) o a 15 cm del suelo (${d15}), por lo que su dominancia no es directamente comparable con la de los árboles medidos a 1,3 m.`
            : ` For individuals without DBH, basal area was computed from the diameter at 30 cm (${d30} individuals) or 15 cm above ground (${d15}), so their dominance is not directly comparable with that of trees measured at 1.3 m.`)
      : '';
    out.push(es
      ? `El IVI se calculó dos veces: con todas las especies, para describir la estructura productiva de las parcelas, y sin las especies de cultivo (${crops}), para evaluar los árboles acompañantes.${diam}`
      : `The IVI was computed twice: with all species, to describe the productive structure of the plots, and without the crop species (${crops}), to assess the companion trees.${diam}`);
  }

  // Diversidad
  out.push(es ? '### Diversidad alfa y completitud del muestreo' : '### Alpha diversity and sampling completeness');
  out.push(es
    ? `Por tipo de vegetación se calcularon la riqueza observada (S), el índice de Shannon con logaritmo natural (H′) ${c('shannon1948')}, la dominancia de Simpson (λ = Σpᵢ²) ${c('simpson1949')}, la equidad de Pielou (J′ = H′/ln S) ${c('pielou1966', 'magurran2004')} y el índice de Margalef (D = (S − 1)/ln N) ${c('magurran2004')}. La riqueza total se estimó con Chao1 corregido por sesgo, con su error estándar e intervalo de confianza del 95 % de tipo log-normal ${c('chao1984', 'chao1987')}. La completitud del muestreo se expresó como cobertura de la muestra según el estimador de ${n('chaoJost2012')}.`
    : `For each vegetation type we computed observed richness (S), the Shannon index with natural logarithm (H′) ${c('shannon1948')}, Simpson's dominance (λ = Σpᵢ²) ${c('simpson1949')}, Pielou's evenness (J′ = H′/ln S) ${c('pielou1966', 'magurran2004')} and Margalef's index (D = (S − 1)/ln N) ${c('magurran2004')}. Total richness was estimated with bias-corrected Chao1, with its standard error and log-normal 95% confidence interval ${c('chao1984', 'chao1987')}. Sampling completeness was expressed as sample coverage using the estimator of ${n('chaoJost2012')}.`);
  out.push(es
    ? `Las curvas de rarefacción y extrapolación de los números de Hill de orden q = 0, 1 y 2 ${c('hill1973')} se construyeron por tipo de vegetación hasta el doble del tamaño de la muestra, siguiendo a ${n('chao2014')} con las fórmulas del paquete iNEXT ${c('hsieh2016')}. Los intervalos de confianza del ${S.rarefaction.conf * 100} % se obtuvieron con ${S.rarefaction.nBoot} réplicas bootstrap.`
    : `Rarefaction and extrapolation curves of Hill numbers of order q = 0, 1 and 2 ${c('hill1973')} were built for each vegetation type up to twice the sample size, following ${n('chao2014')} with the formulas of the iNEXT package ${c('hsieh2016')}. ${S.rarefaction.conf * 100}% confidence intervals were obtained from ${S.rarefaction.nBoot} bootstrap replicates.`);

  // Especies indicadoras
  out.push(es ? '### Especies indicadoras' : '### Indicator species');
  out.push(es
    ? `Se usó el valor indicador IndVal ${c('dufrene1997')} en su versión con grupos de tamaño igualado (IndVal.g), asignando cada especie al grupo con el valor máximo ${c('deCaceres2009', 'deCaceres2010')}. La significación se evaluó con ${S.indval.nPermutations} permutaciones de las parcelas entre grupos y los valores de p se corrigieron por comparaciones múltiples con el método de ${n('benjamini1995')}.`
    : `We used the indicator value IndVal ${c('dufrene1997')} in its group-equalized form (IndVal.g), assigning each species to the group with the highest value ${c('deCaceres2009', 'deCaceres2010')}. Significance was assessed with ${S.indval.nPermutations} permutations of plots among groups, and p-values were corrected for multiple comparisons with the method of ${n('benjamini1995')}.`);

  // Co-ocurrencia
  out.push(es ? '### Co-ocurrencia de especies' : '### Species co-occurrence');
  out.push(es
    ? `Las asociaciones entre pares de especies se evaluaron con el modelo probabilístico de ${n('veech2013')}, que calcula de forma exacta (distribución hipergeométrica) la probabilidad de observar un número de parcelas compartidas menor o mayor que el obtenido. Como en el paquete cooccur ${c('griffith2016')}, no se probaron los pares con una co-ocurrencia esperada menor que 1. Los valores de p se corrigieron con el método de ${n('benjamini1995')} y se consideraron significativos con p ajustado < ${fmt(S.alpha, lang)}.`
    : `Pairwise associations were tested with the probabilistic model of ${n('veech2013')}, which computes exactly (hypergeometric distribution) the probability of observing fewer or more shared plots than observed. As in the cooccur package ${c('griffith2016')}, pairs with an expected co-occurrence below 1 were not tested. p-values were corrected with the method of ${n('benjamini1995')} and considered significant at adjusted p < ${S.alpha}.`);
  if (ctx.hasEnvironmentalData) {
    out.push(es
      ? `Para cada par significativo y cada variable ambiental se comparó la media en las parcelas donde ambas especies coinciden con la media en las parcelas donde solo está una de ellas, mediante una prueba de permutación bilateral de la diferencia de medias ${c('legendre2012')}: exacta (todas las reparticiones posibles) cuando su número no supera ${S.environment.maxExact.toLocaleString('es-ES')} y, si no, con ${S.environment.nPermutations} permutaciones aleatorias. No se probaron las comparaciones con menos de 2 parcelas en algún grupo. Los valores de p se corrigieron por ${n('benjamini1995')} sobre el conjunto de pruebas (pares × variables). El nicho ambiental de cada especie se describió como la media aritmética de cada variable en las parcelas donde la especie está presente.`
      : `For each significant pair and environmental variable, the mean in plots where both species occur was compared with the mean in plots where only one of them occurs, using a two-sided permutation test of the difference in means ${c('legendre2012')}: exact (all possible allocations) when their number did not exceed ${S.environment.maxExact.toLocaleString('en-US')}, otherwise with ${S.environment.nPermutations} random permutations. Comparisons with fewer than 2 plots in a group were not tested. p-values were corrected with the method of ${n('benjamini1995')} across all tests (pairs × variables). The environmental niche of each species was described as the arithmetic mean of each variable over the plots where the species is present.`);
  }

  // CCA
  const st = ctx.cca?.stats;
  if (st) {
    out.push(es ? '### Relación especies–ambiente' : '### Species–environment relationships');
    const vars = Object.keys(st.vif).join(', ');
    out.push(es
      ? `La relación entre la composición de especies (abundancias por parcela) y las variables ambientales (${vars}) se analizó con un análisis de correspondencia canónica (CCA) ${c('terBraak1986')}, con el mismo algoritmo y escalado de puntuaciones (escalado 2) que la función cca del paquete vegan ${c('vegan')}. La significación del modelo completo se evaluó con una prueba de permutación del pseudo-F (${st.nPermutations} permutaciones) ${c('legendre2011')}, y la colinealidad entre variables con factores de inflación de la varianza (VIF). En el biplot, las elipses son elipses de dispersión ponderadas de las parcelas de cada tipo de vegetación (como ordiellipse con kind = "sd"), escaladas a un nivel de confianza del ${S.cca.ellipseConf * 100} %.`
      : `The relationship between species composition (abundances per plot) and the environmental variables (${vars}) was analysed with canonical correspondence analysis (CCA) ${c('terBraak1986')}, using the same algorithm and score scaling (scaling 2) as the cca function of the vegan package ${c('vegan')}. Significance of the full model was assessed with a pseudo-F permutation test (${st.nPermutations} permutations) ${c('legendre2011')}, and collinearity among variables with variance inflation factors (VIF). In the biplot, ellipses are weighted dispersion ellipses of the plots of each vegetation type (as ordiellipse with kind = "sd"), scaled to a ${S.cca.ellipseConf * 100}% confidence level.`);
    if (st.excludedPlots.length || st.excludedVariables.length) {
      out.push(es
        ? `Se excluyeron del CCA ${st.excludedPlots.length} parcelas sin datos ambientales completos y ${st.excludedVariables.length} variables no numéricas o constantes${st.excludedVariables.length ? ` (${st.excludedVariables.join(', ')})` : ''}.`
        : `${st.excludedPlots.length} plots without complete environmental data and ${st.excludedVariables.length} non-numeric or constant variables${st.excludedVariables.length ? ` (${st.excludedVariables.join(', ')})` : ''} were excluded from the CCA.`);
    }
  }

  // Biomasa
  const bio = ctx.biomass;
  if (bio && bio.equationsUsed?.length) {
    out.push(es ? '### Biomasa aérea y carbono' : '### Aboveground biomass and carbon');
    const lines = bio.equationsUsed.map(u => {
      const eq = EQUATIONS[u.equation];
      const ref = eq.reference ? ` ${c(eq.reference)}` : '';
      const primary = eq.primarySource ? (es ? `, ecuación original de ${eq.primarySource}` : `, original equation by ${eq.primarySource}`) : '';
      const warn = eq.verified ? '' : (es ? ' **[coeficientes sin verificar en la fuente original]**' : ' **[coefficients not verified against the original source]**');
      return `- ${eq.label.replace(/ — SIN VERIFICAR$/, '')}: ${eq.formula}${primary}${ref}; ${u.trees} ${es ? 'individuos' : 'individuals'}.${warn}`;
    });
    out.push(es
      ? 'La biomasa aérea (AGB, kg por individuo) se estimó con las siguientes ecuaciones alométricas (D, diámetro en cm; H, altura total en m; ρ, densidad básica de la madera en g cm⁻³):'
      : 'Aboveground biomass (AGB, kg per individual) was estimated with the following allometric equations (D, diameter in cm; H, total height in m; ρ, wood density in g cm⁻³):');
    out.push(lines.join('\n'));
    const outside = bio.equationsUsed.reduce((a, u) => a + u.outsideRange, 0);
    const notes: string[] = [];
    if (outside > 0) notes.push(es
      ? `${outside} individuos quedaron fuera del rango de calibración publicado de su ecuación.`
      : `${outside} individuals fell outside the published calibration range of their equation.`);
    if (bio.withoutEquation > 0) notes.push(es
      ? `${bio.withoutEquation} individuos sin ecuación asignada no se incluyeron.`
      : `${bio.withoutEquation} individuals without an assigned equation were not included.`);
    const cfRef = Math.abs(bio.carbonFraction - 0.47) < 1e-9 ? ` ${c('ipcc2006')}` : '';
    out.push((es
      ? `El carbono se calculó multiplicando la biomasa seca por una fracción de carbono de ${fmt(bio.carbonFraction, lang, 3)}${cfRef}. La densidad de carbono de cada tipo de vegetación (Mg C ha⁻¹) es el carbono total dividido por el área muestreada (número de parcelas × área de parcela), y la del conjunto del estudio, el carbono total dividido por el área total muestreada.`
      : `Carbon was obtained by multiplying dry biomass by a carbon fraction of ${fmt(bio.carbonFraction, lang, 3)}${cfRef}. Carbon density of each vegetation type (Mg C ha⁻¹) is total carbon divided by sampled area (number of plots × plot area), and the study-wide value is total carbon divided by total sampled area.`)
      + (notes.length ? ' ' + notes.join(' ') : ''));

    const ds = bio.densitySources ?? {};
    if (Object.keys(ds).length) {
      const parts = Object.entries(ds).map(([k, v]) => `${k}: ${v}`).join(', ');
      const region = bio.woodDensityRegion
        ? (bio.woodDensityRegion === 'global' ? (es ? 'medias mundiales' : 'worldwide means') : (es ? `medias de la región «${bio.woodDensityRegion}» y, en su defecto, mundiales` : `means for the region "${bio.woodDensityRegion}" and, failing that, worldwide means`))
        : '';
      out.push(bio.woodDensityRegion
        ? (es
          ? `La densidad básica de la madera se tomó de los datos de campo cuando existían; en los demás casos, de la Global Wood Density Database v.2.2 ${c('fischer2026', 'gwdd2025')} (${region}), usando la media de la especie y, si no había datos, la del género o la familia (medias de las medias de sus especies), como en BIOMASS ${c('rejouMechain2017')}. Siguiendo a ${n('fischer2026')}, se excluyeron los registros identificados solo a género, las muestras con corteza o de raíz y los registros de experimentos o plantaciones. Origen de la densidad (individuos): ${parts}.`
          : `Basic wood density was taken from field data when available; otherwise from the Global Wood Density Database v.2.2 ${c('fischer2026', 'gwdd2025')} (${region}), using the species mean and, failing that, the genus or family mean (mean of species means), as in BIOMASS ${c('rejouMechain2017')}. Following ${n('fischer2026')}, genus-level records, bark or root samples and records from experiments or plantations were excluded. Source of density (individuals): ${parts}.`)
        : (es ? `Origen de la densidad de la madera (individuos): ${parts}.` : `Source of wood density (individuals): ${parts}.`));
    }

    const u = bio.uncertainty;
    if (u?.byType.length) {
      const modelErr = u.equationsWithModelError.map(e => EQUATIONS[e]?.rse?.source).filter(Boolean).join('; ');
      const noErr = u.equationsWithoutModelError.map(e => EQUATIONS[e]?.label.replace(/ — SIN VERIFICAR$/, '')).join('; ');
      out.push(es
        ? `El carbono aéreo se expresó por parcela (Mg C ha⁻¹); las parcelas declaradas sin individuos se incluyeron con valor 0. Para cada tipo de vegetación se informan la media entre parcelas, su error estándar y el intervalo de confianza del 95 % basado en la t de Student (incertidumbre de muestreo; límite inferior truncado en 0). La incertidumbre total se estimó con ${u.nSimulations} simulaciones de Monte Carlo (semilla ${u.seed}), como en BIOMASS ${c('rejouMechain2017')}: en cada simulación se sorteó la densidad de cada individuo de una normal truncada a 0,08–1,39 g cm⁻³ con la desviación estándar de su nivel taxonómico (0,068 g cm⁻³ dentro de especie; ${n('fischer2026')}), se aplicó el error residual de la ecuación alométrica${modelErr ? ` (${modelErr})` : ''} y se remuestrearon con reposición las parcelas de cada tipo; el intervalo es el de los percentiles 2,5 y 97,5.${noErr ? ` Para ${noErr} la fuente verificada no publica el error residual, por lo que esa componente no se incluyó y la incertidumbre total está subestimada.` : ''}`
        : `Aboveground carbon was expressed per plot (Mg C ha⁻¹); declared plots without individuals were included with value 0. For each vegetation type we report the mean across plots, its standard error and the Student-t 95% confidence interval (sampling uncertainty; lower limit truncated at 0). Total uncertainty was estimated with ${u.nSimulations} Monte Carlo simulations (seed ${u.seed}), as in BIOMASS ${c('rejouMechain2017')}: in each simulation the wood density of each individual was drawn from a normal distribution truncated to 0.08–1.39 g cm⁻³ with the standard deviation of its taxonomic level (0.068 g cm⁻³ within species; ${n('fischer2026')}), the residual error of the allometric equation was applied${modelErr ? ` (${modelErr})` : ''}, and the plots of each type were resampled with replacement; the interval is given by the 2.5 and 97.5 percentiles.${noErr ? ` For ${noErr} the verified source does not report the residual error, so that component was not included and total uncertainty is underestimated.` : ''}`);
      if (u.comparison) {
        out.push(es
          ? `El carbono por parcela se comparó entre tipos de vegetación con la prueba de ${n('kruskal1952')} y comparaciones múltiples de ${n('dunn1964')}, con valores de p ajustados por ${n('benjamini1995')}.`
          : `Carbon per plot was compared among vegetation types with the ${n('kruskal1952')} test and ${n('dunn1964')} multiple comparisons, with p-values adjusted by the method of ${n('benjamini1995')}.`);
      }
    }
  }

  const citedKeys = Array.from(used);
  out.push(es ? '## Referencias' : '## References');
  out.push(formatBibliography(citedKeys).join('\n\n'));
  return { markdown: out.join('\n\n'), citedKeys };
}
