import {
    Document,
    Packer,
    Paragraph,
    HeadingLevel,
    AlignmentType,
    convertInchesToTwip,
    LevelFormat,
} from 'docx';
import saveAs from 'file-saver';

/**
 * Parses the dynamic AI-generated text into formatted Paragraph objects for the DOCX file.
 * Handles markdown for main titles (###), subtitles (1.), and bullet points (* or -).
 * @param text The raw string from the Gemini API.
 * @returns An array of Paragraph objects.
 */
const parseAiResponseToParagraphs = (text: string): Paragraph[] => {
    if (!text) return [];

    const paragraphs: Paragraph[] = [];
    const lines = text.split('\n');

    for (const line of lines) {
        let cleanLine = line.trim();
        
        if (cleanLine === '' || cleanLine.startsWith('---') || cleanLine.startsWith('___')) {
            continue;
        }

        cleanLine = cleanLine.replace(/\*\*/g, '').replace(/\*/g, '');

        if (cleanLine.startsWith('### ')) {
            paragraphs.push(new Paragraph({
                text: cleanLine.replace(/###\s*(\d+\.\s*)?/, ''), // Remove markdown and optional numbering
                style: 'heading2',
            }));
        } else if (/^\d+\.\s.*/.test(cleanLine)) {
            paragraphs.push(new Paragraph({
                text: cleanLine,
                style: 'heading3',
            }));
        } else if (cleanLine.startsWith('* ') || cleanLine.startsWith('- ')) {
             paragraphs.push(new Paragraph({
                text: cleanLine.substring(2),
                numbering: { reference: 'default-bullet-points', level: 0 },
                style: 'bulletstyle',
            }));
        } else {
            paragraphs.push(new Paragraph({
                text: cleanLine,
                style: 'normal',
            }));
        }
    }
    return paragraphs;
};

/**
 * Creates the base configuration for a DOCX document, including styles and numbering.
 * @returns A configuration object for the docx Document constructor.
 */
const createDocumentBase = () => ({
    styles: {
        paragraphStyles: [
            { id: 'heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Times New Roman', size: 22, bold: true, color: '000000' }, paragraph: { alignment: AlignmentType.LEFT, spacing: { after: 120 } } },
            { id: 'heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Times New Roman', size: 22, bold: true, color: '000000' }, paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 240, after: 120 } } },
            { id: 'heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Times New Roman', size: 22, italics: true, color: '000000' }, paragraph: { alignment: AlignmentType.LEFT, spacing: { before: 120, after: 60 } } },
            { id: 'normal', name: 'Normal', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Times New Roman', size: 22, color: '000000' }, paragraph: { alignment: AlignmentType.JUSTIFIED, indent: { firstLine: convertInchesToTwip(0.2) }, spacing: { after: 100 } } },
            { id: 'bulletstyle', name: 'Bullet Style', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: 'Times New Roman', size: 22, color: '000000' }, paragraph: { alignment: AlignmentType.JUSTIFIED } },
        ],
    },
    numbering: {
        config: [{
            reference: 'default-bullet-points',
            // FIX: Use LevelFormat.BULLET instead of the string 'bullet' to match the expected type.
            levels: [{ level: 0, format: LevelFormat.BULLET, text: '\u2022', alignment: AlignmentType.LEFT, style: { paragraph: { indent: { left: convertInchesToTwip(0.25), hanging: convertInchesToTwip(0.25) } } } }],
        }],
    },
});

/**
 * Generates and triggers the download of a .docx file for the Methodology section.
 * @param methodologyText The dynamic AI-generated methodology.
 * @param t The translation function/object.
 */
export const generateMethodologyDocx = async (methodologyText: string, t: any) => {
    const doc = new Document({
        ...createDocumentBase(),
        sections: [{
            children: [
                new Paragraph({ text: t.methodologySectionTitle, style: 'heading1' }),
                ...parseAiResponseToParagraphs(methodologyText),
            ],
        }],
    });

    try {
        const blob = await Packer.toBlob(doc);
        const filename = t.methodologyDocxFilename;
        saveAs(blob, filename);
    } catch (error) {
        console.error("Error generating Methodology DOCX file:", error);
        throw new Error("Could not generate the Methodology Word document.");
    }
};

/**
 * Generates and triggers the download of a .docx file for the Interpretation section.
 * @param interpretationText The dynamic AI-generated interpretation.
 * @param t The translation function/object.
 */
export const generateInterpretationDocx = async (interpretationText: string, t: any) => {
    const doc = new Document({
        ...createDocumentBase(),
        sections: [{
            children: [
                new Paragraph({ text: t.interpretationSectionTitle, style: 'heading1' }),
                ...parseAiResponseToParagraphs(interpretationText),
            ],
        }],
    });

    try {
        const blob = await Packer.toBlob(doc);
        const filename = t.interpretationDocxFilename;
        saveAs(blob, filename);
    } catch (error) {
        console.error("Error generating Interpretation DOCX file:", error);
        throw new Error("Could not generate the Interpretation Word document.");
    }
};