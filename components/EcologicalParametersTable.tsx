import React, { useState, useRef } from 'react';
import { SiteEcologicalParameters, EcologicalParameterSet } from '../types';
import { useTranslations } from '../translations';
import { PieChartIcon, ExportIcon } from './Icons';
import { palettes, PaletteName } from './palettes';

// --- Plotting and Export Utilities ---
const exportDataToCSV = (headers: string[], data: (string | number)[][], filename: string) => {
    const escapeCSVCell = (cell: any) => {
        const str = String(cell ?? '');
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };
    const csvContent = [headers, ...data].map(row => row.map(escapeCSVCell).join(',')).join('\r\n');
    
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
    // Ensure background is white for PNG export
    svgClone.style.backgroundColor = 'white';

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
  data: SiteEcologicalParameters;
  selectedIndex: keyof EcologicalParameterSet;
  indexOptions: { key: keyof EcologicalParameterSet; label: string }[];
  palette: PaletteName;
  svgRef: React.RefObject<SVGSVGElement>;
  pointSize: number;
}

const DiversityScatterPlot: React.FC<DiversityScatterPlotProps> = ({ data, selectedIndex, indexOptions, palette, svgRef, pointSize }) => {
    const t = useTranslations();
    const sites = Object.keys(data).sort();
    const values = sites.map(site => data[site][selectedIndex] as number);

    const PADDING = { top: 40, right: 20, bottom: 120, left: 60 };
    const WIDTH = 800;
    const HEIGHT = 400;
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

    const yMin = Math.min(0, ...values);
    const yMax = Math.max(...values, 0) * 1.1;

    const step = plotWidth / (sites.length);
    const xScale = (index: number) => PADDING.left + step * (index + 0.5);
    const yScale = (value: number) => PADDING.top + plotHeight - ((value - yMin) / ((yMax - yMin) || 1)) * plotHeight;
    
    const colors = palettes[palette];
    
    const selectedLabel = indexOptions.find(opt => opt.key === selectedIndex)?.label || '';

    return (
        <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto bg-white rounded-lg shadow border">
            <text x={WIDTH / 2} y={PADDING.top / 2 + 5} textAnchor="middle" fontSize="14" className="font-semibold">{selectedLabel}</text>
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
            {sites.map((site, i) => (
                <circle key={site} cx={xScale(i)} cy={yScale(values[i])} r={pointSize} fill={colors[i % colors.length]} stroke="white" strokeWidth="1">
                    <title>{`${site}: ${values[i]}`}</title>
                </circle>
            ))}
        </svg>
    );
}

// --- Main Table Component ---
interface EcologicalParametersTableProps {
  data: SiteEcologicalParameters;
}

const EcologicalParametersTable: React.FC<EcologicalParametersTableProps> = ({ data }) => {
  const t = useTranslations();
  const svgRef = useRef<SVGSVGElement>(null);
  
  const sites = Object.keys(data).sort();
  
  const parameters: { key: keyof EcologicalParameterSet; label: string; format: (v: number) => string | number; }[] = [
    { key: 'speciesRichness', label: t.speciesRichness, format: (v) => v },
    { key: 'individuals', label: t.individuals, format: (v) => v },
    { key: 'genusRichness', label: t.genusRichness, format: (v) => v },
    { key: 'familyRichness', label: t.familyRichness, format: (v) => v },
    { key: 'sampleCoverage', label: t.sampleCoverage, format: (v) => v.toFixed(3) },
    { key: 'shannon', label: t.shannonIndex, format: (v) => v.toFixed(3) },
    { key: 'simpsonDominance', label: t.simpsonDominanceIndex, format: (v) => v.toFixed(3) },
    { key: 'pielouEvenness', label: t.pielouEvennessIndex, format: (v) => v.toFixed(3) },
    { key: 'margalefRichness', label: t.margalefRichnessIndex, format: (v) => v.toFixed(3) },
    { key: 'chao1', label: t.chao1Index, format: (v) => v.toFixed(3) },
    { key: 'chao1Lower', label: `${t.chao1CI} (LCL)`, format: (v) => v.toFixed(3) },
    { key: 'chao1Upper', label: `${t.chao1CI} (UCL)`, format: (v) => v.toFixed(3) },
  ];

  const indexOptions: { key: keyof EcologicalParameterSet; label: string }[] = parameters.map(p => ({
      key: p.key,
      label: p.label.replace(/<[^>]*>?/gm, ''), // Remove HTML tags
  }));

  const [selectedIndex, setSelectedIndex] = useState<keyof EcologicalParameterSet>(indexOptions[5]?.key || 'shannon');
  const [activePalette, setActivePalette] = useState<PaletteName>('Viridis');
  const [exportFormat, setExportFormat] = useState<'svg' | 'png'>('svg');
  const [pointSize, setPointSize] = useState<number>(4);

  const pointSizeOptions = [
    { label: t.pointSizeSmall, value: 4 },
    { label: t.pointSizeMedium, value: 6 },
    { label: t.pointSizeLarge, value: 8 },
  ];
  
  const handleExportTable = () => {
      const headers = [t.parameter, ...sites];
      const rows = parameters.map(param => {
          const rowData: (string | number)[] = [param.label.replace(/<[^>]*>?/gm, '')]; // Strip HTML for CSV
          sites.forEach(site => {
              rowData.push(param.format(data[site][param.key]));
          });
          return rowData;
      });
      exportDataToCSV(headers, rows, 'ecological_parameters.csv');
  };

  return (
    <div className="space-y-8">
      <div>
        <div className="flex justify-between items-center flex-wrap gap-2 mb-2">
            <h3 className="text-xl font-bold text-primary flex items-center">
                <PieChartIcon className="h-5 w-5 mr-2" /> {t.ecoParamsTitle}
            </h3>
        </div>
        <p className="mb-4 text-gray-600">{t.ecoParamsDescription}</p>
      </div>
      
      <div className="space-y-2">
        <div className="flex justify-end">
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
                <th scope="col" className="p-3 font-semibold sticky left-0 bg-gray-100 z-10">{t.parameter}</th>
                {sites.map(site => <th key={site} scope="col" className="p-3 font-semibold text-center whitespace-nowrap">{site.replace(/_/g, ' ')}</th>)}
                </tr>
            </thead>
            <tbody>
                {parameters.map(param => (
                <tr key={param.key} className="bg-white border-b hover:bg-gray-50">
                    <td className="p-3 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10" dangerouslySetInnerHTML={{ __html: param.label }} />
                    {sites.map(site => (
                    <td key={site} className="p-3 text-center font-mono">
                        {data[site] ? param.format(data[site][param.key]) : 'N/A'}
                    </td>
                    ))}
                </tr>
                ))}
            </tbody>
            </table>
        </div>
        <p className="text-xs text-gray-500 mt-2 italic">{t.sampleCoverageNote}</p>
      </div>

      {/* --- Scatter Plot Section --- */}
      <div className="space-y-4 pt-4 border-t border-gray-200">
          <h4 className="text-lg font-semibold text-secondary">{t.diversityPlotTitle}</h4>
          <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 border rounded-lg">
              <div className="flex-grow min-w-[150px]">
                  <label htmlFor="index-select" className="block text-sm font-medium text-gray-700 mb-1">{t.selectIndex}</label>
                  <select id="index-select" value={selectedIndex} onChange={e => setSelectedIndex(e.target.value as keyof EcologicalParameterSet)} className="w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                    {indexOptions.map(opt => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
                  </select>
              </div>
              <div className="flex-grow min-w-[120px]">
                  <label htmlFor="palette-select" className="block text-sm font-medium text-gray-700 mb-1">{t.palette}</label>
                  <select id="palette-select" value={activePalette} onChange={e => setActivePalette(e.target.value as PaletteName)} className="w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                    {Object.keys(palettes).map(name => <option key={name} value={name}>{name}</option>)}
                  </select>
              </div>
              <div className="flex-grow min-w-[120px]">
                  <label htmlFor="point-size-select" className="block text-sm font-medium text-gray-700 mb-1">{t.selectPointSize}</label>
                  <select id="point-size-select" value={pointSize} onChange={e => setPointSize(Number(e.target.value))} className="w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                      {pointSizeOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                  </select>
              </div>
              <div className="flex-grow min-w-[180px]">
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
          <DiversityScatterPlot data={data} selectedIndex={selectedIndex} indexOptions={indexOptions} palette={activePalette} svgRef={svgRef} pointSize={pointSize} />
      </div>

    </div>
  );
};

export default EcologicalParametersTable;