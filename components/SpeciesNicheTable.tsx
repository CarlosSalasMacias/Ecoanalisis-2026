import React, { useRef, useState } from 'react';
import { SiteNicheData, SingleNicheData } from '../types';
import { LineChartIcon, ExportIcon } from './Icons';
import { useTranslations } from '../translations';
import { palettes, PaletteName, hexToRgb } from './palettes';

// Helper to trigger SVG download
const exportSVG = (svgEl: SVGSVGElement | null, filename: string) => {
    if (!svgEl) return;
    
    // Clone the SVG element to avoid modifying the one in the DOM
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;

    // Add inline styles to SVG elements for export because classes are not carried over
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


const exportDataToCSV = (data: (string|number|null|undefined)[][], filename: string) => {
    const escapeCSVCell = (cell: any) => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const csvContent = data.map(row => row.map(escapeCSVCell).join(',')).join('\r\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

// --- Heatmap Component ---
// Linear interpolation for color gradients
const interpolateColor = (value: number, palette: [number, number, number][]): string => {
    if (isNaN(value) || value < 0) return '#f3f4f6';
    const numStops = palette.length - 1;
    const scaledValue = value * numStops;
    const startIndex = Math.min(Math.floor(scaledValue), numStops - 1);
    const endIndex = Math.min(startIndex + 1, numStops);
    const t = scaledValue - startIndex;

    const startColor = palette[startIndex];
    const endColor = palette[endIndex];

    const r = Math.round(startColor[0] + t * (endColor[0] - startColor[0]));
    const g = Math.round(startColor[1] + t * (endColor[1] - startColor[1]));
    const b = Math.round(startColor[2] + t * (endColor[2] - startColor[2]));
    
    return `rgb(${r},${g},${b})`;
};

const NicheHeatmap: React.FC<{ data: SingleNicheData }> = ({ data }) => {
    const t = useTranslations();
    const svgRef = useRef<SVGSVGElement>(null);
    const [activePalette, setActivePalette] = useState<PaletteName>('Viridis');

    const species = Object.keys(data).sort();
    if (species.length === 0) return null;
    const factors = Object.keys(data[species[0]] || {}).sort();
    if (factors.length === 0) return null;

    const PADDING_LEFT = 180;
    const PADDING_TOP = 120;
    const PADDING_RIGHT = 20;
    const LEGEND_WIDTH = 80;
    const PADDING_BOTTOM = 20;
    const CELL_WIDTH = 100;
    const CELL_HEIGHT = 40;
    
    const WIDTH = PADDING_LEFT + factors.length * CELL_WIDTH + PADDING_RIGHT + LEGEND_WIDTH;
    const HEIGHT = PADDING_TOP + species.length * CELL_HEIGHT + PADDING_BOTTOM;

    // Normalize data for each factor (column)
    const factorStats: { [factor: string]: { min: number; max: number } } = {};
    factors.forEach(factor => {
        const values = species
            .map(s => data[s][factor])
            .filter(v => typeof v === 'number') as number[];
        
        if (values.length > 0) {
            factorStats[factor] = {
                min: Math.min(...values),
                max: Math.max(...values),
            };
        }
    });

    const getTextColorForBg = (bgColor: string): string => {
        const rgb = bgColor.replace(/[^\d,]/g, '').split(',').map(Number);
        const brightness = Math.round(((rgb[0] * 299) + (rgb[1] * 587) + (rgb[2] * 114)) / 1000);
        return (brightness > 125) ? 'black' : 'white';
    };
    
    const rgbPalette = palettes[activePalette].map(hexToRgb);

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h4 className="text-lg font-semibold text-secondary">{t.heatmapTitle}</h4>
                <div className="flex items-center space-x-2">
                     <label htmlFor="heatmap-palette-select" className="text-sm font-medium text-gray-700 whitespace-nowrap">{t.palette}</label>
                    <select
                        id="heatmap-palette-select"
                        value={activePalette}
                        onChange={(e) => setActivePalette(e.target.value as PaletteName)}
                        className="block w-full pl-3 pr-8 py-1.5 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md shadow-sm"
                        aria-label={t.selectPalette}
                    >
                        {Object.keys(palettes).map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                    </select>
                    <button onClick={() => exportSVG(svgRef.current, 'niche-heatmap.svg')} className="flex items-center bg-white hover:bg-gray-100 text-gray-700 font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors duration-200 text-sm border border-gray-300" title={t.exportSVGTooltip}>
                        <ExportIcon className="h-4 w-4 mr-2"/>
                        SVG
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto bg-white rounded-lg shadow border">
                <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto min-w-[600px]" aria-label="Heatmap of species environmental niches">
                    {/* Column Headers - Robust positioning */}
                    {factors.map((factor, i) => {
                        const x = PADDING_LEFT + (i * CELL_WIDTH) + (CELL_WIDTH / 2);
                        const y = PADDING_TOP - 15;
                        return (
                             <text
                                key={factor}
                                x={x}
                                y={y}
                                textAnchor="start"
                                fontSize="12"
                                transform={`rotate(-65, ${x}, ${y})`}
                                className="font-semibold"
                            >
                                {/* FIX: Use the new header function from the translation hook */}
                                {t.header(factor)}
                            </text>
                        )
                    })}

                    {/* Row Headers */}
                    {species.map((s, i) => (
                        <text
                            key={s}
                            x={PADDING_LEFT - 10}
                            y={PADDING_TOP + (i + 0.5) * CELL_HEIGHT}
                            textAnchor="end"
                            alignmentBaseline="middle"
                            fontSize="12"
                            className="italic"
                        >
                            {s}
                        </text>
                    ))}

                    {/* Cells */}
                    {species.map((s, i) =>
                        factors.map((factor, j) => {
                            const value = data[s][factor];
                            let cellColor = '#f3f4f6'; // Gray for N/A
                           
                            if (typeof value === 'number' && factorStats[factor]) {
                                const { min, max } = factorStats[factor];
                                const normalizedValue = max === min ? 0.5 : (value - min) / (max - min);
                                cellColor = interpolateColor(normalizedValue, rgbPalette);
                            }
                            const textColor = getTextColorForBg(cellColor);
                            
                            return (
                                <g key={`${s}-${factor}`} className="group">
                                    {/* FIX: Use the new header function from the translation hook */}
                                    <title>{`${s} - ${t.header(factor)}: ${value}`}</title>
                                    <rect
                                        x={PADDING_LEFT + j * CELL_WIDTH}
                                        y={PADDING_TOP + i * CELL_HEIGHT}
                                        width={CELL_WIDTH}
                                        height={CELL_HEIGHT}
                                        fill={cellColor}
                                        stroke="white"
                                        strokeWidth="1"
                                    />
                                    <text
                                        x={PADDING_LEFT + (j + 0.5) * CELL_WIDTH}
                                        y={PADDING_TOP + (i + 0.5) * CELL_HEIGHT}
                                        textAnchor="middle"
                                        alignmentBaseline="middle"
                                        fontSize="12"
                                        fill={textColor}
                                        className="font-normal"
                                    >
                                        {value}
                                    </text>
                                </g>
                            );
                        })
                    )}
                    
                    {/* Legend on the right */}
                    <g transform={`translate(${WIDTH - PADDING_RIGHT - LEGEND_WIDTH + 20}, ${PADDING_TOP})`}>
                        <defs>
                            <linearGradient id={`heatmap-gradient-${activePalette}`} x1="0%" y1="100%" x2="0%" y2="0%">
                                {rgbPalette.map((color, index, arr) => (
                                    <stop 
                                      key={index} 
                                      offset={`${index / (arr.length - 1) * 100}%`} 
                                      stopColor={`rgb(${color.join(',')})`} 
                                    />
                                ))}
                            </linearGradient>
                        </defs>
                        <text x="10" y="-5" fontSize="12" textAnchor="middle" className="font-semibold">{t.legendValue}</text>
                        <rect 
                            x="0" 
                            y="0"
                            width="20" 
                            height={species.length * CELL_HEIGHT} 
                            fill={`url(#heatmap-gradient-${activePalette})`} 
                        />
                        <text x="25" y={species.length * CELL_HEIGHT} fontSize="11">{t.legendLow}</text>
                        <text x="25" y="10" fontSize="11">{t.legendHigh}</text>
                    </g>

                </svg>
            </div>
        </div>
    );
};

interface SpeciesNicheTableProps {
  nicheData: SiteNicheData;
}

const SpeciesNicheTable: React.FC<SpeciesNicheTableProps> = ({ nicheData }) => {
  const t = useTranslations();
  const [selectedSite, setSelectedSite] = useState('General');
  
  const siteOptions = Object.keys(nicheData).sort((a, b) => a === 'General' ? -1 : b === 'General' ? 1 : a.localeCompare(b));
  const currentData = nicheData[selectedSite] || {};

  const species = Object.keys(currentData).sort();
  const factors = species.length > 0 ? Object.keys(currentData[species[0]] || {}).sort() : [];
  
  const handleExport = () => {
    // FIX: Use the new header function from the translation hook
    const headers = [t.speciesColumn, ...factors.map(f => t.header(f))];
    const rows = species.map(s => [s, ...factors.map(f => currentData[s][f])]);
    const dataForCSV = [headers, ...rows];
    exportDataToCSV(dataForCSV, `environmental-niche-analysis-${selectedSite}.csv`);
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
            <h3 className="text-xl font-bold text-primary flex items-center">
                <LineChartIcon className="h-5 w-5 mr-2" /> {t.nicheAnalysisTitle}
            </h3>
             <div className="flex items-center space-x-2">
                <label htmlFor="site-select-niche" className="text-sm font-medium text-gray-700">{t.selectSiteNiche}</label>
                <select 
                    id="site-select-niche"
                    value={selectedSite}
                    onChange={e => setSelectedSite(e.target.value)}
                    className="p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                >
                    {siteOptions.map(site => <option key={site} value={site}>{site}</option>)}
                </select>
            </div>
        </div>
        <p className="mb-4 text-gray-600" dangerouslySetInnerHTML={{ __html: t.nicheAnalysisDescription }} />
      </div>
      
      {species.length > 0 && factors.length > 0 ? (
        <>
            <div className="space-y-2">
                <div className="flex justify-between items-center">
                    <h4 className="text-lg font-semibold text-secondary">{t.nicheDataTableTitle}</h4>
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
                        <th scope="col" className="p-3 font-semibold sticky left-0 bg-gray-100 z-10">{t.speciesColumn}</th>
                        {factors.map(factor => (
                            <th key={factor} scope="col" className="p-3 font-semibold text-center whitespace-nowrap">
                            {/* FIX: Use the new header function from the translation hook */}
                            {t.header(factor)}
                            </th>
                        ))}
                        </tr>
                    </thead>
                    <tbody>
                        {species.map(specie => (
                        <tr key={specie} className="bg-white border-b hover:bg-gray-50">
                            <td className="p-3 font-medium text-gray-900 sticky left-0 bg-white z-10 whitespace-nowrap italic">{specie}</td>
                            {factors.map(factor => (
                            <td key={factor} className="p-3 text-center font-mono">
                                {currentData[specie][factor]}
                            </td>
                            ))}
                        </tr>
                        ))}
                    </tbody>
                    </table>
                </div>
            </div>
            <NicheHeatmap data={currentData} />
        </>
      ) : (
        <p className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm">
            {t.noDataForSite}
        </p>
      )}
    </div>
  );
};

export default SpeciesNicheTable;