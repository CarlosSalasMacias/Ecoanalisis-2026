
import { GoogleGenAI, Type, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { SpeciesData, SiteData, CCACoordinates } from '../types';

// Initialize the Gemini AI client dynamically
export const getApiKey = (): string => {
    // Check localStorage first (useful for static deploys like GitHub Pages)
    const savedKey = typeof window !== 'undefined' ? localStorage.getItem('GEMINI_API_KEY') : null;
    if (savedKey && savedKey.trim() && savedKey !== 'PLACEHOLDER_API_KEY' && savedKey !== 'undefined') {
        return savedKey.trim();
    }
    // Fallback to environment variables
    const envKey = (process.env.API_KEY || process.env.GEMINI_API_KEY || '').trim();
    if (envKey && envKey !== 'PLACEHOLDER_API_KEY' && envKey !== 'undefined') {
        return envKey;
    }
    return '';
};

export const hasApiKeyConfigured = (): boolean => {
    return getApiKey().length > 0;
};

export const getAIClient = (): GoogleGenAI => {
    const key = getApiKey();
    if (!key) {
        throw new Error("Por favor, configure su clave API (API Key) de Gemini primero para realizar este análisis de IA.");
    }
    return new GoogleGenAI({ 
        apiKey: key,
        httpOptions: {
            headers: {
                'User-Agent': 'aistudio-build'
            }
        }
    });
};

// --- Helper Functions to Format Data for Prompts ---

const formatSpeciesDataForJsonPrompt = (speciesData: SpeciesData[]): string => {
    const sitePlotSpecies: { [key: string]: string[] } = {};
    speciesData.forEach(d => {
        const key = `${d['Tipo de vegetación']}-${d.Parcela}`;
        if (!sitePlotSpecies[key]) {
            sitePlotSpecies[key] = [];
        }
        const speciesName = d['N_Científico (Abreviado)'];
        if (speciesName && !sitePlotSpecies[key].includes(speciesName)) {
            sitePlotSpecies[key].push(speciesName);
        }
    });

    // Sort species within each plot
    for (const key in sitePlotSpecies) {
        sitePlotSpecies[key].sort();
    }
    
    // Sort the main keys to ensure deterministic output
    const sortedKeys = Object.keys(sitePlotSpecies).sort();
    const sortedSitePlotSpecies: { [key: string]: string[] } = {};
    for (const key of sortedKeys) {
        sortedSitePlotSpecies[key] = sitePlotSpecies[key];
    }

    return JSON.stringify(sortedSitePlotSpecies); // Compact JSON
};

const formatSiteDataForJsonPrompt = (siteData: SiteData): string => {
    const plots = Object.keys(siteData);
    if (plots.length === 0) return "{}";

    const factors: { [key: string]: number[] } = {};
    const factorKeys = new Set<string>();

    // 1. Collect all numeric values for each environmental factor
    for (const plot of plots) {
        for (const factor in siteData[plot]) {
            const value = siteData[plot][factor];
            if (typeof value === 'number' && isFinite(value)) {
                factorKeys.add(factor);
                if (!factors[factor]) {
                    factors[factor] = [];
                }
                factors[factor].push(value);
            }
        }
    }
    
    const sortedFactorKeys = Array.from(factorKeys).sort();

    // 2. Calculate mean and standard deviation for each factor
    const stats: { [key: string]: { mean: number; stddev: number } } = {};
    for (const factor of sortedFactorKeys) {
        const values = factors[factor];
        if (values && values.length > 0) {
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const stddev = Math.sqrt(values.map(x => Math.pow(x - mean, 2)).reduce((a, b) => a + b, 0) / (values.length > 1 ? values.length - 1 : 1));
            stats[factor] = { mean, stddev };
        }
    }

    // 3. Standardize the data (z-score)
    const standardizedSiteData: SiteData = {};
    for (const plotKey of Object.keys(siteData).sort()) { // Sort for reproducibility
        standardizedSiteData[plotKey] = {};
        const plotFactors = siteData[plotKey];
        const sortedInnerKeys = Object.keys(plotFactors).sort();

        for (const factor of sortedInnerKeys) {
            const value = plotFactors[factor];
            if (typeof value === 'number' && isFinite(value) && stats[factor]) {
                const { mean, stddev } = stats[factor];
                // If stddev is 0, all values are the same. Standardized value is 0.
                const zScore = stddev > 0 ? (value - mean) / stddev : 0;
                // Round to 2 decimals to save tokens in the prompt
                standardizedSiteData[plotKey][factor] = Number(zScore.toFixed(2));
            }
        }
    }
    
    // Return the standardized data as a JSON string
    return JSON.stringify(standardizedSiteData); // Compact JSON
};

// Helper to clean JSON string
const cleanJsonString = (str: string): string => {
    // Remove potential comments
    str = str.replace(/\/\/.*$/gm, '');
    // Remove trailing commas before closing braces/brackets which are invalid in JSON
    str = str.replace(/,\s*([\]}])/g, '$1');
    return str;
};

// Stateful walker to repair truncated or incomplete JSON objects
const repairTruncatedJson = (jsonStr: string): string => {
    jsonStr = jsonStr.trim();
    if (jsonStr.endsWith('}')) {
        return jsonStr; // already closed
    }

    let openBraces = 0;
    let openBrackets = 0;
    let inString = false;
    let escape = false;
    let lastHealthyIndex = -1;
    let stateAtHealthyIndex = { openBraces: 0, openBrackets: 0 };

    for (let i = 0; i < jsonStr.length; i++) {
        const char = jsonStr[i];
        if (escape) {
            escape = false;
            continue;
        }
        if (char === '\\') {
            escape = true;
            continue;
        }
        if (char === '"') {
            inString = !inString;
            continue;
        }
        if (!inString) {
            if (char === '{') {
                openBraces++;
            } else if (char === '}') {
                openBraces--;
                if (openBraces >= 0) {
                    lastHealthyIndex = i;
                    stateAtHealthyIndex = { openBraces, openBrackets };
                }
            } else if (char === '[') {
                openBrackets++;
            } else if (char === ']') {
                openBrackets--;
                if (openBrackets >= 0) {
                    lastHealthyIndex = i;
                    stateAtHealthyIndex = { openBraces, openBrackets };
                }
            } else if (char === ',' && openBraces > 0) {
                if (jsonStr[i - 1] === '}') {
                    lastHealthyIndex = i - 1;
                    stateAtHealthyIndex = { openBraces, openBrackets };
                }
            }
        }
    }

    if (lastHealthyIndex !== -1 && (openBraces > 0 || openBrackets > 0)) {
        let repaired = jsonStr.substring(0, lastHealthyIndex + 1);
        let { openBraces: ob, openBrackets: ok } = stateAtHealthyIndex;
        
        while (ok > 0) {
            repaired += ']';
            ok--;
        }
        while (ob > 0) {
            repaired += '}';
            ob--;
        }
        return repaired;
    }

    return jsonStr;
};

// Regex fallback parsing for completely garbled or cut-off JSON outputs
const extractCcaDataWithRegex = (jsonStr: string): any => {
    const data: any = {
        labeledSpecies: [] as any[],
        unlabeledSpecies: "",
        vectors: [] as any[],
        varianceExplained: [0, 0]
    };

    // Extract labeledSpecies block and vectors block
    const parts = jsonStr.split(/"vectors"\s*:/);
    const speciesPart = parts[0] || "";
    const vectorsPart = parts[1] || "";

    const speciesRegex = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"x"\s*:\s*([-+]?[0-9]*\.?[0-9]+)\s*,\s*"y"\s*:\s*([-+]?[0-9]*\.?[0-9]+)\s*\}/g;
    let match;
    while ((match = speciesRegex.exec(speciesPart)) !== null) {
        data.labeledSpecies.push({
            name: match[1],
            x: parseFloat(match[2]),
            y: parseFloat(match[3])
        });
    }

    const vectorRegex = /\{\s*"name"\s*:\s*"([^"]+)"\s*,\s*"x"\s*:\s*([-+]?[0-9]*\.?[0-9]+)\s*,\s*"y"\s*:\s*([-+]?[0-9]*\.?[0-9]+)\s*\}/g;
    while ((match = vectorRegex.exec(vectorsPart)) !== null) {
        data.vectors.push({
            name: match[1],
            x: parseFloat(match[2]),
            y: parseFloat(match[3])
        });
    }

    const unlabeledMatch = /"unlabeledSpecies"\s*:\s*"([^"]*)"/.exec(jsonStr);
    if (unlabeledMatch) {
        data.unlabeledSpecies = unlabeledMatch[1];
    }

    const varianceMatch = /"varianceExplained"\s*:\s*\[\s*([-+]?[0-9]*\.?[0-9]+)\s*,\s*([-+]?[0-9]*\.?[0-9]+)\s*\]/.exec(jsonStr);
    if (varianceMatch) {
        data.varianceExplained = [parseFloat(varianceMatch[1]), parseFloat(varianceMatch[2])];
    }

    return data;
};

// Helper for exponential backoff retry
const retry = async <T>(fn: () => Promise<T>, retries = 2, delay = 1500): Promise<T> => {
    try {
        return await fn();
    } catch (error) {
        if (retries === 0) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
        return retry(fn, retries - 1, delay * 2);
    }
}

// Safety settings to prevent false positives on scientific data
const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// --- API-driven Analysis Functions ---

/**
 * Generates a full scientific interpretation based on all analysis results.
 */
export const generateFinalInterpretation = async (prompt: string): Promise<string> => {
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
                temperature: 0.4,
                topP: 0.95,
                topK: 64,
                maxOutputTokens: 8192, // Safe limit for flash model output
                safetySettings,
            }
        });
        return response.text as string;
    } catch (error: any) {
        console.error("Error generating final interpretation with Gemini API:", error);
        if (error.message && error.message.includes("API Key")) {
            throw error;
        }
        throw new Error(error.message || "The Gemini API call for interpretation failed.");
    }
};

/**
 * Generates a scientific methodology section.
 */
export const generateMethodology = async (prompt: string): Promise<string> => {
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
                temperature: 0.2,
                maxOutputTokens: 8192, 
                safetySettings,
            }
        });
        return response.text as string;
    } catch (error: any) {
        console.error("Error generating methodology with Gemini API:", error);
        if (error.message && error.message.includes("API Key")) {
            throw error;
        }
        throw new Error(error.message || "The Gemini API call for methodology failed.");
    }
};


/**
 * Uses the Gemini API to generate CCA (Canonical Correspondence Analysis) plot data.
 */
export const generateCCAPlotData = async (
    speciesData: SpeciesData[],
    siteData: SiteData
): Promise<{ species: CCACoordinates[]; vectors: CCACoordinates[]; varianceExplained?: [number, number] }> => {
    // Pre-filter data: A CCA requires that each plot has both species and environmental data.
    const siteDataPlots = new Set(Object.keys(siteData));
    const speciesDataPlots = new Set(speciesData.map(d => `${d['Tipo de vegetación']}-${d.Parcela}`));

    // Find the intersection of plots that have both types of data and where site data is not empty
    const commonPlots = new Set([...siteDataPlots].filter(plot => 
        speciesDataPlots.has(plot) && siteData[plot] && Object.keys(siteData[plot]).length > 0
    ));

    if (commonPlots.size < 2) {
        // Not enough data for a meaningful CCA, return an empty result.
        return { species: [], vectors: [], varianceExplained: [0, 0] };
    }

    // Create filtered datasets based on the common plots
    // NOTE: We do NOT filter species here. We send all species present in the common plots to ensure statistical rigor.
    const filteredSpeciesData = speciesData.filter(d => commonPlots.has(`${d['Tipo de vegetación']}-${d.Parcela}`));
    
    const filteredSiteData: SiteData = {};
    commonPlots.forEach(plotKey => {
        if (siteData[plotKey]) {
            filteredSiteData[plotKey] = siteData[plotKey];
        }
    });

    // Format the clean, filtered data for the prompt
    const speciesJson = formatSpeciesDataForJsonPrompt(filteredSpeciesData);
    const siteJson = formatSiteDataForJsonPrompt(filteredSiteData);

    const prompt = `
    As an expert quantitative ecologist, perform a Canonical Correspondence Analysis (CCA). 
    
    **CRITICAL INSTRUCTION:**
    Calculate using the **FULL dataset**, but keep the final JSON response highly compact and focused to prevent truncation or token limit errors.

    - **Input Species Data (JSON format: {"Site-Plot": ["Species A", ...]}):**
    ${speciesJson}

    - **Input Standardized Environmental Data (JSON format: {"Site-Plot": {"Factor1": z_score, ...}}):**
    ${siteJson}

    **Output Instructions:**
    1.  **Calculate Biplot Coordinates:** Based on ALL species and standardized environmental data.
    2.  **Output Structure:**
        -   **labeledSpecies:** Select ONLY the top 10 to 15 key species with the highest weight/abundance/relevance so they are clearly readable on the plot. Include "name", "x", "y".
        -   **unlabeledSpecies:** A single compact string containing coordinates for up to 30 representative remaining species separated by pipes and commas: "x1,y1|x2,y2|x3,y3...". Do NOT exceed 30 coordinates in this string. Do NOT use arrays or objects for this field.
        -   **vectors:** Vectors for environmental variables.
    3.  **Scale:** Properly scale for biplot. Round all coordinates to **2 decimal places** to minimize output token length.
    4.  **Variance:** Return variance explained by CCA1 and CCA2.
    5.  **Strict JSON Output.**

    JSON Schema:
    {
      "labeledSpecies": [{ "name": "string", "x": number, "y": number }],
      "unlabeledSpecies": "string", 
      "vectors": [{ "name": "string", "x": number, "y": number }],
      "varianceExplained": [number, number]
    }
    `;

    const ccaSchema = {
        type: Type.OBJECT,
        properties: {
            labeledSpecies: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                    },
                    required: ["name", "x", "y"],
                }
            },
            unlabeledSpecies: {
                type: Type.STRING,
                description: "A single string of coordinates separated by pipes: 'x1,y1|x2,y2|...'. Use 2 decimal places. Limit to max 30 points."
            },
            vectors: {
                type: Type.ARRAY,
                items: {
                    type: Type.OBJECT,
                    properties: {
                        name: { type: Type.STRING },
                        x: { type: Type.NUMBER },
                        y: { type: Type.NUMBER },
                    },
                     required: ["name", "x", "y"],
                }
            },
            varianceExplained: {
                type: Type.ARRAY,
                description: "Percentage of variance explained by the first two CCA axes, e.g., [25.3, 15.1].",
                items: {
                    type: Type.NUMBER,
                },
            },
        },
        propertyOrdering: ["labeledSpecies", "unlabeledSpecies", "vectors", "varianceExplained"],
    };

    return retry(async () => {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: 'gemini-3.5-flash',
            contents: prompt,
            config: {
                responseMimeType: 'application/json',
                responseSchema: ccaSchema,
                temperature: 0, 
                seed: 42,
                maxOutputTokens: 8192,
                safetySettings,
            }
        });
        
        let jsonStr = (response.text || '').trim();
        
        // Robust extraction of JSON object
        const firstOpen = jsonStr.indexOf('{');
        const lastClose = jsonStr.lastIndexOf('}');
        
        if (firstOpen !== -1 && lastClose !== -1) {
            jsonStr = jsonStr.substring(firstOpen, lastClose + 1);
        } else if (jsonStr.startsWith("```json")) {
            jsonStr = jsonStr.substring(7, jsonStr.length - 3).trim();
        }

        jsonStr = cleanJsonString(jsonStr);
        
        let parsed: any;
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            console.error("JSON Parse Error, trying repair:", e, jsonStr.substring(0, 100));
            try {
                const repaired = repairTruncatedJson(jsonStr);
                parsed = JSON.parse(repaired);
            } catch (e2) {
                console.error("JSON repair failed, extracting via regex fallback:", e2);
                parsed = extractCcaDataWithRegex(jsonStr);
            }
        }

        // Transform string unlabeledSpecies "x1,y1|x2,y2..." to object format
        const unlabeledPoints: CCACoordinates[] = [];
        const rawString = parsed.unlabeledSpecies || "";
        
        if (typeof rawString === 'string' && rawString.length > 0) {
            // Remove any whitespace that might have crept in
            const cleanString = rawString.replace(/\s/g, '');
            const pairs = cleanString.split('|');
            for (const pair of pairs) {
                const coords = pair.split(',');
                if (coords.length === 2) {
                    const x = parseFloat(coords[0]);
                    const y = parseFloat(coords[1]);
                    if (!isNaN(x) && !isNaN(y)) {
                        unlabeledPoints.push({
                            name: "",
                            x: x,
                            y: y,
                            isBackground: true
                        });
                    }
                }
            }
        }

        // Merge labeled and unlabeled species into a single array for the frontend
        const allSpecies: CCACoordinates[] = [
            ...(parsed.labeledSpecies || []),
            ...unlabeledPoints
        ];

        return {
            species: allSpecies,
            vectors: parsed.vectors || [],
            varianceExplained: parsed.varianceExplained || [0, 0]
        };
    });
};
