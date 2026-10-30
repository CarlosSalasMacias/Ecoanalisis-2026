

import React, { useState, useRef } from 'react';
import { SiteDiversityResults, DiversityIndices } from '../types';
import { useTranslations } from '../translations';
import { PieChartIcon, ExportIcon } from './Icons';

// --- Plotting and Export Utilities ---
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

const palettes = {
    Viridis: ['#440154', '#3b528b', '#21918c', '#5dc863', '#fde725'],
    YlGn: ['#ffffd9', '#c7e9b4', '#74c476', '#238b45', '#005a32'],
    YlGnBu: ['#ffffd9', '#c7e9b4', '#41b6c4', '#225ea8', '#081d58'],
    Blues: ['#f7fbff', '#deebf7', '#9ecae1', '#3182bd', '#08519c'],
    BrBG: ['#8c510a', '#d8b365', '#f6e8c3', '#c7eae5', '#5ab4ac', '#01665e'],
    RdBu: ['#b2182b', '#ef8a62', '#fddbc7', '#d1e5f0', '#67a9cf', '#2166ac'],
    PiYG: ['#c51b7d', '#e9a3c9', '#fde0ef', '#e6f5d0', '#a1d76a', '#4d9221'],
    Paired: ['#a6cee3', '#1f78b4', '#b2df8a', '#33a02c', '#fb9a99', '#e31a1c', '#fdbf6f', '#ff7f00', '#cab2d6', '#6a3d9a'],
    Set2: ['#66c2a5', '#fc8d62', '#8da0cb', '#e78ac3', '#a6d854', '#ffd92f', '#e5c494', '#b3b3b3'],
    Tableau10: ['#4e79a7', '#f28e2c', '#e15759', '#76b7b2', '#59a14f', '#edc949', '#af7aa1', '#ff9da7', '#9c755f', '#bab0ab'],
    Greyscale: ['#000000', '#525252', '#737373', '#969696', '#bdbdbd', '#d9d9d9', '#f0f0f0'],
};
type PaletteName = keyof typeof palettes;

const handleExport = (format: 'svg' | 'png', svgRef: React.RefObject<SVGSVGElement>, filename: string) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const style = document.createElement('style');
    style.textContent = `
        .font-semibold { font-weight: 600; }
        .italic { font-style: italic; }
        text { font-family: sans-serif; }
    `;
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
    svgClone.insertBefore(style, svgClone.firstChild);

    const svgData = new XMLSerializer().serializeToString(svgClone);

    if (format === 'svg') {
        const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${filename}.svg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } else if (format === 'png') {
        const canvas = document.createElement('canvas');
        const svgSize = svgEl.getBoundingClientRect();
        const scale = 2; // For higher resolution
        canvas.width = svgSize.width * scale;
        canvas.height = svgSize.height * scale;
        const ctx = canvas.getContext('2d');
        if (!ctx) return;

        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const img = new Image();
        img.onload = () => {
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            const pngUrl = canvas.toDataURL('image/png');
            const link = document.createElement('a');
            link.href = pngUrl;
            link.download = `${filename}.png`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        };
        img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
    }
};


// --- Diversity Scatter Plot Component ---

interface DiversityScatterPlotProps {
  data: SiteDiversityResults;
  selectedIndex: keyof DiversityIndices;
  palette: PaletteName;
  svgRef: React.RefObject<SVGSVGElement>;
  pointSize: number;
}

const DiversityScatterPlot: React.FC<DiversityScatterPlotProps> = ({ data, selectedIndex, palette, svgRef, pointSize }) => {
    const t = useTranslations();
    const sites = Object.keys(data).sort();
    const values = sites.map(site => data[site][selectedIndex]);

    const PADDING = { top: 40, right: 20, bottom: 120, left: 60 };
    const WIDTH = 800;
    const HEIGHT = 400;
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

    const yMin = Math.min(0, ...values);
    const yMax = Math.max(...values) * 1.1;

    const step = plotWidth / (sites.length);
    const xScale = (index: number) => PADDING.left + step * (index + 0.5);
    const yScale = (value: number) => PADDING.top + plotHeight - ((value - yMin) / (yMax - yMin)) * plotHeight;
    
    const colors = palettes[palette];

    const indexLabels: Record<keyof DiversityIndices, string> = {
        shannon: t.shannonIndex,
        simpsonDominance: t.simpsonDominanceIndex,
        pielouEvenness: t.pielouEvennessIndex,
        margalefRichness: t.margalefRichnessIndex,
        chao1: t.chao1Index,
    };
    
    return (
        <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto bg-white rounded-lg shadow border">
            {/* Title */}
            <text x={WIDTH / 2} y={PADDING.top / 2 + 5} textAnchor="middle" fontSize="14" className="font-semibold">{`${indexLabels[selectedIndex]}`}</text>
            
            {/* Y-Axis */}
            <line x1={PADDING.left} y1={PADDING.top} x2={PADDING.left} y2={HEIGHT - PADDING.bottom} stroke="#9ca3af" />
            {Array.from({length: 6}).map((_, i) => {
                const value = yMin + i * (yMax - yMin) / 5;
                const y = yScale(value);
                return (
                     <g key={i}>
                        <line x1={PADDING.left - 5} y1={y} x2={PADDING.left} y2={y} stroke="#9ca3af" />
                        <text x={PADDING.left - 10} y={y + 3} textAnchor="end" fontSize="10">{value.toFixed(2)}</text>
                    </g>
                );
            })}
             <text transform={`rotate(-90, ${PADDING.left / 3}, ${HEIGHT / 2})`} x={PADDING.left/3} y={HEIGHT/2} textAnchor="middle" fontSize="12">{t.indexValue}</text>

            {/* X-Axis */}
            <line x1={PADDING.left} y1={HEIGHT - PADDING.bottom} x2={WIDTH - PADDING.right} y2={HEIGHT - PADDING.bottom} stroke="#9ca3af" />
            {sites.map((site, i) => {
                 const x = xScale(i);
                 return (
                    <g key={site}>
                        <line x1={x} y1={HEIGHT - PADDING.bottom} x2={x} y2={HEIGHT - PADDING.bottom + 5} stroke="#9ca3af" />
                        <text
                            transform={`translate(${x}, ${HEIGHT - PADDING.bottom + 15}) rotate(-65)`}
                            textAnchor="end"
                            fontSize="10"
                        >
                            {site}
                        </text>
                    </g>
                 )
            })}
            <text x={WIDTH/2} y={HEIGHT - 15} textAnchor="middle" fontSize="12">{t.siteColumn}</text>

            {/* Data Points */}
            {sites.map((site, i) => (
                <circle key={site} cx={xScale(i)} cy={yScale(values[i])} r={pointSize} fill={colors[i % colors.length]} stroke="white" strokeWidth="1">
                    <title>{`${site}: ${values[i]}`}</title>
                </circle>
            ))}
        </svg>
    );
}

// --- Main Table Component ---

interface DiversityIndicesTableProps {
  diversityData: SiteDiversityResults;
}

const DiversityIndicesTable: React.FC<DiversityIndicesTableProps> = ({ diversityData }) => {
  const t = useTranslations();
  const svgRef = useRef<SVGSVGElement>(null);
  const [selectedIndex, setSelectedIndex] = useState<keyof DiversityIndices>('shannon');
  const [activePalette, setActivePalette] = useState<PaletteName>('Viridis');
  const [exportFormat, setExportFormat] = useState<'svg' | 'png'>('svg');
  const [pointSize, setPointSize] = useState<number>(4);

  const sites = Object.keys(diversityData).sort();

  const indexOptions: { key: keyof DiversityIndices; label: string }[] = [
    { key: 'shannon', label: t.shannonIndex },
    { key: 'simpsonDominance', label: t.simpsonDominanceIndex },
    { key: 'pielouEvenness', label: t.pielouEvennessIndex },
    { key: 'margalefRichness', label: t.margalefRichnessIndex },
    { key: 'chao1', label: t.chao1Index },
  ];
  
  const pointSizeOptions = [
    { label: t.pointSizeSmall, value: 4 },
    { label: t.pointSizeMedium, value: 6 },
    { label: t.pointSizeLarge, value: 8 },
  ];
  
  const handleExportTable = () => {
    const headers = [
        t.siteColumn,
        t.shannonIndex,
        t.simpsonDominanceIndex,
        t.pielouEvennessIndex,
        t.margalefRichnessIndex,
        t.chao1Index,
    ];
    const rows = sites.map(site => [
        site,
        diversityData[site].shannon,
        diversityData[site].simpsonDominance,
        diversityData[site].pielouEvenness,
        diversityData[site].margalefRichness,
        diversityData[site].chao1,
    ]);
    const dataForCSV = [headers, ...rows];
    exportDataToCSV(dataForCSV, 'diversity-indices.csv');
  };

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-xl font-bold text-primary flex items-center mb-2">
            <PieChartIcon className="h-5 w-5 mr-2" /> {t.diversityAnalysisTitle}
        </h3>
        <p className="mb-4 text-gray-600">{t.diversityAnalysisDescription}</p>
      </div>

      {/* --- Scatter Plot Section --- */}
      <div className="space-y-4">
          <h4 className="text-lg font-semibold text-secondary">{t.diversityPlotTitle}</h4>
          <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 border rounded-lg">
              {/* Index Selector */}
              <div className="flex-grow">
                  <label htmlFor="index-select" className="block text-sm font-medium text-gray-700 mb-1">{t.selectIndex}</label>
                  <select id="index-select" value={selectedIndex} onChange={e => setSelectedIndex(e.target.value as keyof DiversityIndices)} className="w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                    {indexOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>
              </div>
              {/* Palette Selector */}
              <div className="flex-grow">
                  <label htmlFor="palette-select" className="block text-sm font-medium text-gray-700 mb-1">{t.palette}</label>
                  <select id="palette-select" value={activePalette} onChange={e => setActivePalette(e.target.value as PaletteName)} className="w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                    {Object.keys(palettes).map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
              </div>
              {/* Point Size Selector */}
              <div className="flex-grow">
                  <label htmlFor="point-size-select" className="block text-sm font-medium text-gray-700 mb-1">{t.selectPointSize}</label>
                  <select id="point-size-select" value={pointSize} onChange={e => setPointSize(Number(e.target.value))} className="w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                      {pointSizeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
              </div>
               {/* Export Controls */}
              <div className="flex-grow">
                  <label htmlFor="export-format-select" className="block text-sm font-medium text-gray-700 mb-1">{t.exportFormat}</label>
                  <div className="flex">
                    <select id="export-format-select" value={exportFormat} onChange={e => setExportFormat(e.target.value as 'svg' | 'png')} className="w-full p-2 border-gray-300 rounded-l-md shadow-sm focus:ring-primary focus:border-primary">
                        <option value="svg">SVG</option>
                        <option value="png">PNG</option>
                    </select>
                    <button onClick={() => handleExport(exportFormat, svgRef, 'diversity-plot')} className="bg-primary hover:bg-secondary text-white font-semibold py-2 px-4 rounded-r-md transition-colors flex items-center">
                        <ExportIcon className="h-4 w-4 mr-2" />
                        {t.downloadChart}
                    </button>
                  </div>
              </div>
          </div>
          <DiversityScatterPlot data={diversityData} selectedIndex={selectedIndex} palette={activePalette} svgRef={svgRef} pointSize={pointSize} />
      </div>

      {/* --- Data Table Section --- */}
      <div className="space-y-2">
         <div className="flex justify-between items-center">
            <h4 className="text-lg font-semibold text-secondary">{t.diversityDataTableTitle}</h4>
            <button
                onClick={handleExportTable}
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
                <th scope="col" className="p-3 font-semibold">{t.siteColumn}</th>
                <th scope="col" className="p-3 font-semibold text-center">{t.shannonIndex}</th>
                <th scope="col" className="p-3 font-semibold text-center">{t.simpsonDominanceIndex}</th>
                <th scope="col" className="p-3 font-semibold text-center">{t.pielouEvennessIndex}</th>
                <th scope="col" className="p-3 font-semibold text-center">{t.margalefRichnessIndex}</th>
                <th scope="col" className="p-3 font-semibold text-center">{t.chao1Index}</th>
                </tr>
            </thead>
            <tbody>
                {sites.map((site) => (
                <tr key={site} className="bg-white border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900 whitespace-nowrap">{site}</td>
                    <td className="p-3 text-center font-mono">{diversityData[site].shannon.toFixed(3)}</td>
                    <td className="p-3 text-center font-mono">{diversityData[site].simpsonDominance.toFixed(3)}</td>
                    <td className="p-3 text-center font-mono">{diversityData[site].pielouEvenness.toFixed(3)}</td>
                    <td className="p-3 text-center font-mono">{diversityData[site].margalefRichness.toFixed(3)}</td>
                    <td className="p-3 text-center font-mono font-bold text-primary">{diversityData[site].chao1.toFixed(3)}</td>
                </tr>
                ))}
            </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};

export default DiversityIndicesTable;