/**
 * Bibliografía fija de EcoAnalytics.
 *
 * Todas las citas que aparecen en la metodología y en la interpretación salen de esta lista. La IA
 * no puede añadir referencias: solo puede usar las claves de aquí (ver services/aiReport.ts).
 *
 * Estado de verificación de cada referencia:
 * - 'pdf':      metadatos y contenido usado (ecuación, coeficientes) comprobados contra el PDF original.
 * - 'crossref': título, año, revista y primer autor comprobados contra Crossref por
 *               scripts/check-references.mjs (se ejecuta en GitHub Actions en cada push).
 * - 'manual':   obra sin DOI (libro, manual, programa); revisar a mano antes de publicar.
 */

export type VerificationStatus = 'pdf' | 'crossref' | 'manual';

export interface Reference {
  key: string;
  /** Apellidos e iniciales, en el orden del original. */
  authors: string[];
  year: number;
  title: string;
  /** Revista, editorial o institución. */
  container: string;
  volume?: string;
  issue?: string;
  pages?: string;
  doi?: string;
  url?: string;
  verification: VerificationStatus;
  /** Qué se comprobó y contra qué fuente. */
  verificationNote?: string;
}

export const REFERENCES: Record<string, Reference> = {
  // --- Ordenación ---
  terBraak1986: {
    key: 'terBraak1986', authors: ['ter Braak, C. J. F.'], year: 1986,
    title: 'Canonical correspondence analysis: a new eigenvector technique for multivariate direct gradient analysis',
    container: 'Ecology', volume: '67', issue: '5', pages: '1167–1179', doi: '10.2307/1938672', verification: 'crossref',
  },
  legendre2011: {
    key: 'legendre2011', authors: ['Legendre, P.', 'Oksanen, J.', 'ter Braak, C. J. F.'], year: 2011,
    title: 'Testing the significance of canonical axes in redundancy analysis',
    container: 'Methods in Ecology and Evolution', volume: '2', issue: '3', pages: '269–277',
    doi: '10.1111/j.2041-210X.2010.00078.x', verification: 'crossref',
  },
  vegan: {
    key: 'vegan', authors: ['Oksanen, J.', 'Simpson, G. L.', 'Blanchet, F. G.', 'et al.'], year: 2022,
    title: 'vegan: Community Ecology Package. R package version 2.6-4',
    container: 'CRAN', url: 'https://CRAN.R-project.org/package=vegan', verification: 'manual',
    verificationNote: 'Versión usada para generar los valores de referencia (validation/fixtures/versions.json).',
  },
  // --- Diversidad ---
  shannon1948: {
    key: 'shannon1948', authors: ['Shannon, C. E.'], year: 1948,
    title: 'A mathematical theory of communication',
    container: 'Bell System Technical Journal', volume: '27', issue: '3', pages: '379–423',
    doi: '10.1002/j.1538-7305.1948.tb01338.x', verification: 'crossref',
  },
  simpson1949: {
    key: 'simpson1949', authors: ['Simpson, E. H.'], year: 1949, title: 'Measurement of diversity',
    container: 'Nature', volume: '163', pages: '688', doi: '10.1038/163688a0', verification: 'crossref',
  },
  pielou1966: {
    key: 'pielou1966', authors: ['Pielou, E. C.'], year: 1966,
    title: 'The measurement of diversity in different types of biological collections',
    container: 'Journal of Theoretical Biology', volume: '13', pages: '131–144',
    doi: '10.1016/0022-5193(66)90013-0', verification: 'crossref',
  },
  margalef1958: {
    key: 'margalef1958', authors: ['Margalef, R.'], year: 1958, title: 'Information theory in ecology',
    container: 'General Systems', volume: '3', pages: '36–71', verification: 'manual',
  },
  magurran2004: {
    key: 'magurran2004', authors: ['Magurran, A. E.'], year: 2004, title: 'Measuring biological diversity',
    container: 'Blackwell Publishing, Oxford', verification: 'pdf',
    verificationNote: 'Índice de Margalef D = (S − 1)/ln N (pp. 76–77) y equidad de Pielou J′ = H′/ln S (p. 108) comprobados en el PDF (caps. 2–4). Editorial y año: revisar en la portada.',
  },
  hill1973: {
    key: 'hill1973', authors: ['Hill, M. O.'], year: 1973,
    title: 'Diversity and evenness: a unifying notation and its consequences',
    container: 'Ecology', volume: '54', issue: '2', pages: '427–432', doi: '10.2307/1934352', verification: 'crossref',
  },
  hurlbert1971: {
    key: 'hurlbert1971', authors: ['Hurlbert, S. H.'], year: 1971,
    title: 'The nonconcept of species diversity: a critique and alternative parameters',
    container: 'Ecology', volume: '52', issue: '4', pages: '577–586', doi: '10.2307/1934145', verification: 'crossref',
  },
  chao1984: {
    key: 'chao1984', authors: ['Chao, A.'], year: 1984,
    title: 'Nonparametric estimation of the number of classes in a population',
    container: 'Scandinavian Journal of Statistics', volume: '11', issue: '4', pages: '265–270', verification: 'manual',
  },
  chao1987: {
    key: 'chao1987', authors: ['Chao, A.'], year: 1987,
    title: 'Estimating the population size for capture-recapture data with unequal catchability',
    container: 'Biometrics', volume: '43', issue: '4', pages: '783–791', doi: '10.2307/2531532', verification: 'crossref',
  },
  chaoJost2012: {
    key: 'chaoJost2012', authors: ['Chao, A.', 'Jost, L.'], year: 2012,
    title: 'Coverage-based rarefaction and extrapolation: standardizing samples by completeness rather than size',
    container: 'Ecology', volume: '93', issue: '12', pages: '2533–2547', doi: '10.1890/11-1952.1', verification: 'crossref',
  },
  chaoWangJost2013: {
    key: 'chaoWangJost2013', authors: ['Chao, A.', 'Wang, Y. T.', 'Jost, L.'], year: 2013,
    title: 'Entropy and the species accumulation curve: a novel entropy estimator via discovery rates of new species',
    container: 'Methods in Ecology and Evolution', volume: '4', issue: '11', pages: '1091–1100',
    doi: '10.1111/2041-210X.12108', verification: 'crossref',
  },
  chao2014: {
    key: 'chao2014',
    authors: ['Chao, A.', 'Gotelli, N. J.', 'Hsieh, T. C.', 'Sander, E. L.', 'Ma, K. H.', 'Colwell, R. K.', 'Ellison, A. M.'],
    year: 2014,
    title: 'Rarefaction and extrapolation with Hill numbers: a framework for sampling and estimation in species diversity studies',
    container: 'Ecological Monographs', volume: '84', issue: '1', pages: '45–67', doi: '10.1890/13-0133.1', verification: 'crossref',
  },
  hsieh2016: {
    key: 'hsieh2016', authors: ['Hsieh, T. C.', 'Ma, K. H.', 'Chao, A.'], year: 2016,
    title: 'iNEXT: an R package for rarefaction and extrapolation of species diversity (Hill numbers)',
    container: 'Methods in Ecology and Evolution', volume: '7', issue: '12', pages: '1451–1456',
    doi: '10.1111/2041-210X.12613', verification: 'crossref',
  },
  // --- Especies indicadoras ---
  dufrene1997: {
    key: 'dufrene1997', authors: ['Dufrêne, M.', 'Legendre, P.'], year: 1997,
    title: 'Species assemblages and indicator species: the need for a flexible asymmetrical approach',
    container: 'Ecological Monographs', volume: '67', issue: '3', pages: '345–366',
    doi: '10.1890/0012-9615(1997)067[0345:SAAIST]2.0.CO;2', verification: 'crossref',
  },
  deCaceres2009: {
    key: 'deCaceres2009', authors: ['De Cáceres, M.', 'Legendre, P.'], year: 2009,
    title: 'Associations between species and groups of sites: indices and statistical inference',
    container: 'Ecology', volume: '90', issue: '12', pages: '3566–3574', doi: '10.1890/08-1823.1', verification: 'crossref',
  },
  deCaceres2010: {
    key: 'deCaceres2010', authors: ['De Cáceres, M.', 'Legendre, P.', 'Moretti, M.'], year: 2010,
    title: 'Improving indicator species analysis by combining groups of sites',
    container: 'Oikos', volume: '119', issue: '10', pages: '1674–1684',
    doi: '10.1111/j.1600-0706.2010.18334.x', verification: 'crossref',
  },
  // --- Co-ocurrencia ---
  veech2013: {
    key: 'veech2013', authors: ['Veech, J. A.'], year: 2013,
    title: 'A probabilistic model for analysing species co-occurrence',
    container: 'Global Ecology and Biogeography', volume: '22', issue: '2', pages: '252–260',
    doi: '10.1111/j.1466-8238.2012.00789.x', verification: 'crossref',
  },
  griffith2016: {
    key: 'griffith2016', authors: ['Griffith, D. M.', 'Veech, J. A.', 'Marsh, C. J.'], year: 2016,
    title: 'cooccur: probabilistic species co-occurrence analysis in R',
    container: 'Journal of Statistical Software', volume: '69', issue: '2', pages: '1–17',
    doi: '10.18637/jss.v069.c02', verification: 'crossref',
  },
  benjamini1995: {
    key: 'benjamini1995', authors: ['Benjamini, Y.', 'Hochberg, Y.'], year: 1995,
    title: 'Controlling the false discovery rate: a practical and powerful approach to multiple testing',
    container: 'Journal of the Royal Statistical Society: Series B (Methodological)', volume: '57', issue: '1',
    pages: '289–300', doi: '10.1111/j.2517-6161.1995.tb02031.x', verification: 'crossref',
  },
  // --- Estructura ---
  curtis1951: {
    key: 'curtis1951', authors: ['Curtis, J. T.', 'McIntosh, R. P.'], year: 1951,
    title: 'An upland forest continuum in the prairie-forest border region of Wisconsin',
    container: 'Ecology', volume: '32', issue: '3', pages: '476–496', doi: '10.2307/1931725', verification: 'crossref',
  },
  kruskal1952: {
    key: 'kruskal1952', authors: ['Kruskal, W. H.', 'Wallis, W. A.'], year: 1952,
    title: 'Use of ranks in one-criterion variance analysis',
    container: 'Journal of the American Statistical Association', volume: '47', issue: '260', pages: '583–621',
    doi: '10.1080/01621459.1952.10483441', verification: 'crossref',
  },
  dunn1964: {
    key: 'dunn1964', authors: ['Dunn, O. J.'], year: 1964, title: 'Multiple comparisons using rank sums',
    container: 'Technometrics', volume: '6', issue: '3', pages: '241–252', doi: '10.1080/00401706.1964.10490181',
    verification: 'crossref',
  },
  legendre2012: {
    key: 'legendre2012', authors: ['Legendre, P.', 'Legendre, L.'], year: 2012, title: 'Numerical ecology (3rd English ed.)',
    container: 'Elsevier, Amsterdam', verification: 'manual',
    verificationNote: 'Pruebas de permutación (cap. 1). Libro sin DOI en Crossref; revisar los datos antes de publicar.',
  },
  // --- Biomasa y carbono ---
  fischer2026: {
    key: 'fischer2026', authors: ['Fischer, F. J.', 'Chave, J.', 'Zanne, A.', 'et al.'], year: 2026,
    title: 'Beyond species means – the intraspecific contribution to global wood density variation',
    container: 'New Phytologist', volume: '249', issue: '6', pages: '2630–2651', doi: '10.1111/nph.70860',
    verification: 'pdf',
    verificationNote: 'Comprobado en el PDF: GWDD v.2 (109 626 registros), filtros de los análisis (sección II.1) y DE intraespecífica de 0.068 g cm⁻³ (resumen).',
  },
  gwdd2025: {
    key: 'gwdd2025', authors: ['Fischer, F. J.', 'Chave, J.', 'Zanne, A.', 'et al.'], year: 2025,
    title: 'Global Wood Density Database v.2 (GWDD v.2) [conjunto de datos]',
    container: 'Zenodo', doi: '10.5281/zenodo.16919509', verification: 'manual',
    verificationNote: 'DOI tomado de Fischer et al. (2026). Es un DOI de DataCite (Zenodo), no de Crossref: confirme año y versión (v2.2) en Zenodo.',
  },
  rejouMechain2017: {
    key: 'rejouMechain2017', authors: ['Réjou-Méchain, M.', 'Tanguy, A.', 'Piponiot, C.', 'Chave, J.', 'Hérault, B.'], year: 2017,
    title: 'BIOMASS: an R package for estimating above-ground biomass and its uncertainty in tropical forests',
    container: 'Methods in Ecology and Evolution', volume: '8', issue: '9', pages: '1163–1167',
    doi: '10.1111/2041-210X.12753', verification: 'crossref',
  },
  chave2005: {
    key: 'chave2005',
    authors: ['Chave, J.', 'Andalo, C.', 'Brown, S.', 'Cairns, M. A.', 'Chambers, J. Q.', 'Eamus, D.', 'Fölster, H.', 'Fromard, F.', 'Higuchi, N.', 'Kira, T.', 'Lescure, J.-P.', 'Nelson, B. W.', 'Ogawa, H.', 'Puig, H.', 'Riéra, B.', 'Yamakura, T.'],
    year: 2005,
    title: 'Tree allometry and improved estimation of carbon stocks and balance in tropical forests',
    container: 'Oecologia', volume: '145', issue: '1', pages: '87–99', doi: '10.1007/s00442-005-0100-x',
    verification: 'crossref',
    verificationNote: 'Coeficientes de las seis ecuaciones comprobados contra la Tabla 2 de Hairiah et al. (2011).',
  },
  chave2014: {
    key: 'chave2014',
    authors: ['Chave, J.', 'Réjou-Méchain, M.', 'Búrquez, A.', 'Chidumayo, E.', 'Colgan, M. S.', 'Delitti, W. B. C.', 'Duque, A.', 'Eid, T.', 'Fearnside, P. M.', 'Goodman, R. C.', 'Henry, M.', 'Martínez-Yrízar, A.', 'Mugasha, W. A.', 'Muller-Landau, H. C.', 'Mencuccini, M.', 'Nelson, B. W.', 'Ngomanda, A.', 'Nogueira, E. M.', 'Ortiz-Malavassi, E.', 'Pélissier, R.', 'Ploton, P.', 'Ryan, C. M.', 'Saldarriaga, J. G.', 'Vieilledent, G.'],
    year: 2014,
    title: 'Improved allometric models to estimate the aboveground biomass of tropical trees',
    container: 'Global Change Biology', volume: '20', issue: '10', pages: '3177–3190', doi: '10.1111/gcb.12629',
    verification: 'pdf', verificationNote: 'Ecuación 4 (AGB = 0.0673 × (ρD²H)^0.976; D en cm, H en m, ρ en g cm⁻³) comprobada en el PDF.',
  },
  segura2006: {
    key: 'segura2006', authors: ['Segura, M.', 'Kanninen, M.', 'Suárez, D.'], year: 2006,
    title: 'Allometric models for estimating aboveground biomass of shade trees and coffee bushes grown together',
    container: 'Agroforestry Systems', volume: '68', issue: '2', pages: '143–150', doi: '10.1007/s10457-006-9005-x',
    verification: 'pdf',
    verificationNote: 'Tabla 3, ecuaciones 3 y 4 (kg planta⁻¹; d15 en cm, h en m; d15 0.3–7.4 cm, h 0.3–3.3 m) comprobadas en el PDF. Volumen y páginas confirmados en Crossref.',
  },
  hairiah2011: {
    key: 'hairiah2011',
    authors: ['Hairiah, K.', 'Dewi, S.', 'Agus, F.', 'Velarde, S.', 'Ekadinata, A.', 'Rahayu, S.', 'van Noordwijk, M.'],
    year: 2011, title: 'Measuring carbon stocks across land use systems: a manual',
    container: 'World Agroforestry Centre (ICRAF), SEA Regional Office, Bogor, Indonesia', pages: '154 pp.',
    verification: 'pdf',
    verificationNote: 'Tabla 2 (Chave et al. 2005) y Tabla 3 (cacao: Yuliasmara 2008; banano: Arifin 2001) comprobadas en el PDF.',
  },
  ipcc2006: {
    key: 'ipcc2006', authors: ['IPCC'], year: 2006,
    title: '2006 IPCC Guidelines for National Greenhouse Gas Inventories, Volume 4: Agriculture, Forestry and Other Land Use. Chapter 4: Forest Land',
    container: 'IGES, Hayama, Japan', url: 'https://www.ipcc-nggip.iges.or.jp/public/2006gl/vol4.html',
    verification: 'manual', verificationNote: 'Fracción de carbono 0.47 (Tabla 4.3). Comprobar la tabla antes de publicar.',
  },
  andrade2008: {
    key: 'andrade2008', authors: ['Andrade, H. J.', 'Segura, M.', 'Somarriba, E.', 'Villalobos, M.'], year: 2008,
    title: 'Valoración biofísica y financiera de la fijación de carbono por uso del suelo en fincas cacaoteras indígenas de Talamanca, Costa Rica',
    container: 'Agroforestería en las Américas', volume: '46', pages: '45–50', verification: 'manual',
    verificationNote: 'Datos bibliográficos y ecuación de cacao (d30) pendientes de comprobar en el PDF original.',
  },
  schroth2002: {
    key: 'schroth2002',
    authors: ['Schroth, G.', "D'Angelo, S. A.", 'Teixeira, W. G.', 'Haag, D.', 'Lieberei, R.'], year: 2002,
    title: 'Conversion of secondary forest into agroforestry and monoculture plantations in Amazonia: consequences for biomass, litter and soil carbon stocks after 7 years',
    container: 'Forest Ecology and Management', volume: '163', issue: '1–3', pages: '131–150',
    doi: '10.1016/S0378-1127(01)00537-0', verification: 'crossref',
    verificationNote: 'Solo metadatos. La ecuación de cítricos usada por la aplicación NO se ha comprobado en el original.',
  },
};

/** Referencias que respaldan cada método implementado. */
export const METHOD_REFERENCES = {
  cooccurrence: ['veech2013', 'griffith2016', 'benjamini1995', 'legendre2012'],
  cca: ['terBraak1986', 'legendre2011', 'vegan'],
  diversity: ['shannon1948', 'simpson1949', 'pielou1966', 'magurran2004', 'hill1973', 'chao1984', 'chao1987', 'chaoJost2012', 'chaoWangJost2013'],
  rarefaction: ['hurlbert1971', 'chao2014', 'hsieh2016', 'chaoJost2012'],
  indval: ['dufrene1997', 'deCaceres2009', 'deCaceres2010', 'benjamini1995'],
  structure: ['curtis1951'],
  biomass: ['chave2005', 'chave2014', 'segura2006', 'andrade2008', 'hairiah2011', 'ipcc2006', 'fischer2026', 'gwdd2025', 'rejouMechain2017', 'kruskal1952', 'dunn1964'],
} as const;

export type MethodId = keyof typeof METHOD_REFERENCES;

const surname = (author: string) => author.split(',')[0].trim();

/** Autores tal como aparecen en una cita: Autor, Autor y Autor, o Autor et al. */
const citeAuthors = (key: string, lang: 'es' | 'en'): string => {
  const r = REFERENCES[key];
  if (!r) throw new Error(`Referencia desconocida: ${key}`);
  const names = r.authors.filter(a => a !== 'et al.');
  if (names.length === 1 && r.authors.length === 1) return surname(names[0]);
  if (names.length === 2 && r.authors.length === 2) return `${surname(names[0])} ${lang === 'es' ? 'y' : '&'} ${surname(names[1])}`;
  return `${surname(names[0])} et al.`;
};

/** Cita en el texto: Autor, año. */
export const citeInText = (key: string, lang: 'es' | 'en' = 'es'): string =>
  `${citeAuthors(key, lang)}, ${REFERENCES[key].year}`;

/** Cita narrativa: Autor (año). */
export const citeNarrative = (key: string, lang: 'es' | 'en' = 'es'): string =>
  `${citeAuthors(key, lang).replace(' & ', ' and ')} (${REFERENCES[key].year})`;

/** Varias claves en un solo paréntesis, en orden cronológico; un mismo autor se agrupa (Chao, 1984, 1987). */
export const cite = (keys: readonly string[], lang: 'es' | 'en' = 'es'): string => {
  const groups: { authors: string; years: number[] }[] = [];
  [...keys].sort((a, b) => REFERENCES[a].year - REFERENCES[b].year).forEach(k => {
    const authors = citeAuthors(k, lang);
    const g = groups.find(x => x.authors === authors);
    if (g) g.years.push(REFERENCES[k].year);
    else groups.push({ authors, years: [REFERENCES[k].year] });
  });
  return `(${groups.map(g => `${g.authors}, ${g.years.join(', ')}`).join('; ')})`;
};

/** Referencia completa en estilo APA 7. */
export const formatReference = (key: string): string => {
  const r = REFERENCES[key];
  const authors = r.authors.length > 20
    ? [...r.authors.slice(0, 19), '…', r.authors[r.authors.length - 1]].join(', ')
    : r.authors.length === 1
      ? r.authors[0]
      : `${r.authors.slice(0, -1).join(', ')}${r.authors[r.authors.length - 1] === 'et al.' ? ', ' : ', & '}${r.authors[r.authors.length - 1]}`;
  let s = `${authors} (${r.year}). ${r.title}. ${r.container}`;
  if (r.volume) s += `, ${r.volume}`;
  if (r.issue) s += `(${r.issue})`;
  if (r.pages) s += `, ${r.pages}`;
  s += '.';
  if (r.doi) s += ` https://doi.org/${r.doi}`;
  else if (r.url) s += ` ${r.url}`;
  return s;
};

/** Lista de referencias ordenada alfabéticamente por primer autor y año. */
export const formatBibliography = (keys: Iterable<string>): string[] =>
  Array.from(new Set(keys))
    .sort((a, b) => {
      const ra = REFERENCES[a], rb = REFERENCES[b];
      return ra.authors.join(' ').localeCompare(rb.authors.join(' '), 'es') || ra.year - rb.year;
    })
    .map(formatReference);
