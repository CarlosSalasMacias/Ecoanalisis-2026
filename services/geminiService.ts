
import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';

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
