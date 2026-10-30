import React, { useRef, useState } from 'react';
import { StructuralAnalysisResult, FullStructuralAnalysis } from '../types';
import { TreeIcon, ExportIcon } from './Icons';
import { useTranslations } from '../translations';
import StandCharacteristicsTable from './StandCharacteristicsTable';
import { palettes, PaletteName } from './palettes';

// Helper to trigger SVG download
const exportSVG = (svgEl: SVGSVGElement | null, filename: string) => {
    if (!svgEl) return;
    
    // Clone the SVG element to avoid modifying the one in the DOM
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;

    // Add inline styles for export
    const style = document.createElement('style');
    style.textContent = `
        .font-semibold { font-weight: 600; }
        .font-normal { font-weight: 400; }
        .italic { font-style: italic; }
        text { font-family: sans-serif; }
    `;
    svgClone.insertBefore(style, svgClone.firstChild);
    
    const svgData = new XMLSerializer().serializeToString(svgClone);
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

const exportDataToCSV = (data: (string|number)[][], filename: string) => {
    const escapeCSVCell = (cell: any) => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const csvContent = data.map(row => row.map(escapeCSVCell).join(',')).join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// --- IVI Chart Component ---
const IVIChart: React.FC<{ data: StructuralAnalysisResult }> = ({ data }) => {
    const t = useTranslations();
    const svgRef = useRef<SVGSVGElement>(null);
    const [activePalette, setActivePalette] = useState<PaletteName>('Viridis');
    const sortedSpecies = Object.keys(data).sort((a, b) => data[b].ivi100 - data[a].ivi100);

    if (sortedSpecies.length === 0) return null;

    const PADDING_LEFT = 200;
    const PADDING_TOP = 40;
    const PADDING_RIGHT = 20;
    const PADDING_BOTTOM = 20;
    const BAR_HEIGHT = 20;
    const BAR_GAP = 5;

    const maxIvi = Math.max(...sortedSpecies.map(s => data[s].ivi100), 0);
    
    const CHART_WIDTH = 800;
    const CHART_HEIGHT = PADDING_TOP + sortedSpecies.length * (BAR_HEIGHT + BAR_GAP) + PADDING_BOTTOM;

    const xScale = (value: number) => {
        const plotAreaWidth = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;
        return PADDING_LEFT + (value / (maxIvi > 0 ? maxIvi : 1)) * plotAreaWidth;
    };
    
    const handleExportChart = () => {
        exportSVG(svgRef.current, 'ivi-chart.svg');
    };

    const currentPaletteColors = palettes[activePalette];

    return (
        <div className="mt-8">
             <div className="flex justify-between items-center mb-2">
                <h4 className="text-lg font-semibold text-secondary">{t.iviChartTitle}</h4>
                 <div className="flex items-center space-x-2">
                    <label htmlFor="ivi-palette-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">{t.palette}</label>
                    <select
                        id="ivi-palette-select"
                        value={activePalette}
                        onChange={(e) => setActivePalette(e.target.value as PaletteName)}
                        className="block w-full pl-3 pr-8 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md shadow-sm"
                        aria-label="Select color palette for the IVI chart"
                    >
                        {Object.keys(palettes).map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <button 
                        onClick={handleExportChart} 
                        className="flex items-center bg-white hover:bg-gray-100 text-gray-700 font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors duration-200 text-sm border border-gray-300" 
                        title={t.exportSVGTooltip}
                    >
                        <ExportIcon className="h-4 w-4 mr-2"/>
                        SVG
                    </button>
                </div>
            </div>
             <div className="overflow-x-auto bg-white rounded-lg shadow border">
                <svg ref={svgRef} viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`} className="w-full h-auto min-w-[600px]">
                     {/* X-Axis Ticks and Grid Lines */}
                    {Array.from({ length: Math.ceil(maxIvi / 4) + 1 }).map((_, i) => {
                        const tickValue = i * 4;
                        if (tickValue > maxIvi + 2) return null;
                        const x = xScale(tickValue);
                        return (
                            <g key={tickValue}>
                                <line x1={x} y1={PADDING_TOP - 5} x2={x} y2={CHART_HEIGHT - PADDING_BOTTOM} stroke="#e5e7eb" strokeWidth="1" />
                                <text x={x} y={PADDING_TOP - 10} textAnchor="middle" fontSize="10" fill="#6b7280">{tickValue}</text>
                            </g>
                        );
                    })}
                     <text x={(CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT) / 2 + PADDING_LEFT} y={15} textAnchor="middle" fontSize="12" fill="#374151" className="font-semibold">{t.iviChartYAxis}</text>

                    {/* Bars and Labels */}
                    {sortedSpecies.map((species, i) => {
                        const y = PADDING_TOP + i * (BAR_HEIGHT + BAR_GAP);
                        const barWidth = xScale(data[species].ivi100) - PADDING_LEFT;
                        const color = currentPaletteColors[i % currentPaletteColors.length];
                        const displayName = species;
                        
                        return (
                            <g key={species}>
                                <text x={PADDING_LEFT - 10} y={y + BAR_HEIGHT / 2} textAnchor="end" alignmentBaseline="middle" fontSize="11" className="italic">{displayName}</text>
                                <rect 
                                    x={PADDING_LEFT} 
                                    y={y} 
                                    width={barWidth > 0 ? barWidth : 0} 
                                    height={BAR_HEIGHT} 
                                    fill={color}
                                >
                                     <title>{`${species}: IVI = ${data[species].ivi100}`}</title>
                                </rect>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </div>
    );
};


interface StructuralAnalysisTableProps {
  analysisData: FullStructuralAnalysis;
}

const StructuralAnalysisTable: React.FC<StructuralAnalysisTableProps> = ({ analysisData }) => {
    const t = useTranslations();
    const [selectedSite, setSelectedSite] = useState('General');
    const [excludeCrops, setExcludeCrops] = useState(false);

    const { stand, cropSpecies = [], basalAreaSources = {} } = analysisData;
    const ivi = excludeCrops ? analysisData.iviWithoutCrops : analysisData.ivi;

    const siteOptions = Object.keys(ivi).sort((a, b) => a === 'General' ? -1 : b === 'General' ? 1 : a.localeCompare(b));
    const currentData = ivi[selectedSite] || {};
    const species = Object.keys(currentData).sort((a, b) => currentData[b].ivi100 - currentData[a].ivi100);
    
    const handleExport = () => {
        const headers = [
            t.speciesColumn,
            t.absAbundance, t.relAbundance,
            t.absFrequency, t.relFrequency,
            t.absDominance, t.relDominance,
            t.iviBase300, t.iviBase100
        ];
        const rows = species.map(s => {
            const data = currentData[s];
            return [
                s,
                data.abundanceAbs, data.abundanceRel,
                data.frequencyAbs, data.frequencyRel,
                data.dominanceAbs, data.dominanceRel,
                data.ivi300, data.ivi100
            ];
        });
        const dataForCSV = [headers, ...rows];
        exportDataToCSV(dataForCSV, `forest-structural-analysis-${selectedSite}${excludeCrops ? '-sin-cultivo' : ''}`);
    };

    return (
        <div className="space-y-6">
            <div>
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <h3 className="text-xl font-bold text-primary flex items-center">
                        <TreeIcon className="h-5 w-5 mr-2" /> {t.structuralAnalysisTitle}
                    </h3>
                     <div className="flex items-center space-x-2">
                        <label htmlFor="site-select-ivi" className="text-sm font-medium text-gray-700">{t.selectSite}</label>
                        <select 
                            id="site-select-ivi"
                            value={selectedSite}
                            onChange={e => setSelectedSite(e.target.value)}
                            className="p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                        >
                            {siteOptions.map(site => <option key={site} value={site}>{site}</option>)}
                        </select>
                    </div>
                </div>
                <p className="mb-4 text-gray-600">{t.structuralAnalysisDescription}</p>
                <div className="p-3 bg-gray-50 border rounded-md text-sm space-y-2">
                    <label className="flex items-center gap-2 font-medium text-gray-800">
                        <input type="checkbox" checked={excludeCrops} onChange={e => setExcludeCrops(e.target.checked)} disabled={cropSpecies.length === 0} />
                        {t.excludeCropsFromIVI}
                    </label>
                    <p className="text-gray-600">
                        {cropSpecies.length > 0
                            ? <>{t.cropSpeciesDetected} <span className="italic">{cropSpecies.join(', ')}</span>.</>
                            : t.noCropSpeciesDetected}{' '}{t.cropColumnHelp}
                    </p>
                    {((basalAreaSources['D30'] ?? 0) > 0 || (basalAreaSources['D15'] ?? 0) > 0 || (basalAreaSources['ninguno'] ?? 0) > 0) && (
                        <p className="text-amber-800">
                            {t.basalAreaSourcesNote
                                .replace('{dap}', String(basalAreaSources['DAP'] ?? 0))
                                .replace('{d30}', String(basalAreaSources['D30'] ?? 0))
                                .replace('{d15}', String(basalAreaSources['D15'] ?? 0))
                                .replace('{none}', String(basalAreaSources['ninguno'] ?? 0))}
                        </p>
                    )}
                </div>
            </div>

            <StandCharacteristicsTable data={stand} />
            
            {species.length > 0 ? (
                <div className="space-y-4">
                    <div className="flex justify-between items-center">
                        <h4 className="text-lg font-semibold text-secondary">{excludeCrops ? t.iviTitleWithoutCrops : t.iviTitleAll}</h4>
                         <button
                            onClick={handleExport}
                            className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors duration-200 text-sm"
                        >
                            <ExportIcon className="h-4 w-4 mr-2"/>
                            {t.exportTableCSV}
                        </button>
                    </div>
                    <div className="overflow-x-auto bg-white rounded-lg shadow">
                        <table className="min-w-full text-sm text-left text-gray-600">
                            <thead className="bg-gray-100 text-xs text-gray-700 uppercase tracking-wider">
                                <tr>
                                    <th scope="col" rowSpan={2} className="p-3 font-semibold align-bottom border-b-2 border-gray-200 sticky left-0 bg-gray-100 z-10">{t.speciesColumn}</th>
                                    <th scope="col" colSpan={2} className="p-3 font-semibold text-center border-b-2 border-gray-200">{t.abundance}</th>
                                    <th scope="col" colSpan={2} className="p-3 font-semibold text-center border-b-2 border-gray-200">{t.frequency}</th>
                                    <th scope="col" colSpan={2} className="p-3 font-semibold text-center border-b-2 border-gray-200">{t.dominance}</th>
                                    <th scope="col" colSpan={2} className="p-3 font-semibold text-center border-b-2 border-gray-200">{t.ivi}</th>
                                </tr>
                                <tr>
                                    <th scope="col" className="p-3 font-semibold text-center bg-gray-50">{t.abs}</th>
                                    <th scope="col" className="p-3 font-semibold text-center bg-gray-50">{t.rel}</th>
                                    <th scope="col" className="p-3 font-semibold text-center bg-gray-50">{t.abs}</th>
                                    <th scope="col" className="p-3 font-semibold text-center bg-gray-50">{t.rel}</th>
                                    <th scope="col" className="p-3 font-semibold text-center bg-gray-50">{t.absCm}</th>
                                    <th scope="col" className="p-3 font-semibold text-center bg-gray-50">{t.rel}</th>
                                    <th scope="col" className="p-3 font-semibold text-center bg-gray-50">{t.base300}</th>
                                    <th scope="col" className="p-3 font-semibold text-center bg-gray-50">{t.base100}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {species.map(s => {
                                    const data = currentData[s];
                                    return (
                                        <tr key={s} className="bg-white border-b hover:bg-gray-50">
                                            <td className="p-3 font-medium text-gray-900 sticky left-0 bg-white z-10 whitespace-nowrap italic">{s}</td>
                                            <td className="p-3 text-center font-mono">{data.abundanceAbs}</td>
                                            <td className="p-3 text-center font-mono">{data.abundanceRel}</td>
                                            <td className="p-3 text-center font-mono">{data.frequencyAbs}</td>
                                            <td className="p-3 text-center font-mono">{data.frequencyRel}</td>
                                            <td className="p-3 text-center font-mono">{data.dominanceAbs}</td>
                                            <td className="p-3 text-center font-mono">{data.dominanceRel}</td>
                                            <td className="p-3 text-center font-bold bg-gray-50 font-mono">{data.ivi300}</td>
                                            <td className="p-3 text-center font-bold text-primary bg-blue-50 font-mono">{data.ivi100}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                     <IVIChart data={currentData} />
                </div>
            ) : (
                 <p className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm">
                    {t.noDataForSite}
                </p>
            )}
        </div>
    );
};

export default StructuralAnalysisTable;