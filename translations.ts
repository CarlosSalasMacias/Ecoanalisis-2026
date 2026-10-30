
import { useLanguage } from './LanguageContext';

const headerTranslations: Record<string, { es: string; en: string }> = {
    'Tipo de vegetación': { es: 'Tipo de vegetación', en: 'Vegetation Type' },
    'Parcela': { es: 'Parcela', en: 'Plot' },
    'Código de árbol': { es: 'Código de árbol', en: 'Tree Code' },
    'Latitud': { es: 'Latitud', en: 'Latitude' },
    'Longitud': { es: 'Longitud', en: 'Longitude' },
    'Altitud': { es: 'Altitud', en: 'Altitude' },
    'Precisión': { es: 'Precisión', en: 'Precision' },
    'N.Com_campo': { es: 'N.Com_campo', en: 'N.Com_field' },
    'N.Com_identificado': { es: 'N.Com_identificado', en: 'N.Com_identified' },
    'Nombre científico (Completo)': { es: 'Nombre científico (Completo)', en: 'Scientific Name (Full)' },
    'N_Científico (Abreviado)': { es: 'N_Científico (Abreviado)', en: 'Scientific_Name (Abbr.)' },
    'Género': { es: 'Género', en: 'Genus' },
    'Familia': { es: 'Familia', en: 'Family' },
    'Densidad (g/cm3)': { es: 'Densidad (g/cm³)', en: 'Density (g/cm³)' },
    'DAP (cm)': { es: 'DAP (cm)', en: 'DBH (cm)' },
    'Altura (m)': { es: 'Altura (m)', en: 'Height (m)' },
    'pH': { es: 'pH', en: 'pH' },
    'Temperatura (°C)': { es: 'Temperatura (°C)', en: 'Temperature (°C)' },
    'Fósforo (P ppm)': { es: 'Fósforo (P ppm)', en: 'Phosphorus (P ppm)' },
    'Nitrógeno Total (%)': { es: 'Nitrógeno Total (%)', en: 'Total Nitrogen (%)' },
};


const translations = {
  es: {
    // App.tsx
    appTitle: 'EcoAnalytics',
    appSubtitle: 'Herramienta de Análisis Cuantitativo para Ecología de Comunidades',
    dataInputSectionTitle: '1. Entrada de Datos',
    dataInputDescription: 'Cargue sus datos de especies y características del sitio a continuación. Puede pegar desde una hoja de cálculo o cargar un archivo .xlsx.',
    sampleDataPrompt: '¿No tiene datos? Pruebe la aplicación con datos de ejemplo:',
    loadSampleSpecies: 'Cargar Especies de Muestra',
    loadSampleSite: 'Cargar Sitios de Muestra',
    speciesDataTitle: 'Datos de Especies',
    siteFeaturesTitle: 'Características del Sitio',
    includeBiomassAnalysis: 'Incluir Análisis de Biomasa y Carbono (Opcional)',
    analyzingButton: 'Analizando...',
    analyzeButton: 'Ejecutar Análisis Ecológico',
    errorTitle: 'Error',
    resultsSectionTitle: '2. Resultados del Análisis',
    reproducibilityNote: '<b>Nota sobre reproducibilidad:</b> Ciertos análisis (CCA, Rarefacción) utilizan modelos de IA generativa para el cálculo. Los resultados pueden variar ligeramente entre ejecuciones.',
    cooccurrenceTab: 'Co-ocurrencia',
    structureTab: 'Estructura',
    ecoParamsTab: 'Parámetros Ecológicos',
    rarefactionTab: 'Rarefacción',
    indValTab: 'Especies Indicadoras',
    nicheTab: 'Nicho Ambiental',
    ccaTab: 'Análisis CCA',
    biomassTab: 'Biomasa/Carbono',
    rarefactionLoading: 'Generando curvas de rarefacción con el modelo de IA...',
    noData: 'No hay datos para mostrar.',
    writingButton: 'Escribiendo...',
    methodologyButton: 'Generar Metodología',
    generatingMethodologyDocx: 'Generando DOCX...',
    exportMethodologyDocx: 'Exportar a .docx',
    loadingMethodology: 'Generando metodología con IA...',
    methodologySectionTitle: 'Metodología',
    generatingInterpretationButton: 'Generando...',
    interpretationButton: 'Generar Interpretación Integral',
    generatingInterpretationDocx: 'Generando DOCX...',
    exportInterpretationDocx: 'Exportar a .docx',
    loadingInterpretation: 'Generando interpretación con IA...',
    interpretationSectionTitle: 'Interpretación de Resultados',
    footerText: 'Desarrollado por Carlos A. Salas-Macías',
    speciesDataError: 'Por favor, ingrese datos de especies antes de analizar.',
    ccaPlotError: 'Error al generar los datos del gráfico CCA:',
    unknownCcaError: 'Error desconocido.',
    rarefactionError: 'Error al generar los datos de rarefacción:',
    unknownRarefactionError: 'Error desconocido.',
    analysisFailedError: 'El análisis falló:',
    unknownAnalysisError: 'Error desconocido.',
    noCooccurrenceError: 'No se encontraron datos de co-ocurrencia. Por favor, ejecute el análisis primero.',
    interpretationError: 'Error al generar la interpretación:',
    unknownInterpretationError: 'Error desconocido.',
    methodologyError: 'Error al generar la metodología:',
    unknownMethodologyError: 'Error desconocido.',
    docxGenerationError: 'Error al generar el archivo DOCX:',
    apiKeyConfigTitle: 'Configuración de API Key de Gemini',
    apiKeyConfigDesc: 'Como esta aplicación se ejecuta directamente en su navegador (GitHub Pages), se requiere una clave API de Gemini personal para realizar análisis basados en Inteligencia Artificial (gráfico CCA, interpretación, metodología, rarefacción, etc.). Su clave se guardará localmente de forma segura en su navegador y nunca se compartirá.',
    apiKeyInputLabel: 'Clave API de Gemini personal:',
    apiKeyInputPlaceholder: 'Ingrese su clave AIzaSy...',
    apiKeySaveBtn: 'Guardar Clave',
    apiKeyDeleteBtn: 'Eliminar Clave Guardada',
    apiKeyStatusConfigured: '✓ Clave API Configurada Exitosamente (Guardada Localmente)',
    apiKeyStatusNotConfigured: '⚠ Clave API de Gemini no configurada o es de ejemplo. La interpretación de IA, el gráfico de CCA y la metodología fallarán con error 403.',
    apiKeyHowToGet: '¿Cómo obtener una clave gratuita?',
    apiKeyHowToGetDesc: 'Puede crear una clave API de Gemini gratuita en un minuto ingresando a Google AI Studio (requiere una cuenta de Google).',
    apiKeyAIStudioLinkText: 'Obtener Clave API en Google AI Studio',

    // components/DataInput.tsx
    uploadFile: 'Subir archivo',
    downloadTemplateTooltip: 'Descargar plantilla de Excel',
    downloadTemplate: 'Plantilla',
    pasteData: 'Pegar datos',
    clearDataTooltip: 'Limpiar todos los datos ingresados',
    clearData: 'Limpiar',
    fileNameLabel: 'Archivo:',
    pastePlaceholder: 'Plantilla de datos aquí (separados por tabuladores o comas)...',
    cancel: 'Cancelar',
    process: 'Procesar',

    // components/CooccurrenceTable.tsx
    diagonalCellTitle: 'Número de parcelas donde se observó la especie. Observado: {obs}',
    cellTitle: 'Observado: {obs}\nEsperado: {exp}\nP-valor: {p_value}\nEfecto: {effect}',
    cooccurrenceMatrixTitle: 'Matriz de Co-ocurrencia',
    selectSiteCooc: 'Seleccionar sitio:',
    exportSVGTooltip: 'Exportar la matriz como imagen SVG',
    exportSVG: 'Exportar SVG',
    exportCSVTooltip: 'Exportar los datos completos de co-ocurrencia a CSV',
    exportCSV: 'Exportar CSV',
    matrixInterpretationTitle: 'Cómo Interpretar la Matriz',
    matrixInterpretationLine1: 'Cada celda muestra el número de parcelas donde co-ocurren dos especies.',
    matrixInterpretationPositive: '<b style="color: #3b82f6;">Asociación Positiva (+):</b> Las especies co-ocurren significativamente más de lo esperado por azar (p < 0.05).',
    matrixInterpretationNegative: '<b style="color: #ef4444;">Asociación Negativa (–):</b> Las especies co-ocurren significativamente menos de lo esperado por azar (p < 0.05).',
    matrixInterpretationRandom: '<b>Asociación Aleatoria (Gris):</b> La co-ocurrencia no es estadísticamente diferente del azar. La intensidad del gris indica un mayor número de observaciones.',
    matrixInterpretationDiagonal: 'La <b>diagonal (gris oscuro)</b> muestra el número total de parcelas donde se encuentra cada especie.',
    matrixInterpretationHover: 'Pase el cursor sobre cualquier celda para ver los detalles estadísticos.',
    siteAnalysisNoteTitle: 'Nota sobre el Análisis por Sitio',
    siteAnalysisNoteContent: 'Este análisis considera únicamente las parcelas dentro del tipo de vegetación seleccionado. Los resultados pueden diferir del análisis "General".',
    speciesColumn: 'Especie',
    noDataForSite: 'No hay datos suficientes para este sitio o filtro.',

    // components/EnvironmentalAnalysis.tsx
    envAnalysisTitle: 'Análisis Ambiental de Pares Significativos',
    envAnalysisNoData: 'No se encontraron pares significativos o no se proporcionaron datos ambientales para el análisis.',
    envAnalysisDescription: 'Esta sección compara las condiciones ambientales promedio donde los pares de especies significativamente asociadas co-ocurren, frente a las parcelas de "control" donde solo una de las especies del par está presente.',
    positive: 'Positiva',
    negative: 'Negativa',
    pairAssociation: 'Asociación {effectText}',
    envFactor: 'Factor Ambiental',
    cooccurrenceMean: 'Media en Co-ocurrencia',
    controlMean: 'Media de Control',
    negativeCooccurrenceTooltip: 'No aplica (N/A) porque este par tiene una asociación negativa, lo que significa que rara vez o nunca co-ocurren.',

    // components/SpeciesNicheTable.tsx
    heatmapTitle: 'Mapa de Calor del Nicho Ambiental',
    palette: 'Paleta:',
    selectPalette: 'Seleccionar paleta de colores',
    legendValue: 'Valor',
    legendLow: 'Bajo',
    legendHigh: 'Alto',
    nicheAnalysisTitle: 'Análisis de Nicho Ambiental de Especies',
    selectSiteNiche: 'Seleccionar sitio:',
    nicheAnalysisDescription: 'La tabla y el mapa de calor muestran las condiciones ambientales promedio (el "nicho realizado") para cada especie, basado en las parcelas donde se encuentran presentes. El mapa de calor está normalizado por columna (factor ambiental) para resaltar las preferencias relativas.',
    nicheDataTableTitle: 'Tabla de Datos del Nicho',
    exportTableCSV: 'Exportar Tabla a CSV',

    // components/CCAPlot.tsx
    legendCorrelation: 'Correlación',
    legendStrength: 'Fuerza',
    ccaVisualizationTitle: 'Visualización del Análisis de Correspondencia Canónica (CCA)',
    selectSiteCCA: 'Seleccionar sitio:',
    colorPalette: 'Paleta de colores:',
    showLabels: 'Mostrar etiquetas',
    showConnectors: 'Mostrar conectores',
    showEllipses: 'Mostrar elipses (95 %) por tipo de vegetación',
    showSites: 'Mostrar parcelas',
    ccaArrowScale: 'Flechas reescaladas',
    ccaConstrainedInertia: 'Inercia restringida',
    ccaPermutationTest: 'Test de permutación',
    permutations: 'permutaciones',
    ccaEigenvalues: 'Autovalores',
    ccaVifNote: 'VIF > 10 indica colinealidad fuerte entre variables.',
    ccaMethodNote: 'CCA calculado numéricamente (equivalente a vegan::cca) con {n} parcelas y {s} especies; abundancia = número de individuos por parcela; puntuaciones con escalado 2; test de permutación del modelo completo (pseudo-F); semilla {seed}.',
    rarefactionOrder: 'Orden de diversidad',
    q0Label: 'q = 0 (riqueza)',
    q1Label: 'q = 1 (exponencial de Shannon)',
    q2Label: 'q = 2 (inverso de Simpson)',
    yAxisQ0: 'Riqueza de especies (q = 0)',
    yAxisQ1: 'Diversidad de Shannon (q = 1)',
    yAxisQ2: 'Diversidad de Simpson (q = 2)',
    rarefactionMethodNote: 'Rarefacción (línea continua) y extrapolación hasta el doble del tamaño observado (línea discontinua) de números de Hill según Chao et al. (2014), método del paquete iNEXT. Bandas: IC 95 % por bootstrap ({b} réplicas, semilla {seed}).',
    chao1CI: 'IC 95 % Chao1',
    pAdjValue: 'p ajust. (FDR)',
    indValBestGroup: 'Grupo indicado',
    cooccurrenceNotTested: 'No evaluado (esperado < 1)',
    cooccurrenceMethodNote: 'Modelo probabilístico de Veech (2013): probabilidades hipergeométricas exactas. Los pares con co-ocurrencia esperada < 1 no se evalúan. Significación con p ajustado por FDR (Benjamini–Hochberg) < 0,05.',
    ccaBiplotTitle: 'Biplot de Especies y Variables Ambientales',
    correlationChartTitle: 'Gráfico de Correlación Especie-Ambiente',
    interpretationTitle: 'Cómo Interpretar los Gráficos de CCA',
    interpretationBiplot: '<b>Biplot (escalado 2):</b> Los puntos negros son especies (con nombre, las 15 más abundantes) y los símbolos de color son parcelas, situadas como promedios ponderados de sus especies. Las flechas indican la dirección en que aumenta cada variable ambiental; su longitud refleja la correlación con los ejes (todas reescaladas por un factor común). La proyección de una especie sobre una flecha aproxima su posición óptima a lo largo de ese gradiente.',
    interpretationCorrelation: '<b>Gráfico de Correlación:</b> Visualiza la fuerza (tamaño del cuadrado) y la dirección (color) de la correlación de Pearson entre la presencia de una especie y cada variable ambiental.',
    interpretationEllipses: '<b>Elipses (95 %):</b> Representan la dispersión de las parcelas de cada tipo de vegetación (desviación estándar ponderada, como vegan::ordiellipse). Poca superposición indica composiciones florísticas distintas asociadas al gradiente ambiental.',
    ccaSiteLoading: 'Calculando CCA para el sitio seleccionado con el modelo de IA...',

    // components/StructuralAnalysisTable.tsx
    iviChartTitle: 'Gráfico de Índice de Valor de Importancia (IVI)',
    iviChartYAxis: 'Índice de Valor de Importancia (base 100)',
    structuralAnalysisTitle: 'Análisis Estructural',
    selectSite: 'Seleccionar sitio:',
    structuralAnalysisDescription: 'El análisis estructural describe la organización de la comunidad vegetal. El Índice de Valor de Importancia (IVI) combina la abundancia, frecuencia y dominancia relativas para cuantificar la importancia ecológica de cada especie.',
    abundance: 'Abundancia',
    frequency: 'Frecuencia',
    dominance: 'Dominancia (Área Basal)',
    ivi: 'IVI',
    abs: 'Abs.',
    rel: 'Rel. (%)',
    absCm: 'Abs. (cm²)',
    base300: 'Base 300',
    base100: 'Base 100',
    absAbundance: 'Abundancia Abs.',
    relAbundance: 'Abundancia Rel. (%)',
    absFrequency: 'Frecuencia Abs.',
    relFrequency: 'Frecuencia Rel. (%)',
    absDominance: 'Dominancia Abs. (cm²)',
    relDominance: 'Dominancia Rel. (%)',
    iviBase300: 'IVI (Base 300)',
    iviBase100: 'IVI (Base 100)',

    // LanguageSwitcher.tsx
    switchToSpanish: 'Cambiar a español',
    switchToEnglish: 'Switch to English',

    // components/DiversityIndicesTable.tsx
    siteColumn: 'Sitio',
    shannonIndex: "Shannon (H')",
    simpsonDominanceIndex: "Dominancia de Simpson (D)",
    pielouEvennessIndex: "Equidad de Pielou (J')",
    margalefRichnessIndex: "Riqueza de Margalef (d)",
    chao1Index: 'Riqueza Estimada (Chao-1)',
    pointSizeSmall: 'Pequeño',
    pointSizeMedium: 'Mediano',
    pointSizeLarge: 'Grande',
    diversityAnalysisTitle: 'Análisis de Diversidad Alfa',
    diversityAnalysisDescription: 'Esta sección calcula varios índices de diversidad alfa para cada sitio, proporcionando una instantánea de la riqueza y estructura de la comunidad.',
    diversityPlotTitle: 'Gráfico de Índices de Diversidad',
    selectIndex: 'Seleccionar Índice:',
    selectPointSize: 'Tamaño del Punto:',
    exportFormat: 'Formato de Exportación:',
    downloadChart: 'Descargar Gráfico',
    diversityDataTableTitle: 'Tabla de Datos de Diversidad',
    indexValue: 'Valor del Índice',

    // components/RarefactionCurvePlot.tsx
    showCI: 'Mostrar Intervalo de Confianza (95%)',
    rarefactionPlotTitle: 'Curvas de Rarefacción y Extrapolación',
    rarefactionPlotSubtitle: 'Números de Hill según el tamaño de muestra (método iNEXT)',
    yAxisSpeciesDiversity: 'Diversidad de Especies (Riqueza)',
    xAxisIndividuals: 'Número de Individuos (Tamaño de Muestra)',
    legendSite: 'Sitio',
    legendLineType: 'Tipo de Línea',
    legendRarefaction: 'Rarefacción (Interpolación)',
    legendExtrapolation: 'Extrapolación',
    
    // components/IndValTable.tsx
    indValValue: 'Valor IndVal (%)',
    pValue: 'Valor p',
    indValAnalysisTitle: 'Análisis de Especies Indicadoras (IndVal)',
    indValAnalysisDescription: 'Identifica especies indicadoras de cada tipo de vegetación (IndVal de Dufrêne y Legendre, 1997, con corrección por tamaño de grupo de De Cáceres y Legendre, 2009). Cada especie se evalúa solo en el grupo donde alcanza su valor máximo (resaltado), con 999 permutaciones y semilla fija. Se muestran el p de permutación y el p ajustado por FDR (Benjamini–Hochberg).',
    indValRecalculating: 'Recalculando el análisis para la selección...',
    
    // components/BiomassCalculatorTab.tsx
    noDataForBiomass: 'No hay resultados de biomasa disponibles. Por favor, habilite la opción y vuelva a ejecutar el análisis.',
    analysisResultsTitle: 'Resultados del Análisis de Biomasa y Carbono',
    totalAGB: 'Biomasa Aérea Total (AGB) (Mg)',
    totalCarbon: 'Carbono Almacenado Total (Mg)',
    avgCarbonPerHa: 'Densidad de Carbono Promedio (Mg/ha)',
    summaryByVegType: 'Resumen por Tipo de Vegetación',
    downloadResults: 'Descargar Resultados Completos',
    vegetationType: 'Tipo de Vegetación',
    agbMgTotal: 'AGB Total (Mg)',
    carbonMgTotal: 'Carbono Total (Mg)',
    carbonMgHa: 'Carbono (Mg/ha)',
    summaryByPlotTitle: 'Resumen por Parcela',
    downloadPlotResults: 'Descargar Resumen por Parcela',
    summaryBySpecies: 'Resumen por Especie',
    downloadSpeciesResults: 'Descargar Resumen por Especie',
    plotColumnHeader: 'Parcela',
    carbonByVegTypeChart: 'Carbono Almacenado por Tipo de Vegetación',
    carbonByTaxonChart: 'Contribución de Carbono por Taxón',
    taxonSpecies: 'Especie',
    taxonGenus: 'Género',
    taxonFamily: 'Familia',
    top20Note: '(Se muestran los 20 taxones principales)',
    yAxisCarbonMg: 'Carbono Almacenado (Mg)',
    chordDiagramTitle: 'Diagrama de Cuerdas de Contribución de Carbono',
    chordDiagramDescription: 'Este diagrama visualiza cómo las 20 especies principales contribuyen al stock de carbono en cada tipo de vegetación. El flujo va desde la especie (derecha) hacia el tipo de vegetación (arriba).',

    // components/BiomassConfigPanel.tsx
    biomassConfigPanelTitle: 'Configuración del Análisis de Biomasa',
    biomassConfigDescription: 'Por favor, configure los parámetros para cada tipo de vegetación. Esta información es necesaria para los cálculos de biomasa y densidad.',
    selectAllometricEquation: 'Ecuación alométrica (Bosque)',
    numPlots: 'Nº de Parcelas',
    plotArea: 'Área/Parcela (m²)',
    siteCharacterization: 'Caracterización del Sitio (Opcional)',
    siteCharacterizationPlaceholder: 'Describa brevemente las características de este tipo de vegetación (p. ej., composición, estructura, perturbaciones). Esto mejorará la interpretación generada por la IA.',
    
    // components/EcologicalParametersTable.tsx
    speciesRichness: 'Riqueza de Especies (S)',
    individuals: 'Nº de Individuos (N)',
    genusRichness: 'Riqueza de Géneros',
    familyRichness: 'Riqueza de Familias',
    sampleCoverage: 'Cobertura de Muestra (SC*)',
    parameter: 'Parámetro',
    sampleCoverageNote: '*Cobertura de muestra (Chao y Jost, 2012): proporción estimada de los individuos de la comunidad que pertenecen a especies representadas en la muestra. Chao1 con corrección de sesgo (n−1)/n e IC 95 % log-normal (Chao, 1987).',
    ecoParamsTitle: 'Parámetros Ecológicos y Diversidad Alfa',
    ecoParamsDescription: 'Esta sección calcula varios parámetros ecológicos y de diversidad alfa para cada sitio, proporcionando una instantánea de la riqueza y estructura de la comunidad.',
    
    // components/StandCharacteristicsTable.tsx
    numPlotsLabel: 'Número de Parcelas',
    stemDensityLabel: 'Densidad de Fustes (tallos/ha)',
    minHeightLabel: 'Altura Mínima (m)',
    maxHeightLabel: 'Altura Máxima (m)',
    avgHeightLabel: 'Altura Promedio (m)',
    minDBHLabel: 'DAP Mínimo (cm)',
    maxDBHLabel: 'DAP Máximo (cm)',
    avgDBHLabel: 'DAP Promedio (cm)',
    minWoodDensityLabel: 'Densidad Mínima Madera (g/cm³)',
    maxWoodDensityLabel: 'Densidad Máxima Madera (g/cm³)',
    // Fixed typo: removed space in property name
    avgWoodDensityLabel: 'Densidad Promedio Madera (g/cm³)',
    standCharacteristicsTitle: 'Características del Rodal',
    
    // Soil Carbon Analysis
    soilConfigTitle: 'Configuración de Carbono Orgánico del Suelo (COS)',
    bulkDensityLabel: 'Densidad Aparente (g/cm³)',
    depthLabel: 'Profundidad (cm)',
    stoninessLabel: 'Pedregosidad (%)',
    carbonColumnLabel: 'Columna de Carbono/MO',
    selectColumn: 'Seleccionar columna',
    isSOMLabel: '¿Los datos son Materia Orgánica (MO)? (Se aplicará factor Van Bemmelen 0.58)',
    soilHeader: 'Análisis de Carbono en Suelo',
    comparisonChartTitle: 'Comparación de Reservorios de Carbono',
    legendBiomass: 'Biomasa Aérea',
    legendSoil: 'Suelo (COS)',

    finalInterpretationPromptTemplate: `Como ecólogo cuantitativo experto, redacta una interpretación científica INTEGRAL y COHESIVA de los resultados adjuntos.

**REGLAS CRÍTICAS DE REDACCIÓN:**
1.  **CITAS EN EL TEXTO:** Debes incluir citas bibliográficas reales dentro del texto (formato: Autor, Año) para respaldar cada interpretación ecológica o estadística.
2.  **BIBLIOGRAFÍA REAL:** Al final, incluye una sección de 'Referencias Bibliográficas' con la lista completa. Solo usa referencias reales y verificables. **Obligatorio incluir el DOI** para cada una.
3.  **ESTILO:** Científico, riguroso y en español.
4.  **EVITAR EL TRUNCAMIENTO (SÍNTESIS CIENTÍFICA):** El informe debe ser sumamente directo, conciso y sintetizado. Cada una de las 4 secciones estructurales debe ser breve y sustancial (máximo 2 párrafos concisos por sección). Esto es obligatorio para garantizar que el análisis de todos los apartados y la bibliografía se escriban por completo de principio a fin sin que el texto sea truncado a la mitad por límites de longitud. Limita el reporte completo a un máximo de 800-1000 palabras.

**Estructura:**
### 1. Dinámica de Co-ocurrencia y Asociación de Especies
Discute los pares con asociaciones significativas (positivas o negativas). Cita a Veech (2013) sobre modelos de co-ocurrencia probabilística.
### 2. Gradientes Ambientales y Distribución (Nicho y CCA)
Integra los resultados del CCA. Cita a Ter Braak (1986) para el análisis de correspondencia canónica. Discute cómo los factores limitantes (pH, Nutrientes) definen el nicho realizado (Hutchinson, 1957).
### 3. Diversidad Alfa y Complejidad Estructural
Compara los sitios usando Shannon, Simpson y Chao-1. Cita a Magurran (2004) para diversidad y a Magurran & McGill (2011). Menciona la completitud del muestreo según Chao et al. (2014) en relación a la rarefacción.
### 4. Almacenamiento de Carbono y Biomasa
Interpreta los stocks de carbono. Cita a Chave et al. (2005 o 2014) sobre ecuaciones alométricas para bosques tropicales.

**Datos:**
{matrixString}
{analysesString}
{nicheString}
{ccaString}
{ecoParamsString}
{indValString}
{rarefactionString}
{biomassString}
{vegetationDescriptions}`,
    methodologyPrompt: `Como ecólogo cuantitativo, redacta la sección de **Metodología** para un informe científico en español.

**REQUISITOS OBLIGATORIOS:**
1.  **CITAS EN EL TEXTO:** Cada método descrito debe incluir su cita bibliográfica real (Autor, Año).
2.  **REFERENCIAS:** Al final, genera la lista de 'Referencias Bibliográficas' con formato APA y **OBLIGATORIAMENTE el DOI**. No inventes fuentes.
3.  **SÍNTESIS DE MÉTODOS (EVITAR TRUNCAMIENTO):** Redacta cada sección de forma directa, técnica y compacta. Evita rodeos teóricos o introducciones extensas. Toda la metodología debe caber perfectamente de principio a fin sin ser truncada. Limita la longitud total a un máximo de 700 palabras.

**Secciones a incluir:**
### 1. Análisis de Co-ocurrencia Probabilística
Describe el uso del modelo de distribución hipergeométrica para detectar asociaciones no aleatorias (Veech, 2013).
### 2. Relaciones Especie-Ambiente y Nicho
Describe el Análisis de Correspondencia Canónica (CCA) (Ter Braak, 1986) y el cálculo del nicho realizado basado en medias ponderadas.
### 3. Evaluación de la Diversidad y Riqueza
Explica los índices de Shannon, Simpson y el estimador Chao-1 (Magurran, 2004). Describe la metodología de Rarefacción y Extrapolación basada en números de Hill (Chao et al., 2014).
### 4. Determinación de Especies Indicadoras
Describe el método IndVal de Dufrêne & Legendre (1997).
### 5. Análisis Estructural e Importancia Ecológica
Explica el cálculo del Índice de Valor de Importancia (IVI) (Curtis & McIntosh, 1951).
### 6. Estimación de Biomasa Aérea y Carbono
Describe el uso de modelos alométricos pantropicales (Chave et al., 2014).

**Contexto del estudio:**
{vegetationDescriptions}`,
  },
  en: {
    // App.tsx
    appTitle: 'EcoAnalytics',
    appSubtitle: 'Quantitative Analysis Tool for Community Ecology',
    dataInputSectionTitle: '1. Data Input',
    dataInputDescription: 'Load your species and site feature data below. You can paste from a spreadsheet or upload an .xlsx file.',
    sampleDataPrompt: 'No data? Try the app with sample data:',
    loadSampleSpecies: 'Load Sample Species',
    loadSampleSite: 'Load Sample Site',
    speciesDataTitle: 'Species Data',
    siteFeaturesTitle: 'Site Features',
    includeBiomassAnalysis: 'Include Biomass and Carbon Analysis (Optional)',
    analyzingButton: 'Analyzing...',
    analyzeButton: 'Run Ecological Analysis',
    errorTitle: 'Error',
    resultsSectionTitle: '2. Analysis Results',
    reproducibilityNote: '<b>Note on Reproducibility:</b> Certain analyses (CCA, Rarefaction) use generative AI models for computation. Results may vary slightly between runs.',
    cooccurrenceTab: 'Co-occurrence',
    structureTab: 'Structure',
    ecoParamsTab: 'Ecological Parameters',
    rarefactionTab: 'Rarefaction',
    indValTab: 'Indicator Species',
    nicheTab: 'Environmental Niche',
    ccaTab: 'CCA Analysis',
    biomassTab: 'Biomass/Carbon',
    rarefactionLoading: 'Generating rarefaction curves with AI model...',
    noData: 'No data to display.',
    writingButton: 'Writing...',
    methodologyButton: 'Generate Methodology',
    generatingMethodologyDocx: 'Generating DOCX...',
    exportMethodologyDocx: 'Export to .docx',
    loadingMethodology: 'Generating methodology with AI...',
    methodologySectionTitle: 'Methodology',
    generatingInterpretationButton: 'Generating...',
    interpretationButton: 'Generate Comprehensive Interpretation',
    generatingInterpretationDocx: 'Generating DOCX...',
    exportInterpretationDocx: 'Export to .docx',
    loadingInterpretation: 'Generating interpretation with AI...',
    interpretationSectionTitle: 'Interpretation of Results',
    footerText: 'Developed by Carlos A. Salas-Macías',
    speciesDataError: 'Please enter species data before analyzing.',
    ccaPlotError: 'Error generating CCA plot data:',
    unknownCcaError: 'Unknown error.',
    rarefactionError: 'Error generating rarefaction data:',
    unknownRarefactionError: 'Unknown error.',
    analysisFailedError: 'Analysis failed:',
    unknownAnalysisError: 'Unknown error.',
    noCooccurrenceError: 'No co-occurrence data found. Please run the analysis first.',
    interpretationError: 'Error generating interpretation:',
    unknownInterpretationError: 'Unknown error.',
    methodologyError: 'Error generating methodology:',
    unknownMethodologyError: 'Unknown error.',
    docxGenerationError: 'Error generating DOCX file:',
    apiKeyConfigTitle: 'Gemini API Key Configuration',
    apiKeyConfigDesc: 'Since this application runs entirely in your browser (GitHub Pages), a personal Gemini API key is required to perform AI-based analyses (CCA plot, comprehensive interpretation, methodology, rarefaction, etc.). Your key will be safely stored locally in your browser and will never be shared.',
    apiKeyInputLabel: 'Personal Gemini API Key:',
    apiKeyInputPlaceholder: 'Enter your AIzaSy... key',
    apiKeySaveBtn: 'Save Key',
    apiKeyDeleteBtn: 'Delete Saved Key',
    apiKeyStatusConfigured: '✓ API Key Configured Successfully (Saved Locally)',
    apiKeyStatusNotConfigured: '⚠ Gemini API Key not configured or is a placeholder. AI interpretation, CCA plotting, and methodology will fail with a 403 error.',
    apiKeyHowToGet: 'How to get a free key?',
    apiKeyHowToGetDesc: 'You can create a free Gemini API key in one minute by logging into Google AI Studio (requires a Google account).',
    apiKeyAIStudioLinkText: 'Get API Key at Google AI Studio',

    // components/DataInput.tsx
    uploadFile: 'Upload File',
    downloadTemplateTooltip: 'Download Excel template',
    downloadTemplate: 'Template',
    pasteData: 'Paste Data',
    clearDataTooltip: 'Clear all entered data',
    clearData: 'Clear',
    fileNameLabel: 'File:',
    pastePlaceholder: 'Paste your data here (tab or comma separated)...',
    cancel: 'Cancel',
    process: 'Process',

    // components/CooccurrenceTable.tsx
    diagonalCellTitle: 'Number of plots where the species was observed. Observed: {obs}',
    cellTitle: 'Observed: {obs}\nExpected: {exp}\nP-value: {p_value}\nEffect: {effect}',
    cooccurrenceMatrixTitle: 'Co-occurrence Matrix',
    selectSiteCooc: 'Select site:',
    exportSVGTooltip: 'Export the matrix as an SVG image',
    exportSVG: 'Export SVG',
    exportCSVTooltip: 'Export the full co-occurrence data to CSV',
    exportCSV: 'Export CSV',
    matrixInterpretationTitle: 'How to Interpret the Matrix',
    matrixInterpretationLine1: 'Each cell shows the number of plots where two species co-occur.',
    matrixInterpretationPositive: '<b style="color: #3b82f6;">Positive Association (+):</b> Species co-occur significantly more than expected by chance (p < 0.05).',
    matrixInterpretationNegative: '<b style="color: #ef4444;">Negative Association (–):</b> Species co-occur significantly less than expected by chance (p < 0.05).',
    matrixInterpretationRandom: '<b>Random Association (Gray):</b> Co-occurrence is not statistically different from chance. The gray intensity indicates a higher number of observations.',
    matrixInterpretationDiagonal: 'The <b>diagonal (dark gray)</b> shows the total number of plots where each species is found.',
    matrixInterpretationHover: 'Hover over any cell to see statistical details.',
    siteAnalysisNoteTitle: 'Note on Per-Site Analysis',
    siteAnalysisNoteContent: 'This analysis only considers plots within the selected vegetation type. Results may differ from the "General" analysis.',
    speciesColumn: 'Species',
    noDataForSite: 'Not enough data for this site or filter.',
    
    // components/EnvironmentalAnalysis.tsx
    envAnalysisTitle: 'Environmental Analysis of Significant Pairs',
    envAnalysisNoData: 'No significant pairs were found or no environmental data was provided for analysis.',
    envAnalysisDescription: 'This section compares the average environmental conditions where significantly associated species pairs co-occur, versus "control" plots where only one species of the pair is present.',
    positive: 'Positive',
    negative: 'Negative',
    pairAssociation: '{effectText} Association',
    envFactor: 'Environmental Factor',
    cooccurrenceMean: 'Co-occurrence Mean',
    controlMean: 'Control Mean',
    negativeCooccurrenceTooltip: 'Not applicable (N/A) because this pair has a negative association, meaning they rarely or never co-occur.',
    
    // components/SpeciesNicheTable.tsx
    heatmapTitle: 'Environmental Niche Heatmap',
    palette: 'Palette:',
    selectPalette: 'Select color palette',
    legendValue: 'Value',
    legendLow: 'Low',
    legendHigh: 'High',
    nicheAnalysisTitle: 'Species Environmental Niche Analysis',
    selectSiteNiche: 'Select site:',
    nicheAnalysisDescription: 'The table and heatmap show the average environmental conditions (the "realized niche") for each species, based on the plots where they are present. The heatmap is normalized by column (environmental factor) to highlight relative preferences.',
    nicheDataTableTitle: 'Niche Data Table',
    exportTableCSV: 'Export Table to CSV',

    // components/CCAPlot.tsx
    legendCorrelation: 'Correlation',
    legendStrength: 'Strength',
    ccaVisualizationTitle: 'Canonical Correspondence Analysis (CCA) Visualization',
    selectSiteCCA: 'Select site:',
    colorPalette: 'Color Palette:',
    showLabels: 'Show labels',
    showConnectors: 'Show connectors',
    showEllipses: 'Show 95% ellipses by vegetation type',
    showSites: 'Show plots',
    ccaArrowScale: 'Arrows rescaled',
    ccaConstrainedInertia: 'Constrained inertia',
    ccaPermutationTest: 'Permutation test',
    permutations: 'permutations',
    ccaEigenvalues: 'Eigenvalues',
    ccaVifNote: 'VIF > 10 indicates strong collinearity among variables.',
    ccaMethodNote: 'CCA computed numerically (equivalent to vegan::cca) with {n} plots and {s} species; abundance = number of individuals per plot; scaling 2 scores; permutation test of the full model (pseudo-F); seed {seed}.',
    rarefactionOrder: 'Diversity order',
    q0Label: 'q = 0 (richness)',
    q1Label: 'q = 1 (exponential Shannon)',
    q2Label: 'q = 2 (inverse Simpson)',
    yAxisQ0: 'Species richness (q = 0)',
    yAxisQ1: 'Shannon diversity (q = 1)',
    yAxisQ2: 'Simpson diversity (q = 2)',
    rarefactionMethodNote: 'Rarefaction (solid line) and extrapolation up to twice the observed sample size (dashed line) of Hill numbers following Chao et al. (2014), iNEXT method. Bands: 95% bootstrap CI ({b} replicates, seed {seed}).',
    chao1CI: 'Chao1 95% CI',
    pAdjValue: 'adj. p (FDR)',
    indValBestGroup: 'Indicated group',
    cooccurrenceNotTested: 'Not tested (expected < 1)',
    cooccurrenceMethodNote: 'Probabilistic model of Veech (2013): exact hypergeometric probabilities. Pairs with expected co-occurrence < 1 are not tested. Significance at FDR-adjusted (Benjamini–Hochberg) p < 0.05.',
    ccaBiplotTitle: 'Species and Environmental Variables Biplot',
    correlationChartTitle: 'Species-Environment Correlation Plot',
    interpretationTitle: 'How to Interpret the CCA Plots',
    interpretationBiplot: '<b>Biplot (scaling 2):</b> Black dots are species (the 15 most abundant are labelled) and coloured symbols are plots, placed as weighted averages of their species. Arrows point in the direction of increase of each environmental variable; their length reflects the correlation with the axes (all rescaled by a common factor). Projecting a species onto an arrow approximates its optimum along that gradient.',
    interpretationCorrelation: '<b>Correlation Plot:</b> Visualizes the strength (square size) and direction (color) of the Pearson correlation between a species\' presence and each environmental variable.',
    interpretationEllipses: '<b>Ellipses (95%):</b> Show the dispersion of the plots of each vegetation type (weighted standard deviation, as vegan::ordiellipse). Little overlap indicates distinct floristic composition associated with the environmental gradient.',
    ccaSiteLoading: 'Calculating CCA for selected site with AI model...',

    // components/StructuralAnalysisTable.tsx
    iviChartTitle: 'Importance Value Index (IVI) Chart',
    iviChartYAxis: 'Importance Value Index (base 100)',
    structuralAnalysisTitle: 'Structural Analysis',
    selectSite: 'Select site:',
    structuralAnalysisDescription: 'Structural analysis describes the organization of the plant community. The Importance Value Index (IVI) combines relative abundance, frequency, and dominance to quantify the ecological importance of each species.',
    abundance: 'Abundancia',
    frequency: 'Frecuencia',
    dominance: 'Dominancia (Basal Area)',
    ivi: 'IVI',
    abs: 'Abs.',
    rel: 'Rel. (%)',
    absCm: 'Abs. (cm²)',
    base300: 'Base 300',
    base100: 'Base 100',
    absAbundance: 'Abs. Abundance',
    relAbundance: 'Rel. Abundance (%)',
    absFrequency: 'Abs. Frequency',
    relFrequency: 'Rel. Frequency (%)',
    absDominance: 'Abs. Dominance (cm²)',
    relDominance: 'Rel. Dominance (%)',
    iviBase300: 'IVI (Base 300)',
    iviBase100: 'IVI (Base 100)',
    
    // LanguageSwitcher.tsx
    switchToSpanish: 'Cambiar a español',
    switchToEnglish: 'Switch to English',
    
    // components/DiversityIndicesTable.tsx
    siteColumn: 'Site',
    shannonIndex: "Shannon (H')",
    simpsonDominanceIndex: "Simpson's Dominance (D)",
    pielouEvennessIndex: "Pielou's Evenness (J')",
    margalefRichnessIndex: "Margalef's Richness (d)",
    chao1Index: 'Estimated Richness (Chao-1)',
    pointSizeSmall: 'Small',
    pointSizeMedium: 'Medium',
    pointSizeLarge: 'Large',
    diversityAnalysisTitle: 'Alpha Diversity Analysis',
    diversityAnalysisDescription: 'This section calculates various alpha diversity indices for each site, providing a snapshot of community richness and structure.',
    diversityPlotTitle: 'Diversity Indices Plot',
    selectIndex: 'Select Index:',
    selectPointSize: 'Point Size:',
    exportFormat: 'Export Format:',
    downloadChart: 'Download Chart',
    diversityDataTableTitle: 'Diversity Data Table',
    indexValue: 'Index Value',
    
    // components/RarefactionCurvePlot.tsx
    showCI: 'Show Confidence Interval (95%)',
    rarefactionPlotTitle: 'Rarefaction and Extrapolation Curves',
    rarefactionPlotSubtitle: 'Sample-size-based Hill numbers (iNEXT method)',
    yAxisSpeciesDiversity: 'Species Diversity (Richness)',
    xAxisIndividuals: 'Number of Individuals (Sample Size)',
    legendSite: 'Site',
    legendLineType: 'Line Type',
    legendRarefaction: 'Rarefaction (Interpolation)',
    legendExtrapolation: 'Extrapolation',
    
    // components/IndValTable.tsx
    indValValue: 'IndVal Value (%)',
    pValue: 'p-value',
    indValAnalysisTitle: 'Indicator Species Analysis (IndVal)',
    indValAnalysisDescription: 'Identifies indicator species of each vegetation type (IndVal of Dufrêne & Legendre, 1997, with the group-size correction of De Cáceres & Legendre, 2009). Each species is tested only in the group where it reaches its maximum value (highlighted), with 999 permutations and a fixed seed. The permutation p and the FDR-adjusted (Benjamini–Hochberg) p are shown.',
    indValRecalculating: 'Recalculating analysis for selection...',
    
    // components/BiomassCalculatorTab.tsx
    noDataForBiomass: 'No biomass results available. Please enable the option and run the analysis again.',
    analysisResultsTitle: 'Biomass and Carbon Analysis Results',
    totalAGB: 'Total Above-Ground Biomass (AGB) (Mg)',
    totalCarbon: 'Total Stored Carbon (Mg)',
    avgCarbonPerHa: 'Average Carbon Density (Mg/ha)',
    summaryByVegType: 'Summary by Vegetation Type',
    downloadResults: 'Download Full Results',
    vegetationType: 'Vegetation Type',
    agbMgTotal: 'AGB Total (Mg)',
    carbonMgTotal: 'Carbon Total (Mg)',
    carbonMgHa: 'Carbon (Mg/ha)',
    summaryByPlotTitle: 'Summary by Plot',
    downloadPlotResults: 'Download Plot Summary',
    summaryBySpecies: 'Summary by Species',
    downloadSpeciesResults: 'Download Species Summary',
    plotColumnHeader: 'Plot',
    carbonByVegTypeChart: 'Stored Carbon by Vegetation Type',
    carbonByTaxonChart: 'Carbon Contribution by Taxon',
    taxonSpecies: 'Species',
    taxonGenus: 'Genus',
    taxonFamily: 'Family',
    top20Note: '(Top 20 taxa shown)',
    yAxisCarbonMg: 'Stored Carbon (Mg)',
    chordDiagramTitle: 'Carbon Contribution Chord Diagram',
    chordDiagramDescription: 'This diagram visualizes how the top 20 species contribute to the carbon stock in each vegetation type. The flow is from the species (right) to the vegetation type (top).',

    // components/BiomassConfigPanel.tsx
    biomassConfigPanelTitle: 'Biomass Analysis Configuration',
    biomassConfigDescription: 'Please configure the parameters for each vegetation type. This information is required for biomass and density calculations.',
    selectAllometricEquation: 'Allometric Equation (Forest)',
    numPlots: 'No. of Plots',
    plotArea: 'Area/Plot (m²)',
    siteCharacterization: 'Site Characterization (Optional)',
    siteCharacterizationPlaceholder: 'Briefly describe the characteristics of this vegetation type (e.g., composition, structure, disturbances). This will improve the AI-generated interpretation.',
    
    // components/EcologicalParametersTable.tsx
    speciesRichness: 'Species Richness (S)',
    individuals: 'No. of Individuals (N)',
    genusRichness: 'Genus Richness',
    familyRichness: 'Family Richness',
    sampleCoverage: 'Sample Coverage (SC*)',
    parameter: 'Parameter',
    sampleCoverageNote: '*Sample coverage (Chao & Jost, 2012): estimated proportion of the individuals in the community that belong to species represented in the sample. Chao1 with (n−1)/n bias correction and 95% log-normal CI (Chao, 1987).',
    ecoParamsTitle: 'Ecological Parameters & Alpha Diversity',
    ecoParamsDescription: 'This section calculates various ecological and alpha diversity parameters for each site, providing a snapshot of community richness and structure.',
    
    // components/StandCharacteristicsTable.tsx
    numPlotsLabel: 'Number of Plots',
    stemDensityLabel: 'Stem Density (stems/ha)',
    minHeightLabel: 'Minimum Height (m)',
    maxHeightLabel: 'Maximum Height (m)',
    avgHeightLabel: 'Average Height (m)',
    minDBHLabel: 'Minimum DBH (cm)',
    maxDBHLabel: 'Maximum DBH (cm)',
    avgDBHLabel: 'Average DBH (cm)',
    minWoodDensityLabel: 'Minimum Wood Density (g/cm³)',
    maxWoodDensityLabel: 'Maximum Wood Density (g/cm³)',
    // Fixed typo: removed space in property name
    avgWoodDensityLabel: 'Average Wood Density (g/cm³)',
    standCharacteristicsTitle: 'Stand Characteristics',
    
    // Soil Carbon Analysis
    soilConfigTitle: 'Soil Organic Carbon (SOC) Configuration',
    bulkDensityLabel: 'Bulk Density (g/cm³)',
    depthLabel: 'Depth (cm)',
    stoninessLabel: 'Stoniness (%)',
    carbonColumnLabel: 'Carbon/SOM Column',
    selectColumn: 'Select column',
    isSOMLabel: 'Is data Soil Organic Matter (SOM)? (Van Bemmelen factor 0.58) will be applied)',
    soilHeader: 'Soil Carbon Analysis',
    comparisonChartTitle: 'Carbon Reservoir Comparison',
    legendBiomass: 'Above-ground Biomass',
    legendSoil: 'Soil (SOC)',

    finalInterpretationPromptTemplate: `As an expert quantitative ecologist, write a COMPREHENSIVE and COHESIVE scientific interpretation of the provided results.

**CRITICAL WRITING RULES:**
1.  **IN-TEXT CITATIONS:** You MUST include real bibliographic citations within the text (format: Author, Year) to support every ecological or statistical claim.
2.  **REAL BIBLIOGRAPHY:** At the end, include a 'Bibliographic References' section. Only use real, verifiable sources. **Include the DOI** for every reference.
3.  **STYLE:** Scientific, rigorous, and in English.
4.  **PREVENT TRUNCATION (SCIENTIFIC SYNTHESIS):** The report must be highly direct, concise, and synthesized. Each of the 4 structural sections must be brief and substantial (maximum of 2 concise paragraphs per section). This is mandatory to ensure the entire analysis and bibliography are fully written without getting truncated or cut off mid-sentence due to system output length limits. Limit the entire report to a maximum of 800-1000 words.

**Report Structure:**
### 1. Species Co-occurrence and Association Dynamics
Discuss significant pairs. Cite Veech (2013) for probabilistic co-occurrence models.
### 2. Environmental Gradients and Distribution (Niche & CCA)
Integrate CCA results. Cite Ter Braak (1986) for canonical correspondence analysis. Discuss limiting factors and the realized niche (Hutchinson, 1957).
### 3. Alpha Diversity and Structural Complexity
Compare sites using Shannon, Simpson, and Chao-1. Cite Magurran (2004) for diversity. Mention sampling completeness according to Chao et al. (2014).
### 4. Carbon Stocks and Biomass Storage
Interpret carbon stocks. Cite Chave et al. (2005 or 2014) for allometric equations in tropical forests.

**Data:**
{matrixString}
{analysesString}
{nicheString}
{ccaString}
{ecoParamsString}
{indValString}
{rarefactionString}
{biomassString}
{vegetationDescriptions}`,
    methodologyPrompt: `As a quantitative ecologist, write the **Methodology** section for a scientific report in English.

**MANDATORY REQUIREMENTS:**
1.  **IN-TEXT CITATIONS:** Every method described must include its real bibliographic citation (Author, Year).
2.  **REFERENCES:** At the end, generate a 'Bibliographic References' list in APA style with **mandatory DOIs**. Do not invent sources.
3.  **METHOD SYNTHESIS (PREVENT TRUNCATION):** Write each section in a direct, highly technical, and compact manner. Avoid generic theoretical detours or long introductions. The entire methodology must fit perfectly and be fully written from start to finish without truncation. Limit total length to 700 words max.

**Sections to include:**
### 1. Probabilistic Co-occurrence Analysis
Describe the hypergeometric distribution model for non-random associations (Veech, 2013).
### 2. Species-Environment Relationships and Niche
Describe Canonical Correspondence Analysis (CCA) (Ter Braak, 1986) and realized niche calculation.
### 3. Diversity and Richness Assessment
Explain Shannon, Simpson, and Chao-1 indices (Magurran, 2004). Describe Rarefaction and Extrapolation based on Hill numbers (Chao et al., 2014).
### 4. Indicator Species Analysis
Describe the IndVal method by Dufrêne & Legendre (1997).
### 5. Structural Analysis and Ecological Importance
Explain the Importance Value Index (IVI) (Curtis & McIntosh, 1951).
### 6. Biomass and Carbon Stock Estimation
Describe the use of pantropical allometric models (Chave et al., 2014).

**Study Context:**
{vegetationDescriptions}`,
  },
};

type TranslationKey = keyof typeof translations.en;

type Translations = {
  [K in TranslationKey]: string;
} & {
  header: (key: string) => string;
};

export const useTranslations = (): Translations => {
    const { language } = useLanguage();
    const langTranslations = language === 'es' ? translations.es : translations.en;
    
    const headerFunc = (key: string) => {
        const lowerKey = key.toLowerCase();
        for (const h in headerTranslations) {
            if (h.toLowerCase() === lowerKey) {
                return headerTranslations[h][language];
            }
        }
        return key;
    };
    
    return { ...langTranslations, header: headerFunc };
};
