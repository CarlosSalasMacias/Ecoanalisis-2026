
import React from 'react';
import { SiteCooccurrenceMatrix, CooccurrenceCell } from '../types';
import { ExportIcon, SVGIcon } from './Icons';
import { useTranslations } from '../translations';

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

const handleExportSVG = (matrix: SiteCooccurrenceMatrix['General'], site: string, maxObsRandom: number) => {
    const species = Object.keys(matrix).sort();
    if (species.length === 0) return;

    // --- SVG Constants ---
    const CELL_SIZE = 65;
    const HEADER_ROTATED_HEIGHT = 160;
    const HEADER_SIDE_WIDTH = 200;
    const PADDING = 20;
    const FONT_SIZE_CELL = 14;
    const FONT_SIZE_HEADER = 12;

    const width = PADDING * 2 + HEADER_SIDE_WIDTH + species.length * CELL_SIZE;
    const height = PADDING * 2 + HEADER_ROTATED_HEIGHT + species.length * CELL_SIZE;

    let svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" style="background-color: white; font-family: sans-serif;">`;
    
    // Add styles
    svgString += `
        <style>
            .header-text { font-size: ${FONT_SIZE_HEADER}px; font-weight: 600; fill: #374151; }
            .header-text-side { font-style: italic; text-anchor: end; }
            .cell-text { font-size: ${FONT_SIZE_CELL}px; font-weight: 600; text-anchor: middle; alignment-baseline: central; }
            .italic { font-style: italic; }
        </style>
    `;

    // --- Column Headers (Rotated) ---
    species.forEach((s, i) => {
        const x = PADDING + HEADER_SIDE_WIDTH + (i + 0.5) * CELL_SIZE;
        const y = PADDING + HEADER_ROTATED_HEIGHT - 10;
        svgString += `<text x="${x}" y="${y}" transform="rotate(-65, ${x}, ${y})" class="header-text italic" text-anchor="start">${s}</text>`;
    });

    // --- Row Headers ---
    species.forEach((s, i) => {
        const x = PADDING + HEADER_SIDE_WIDTH - 10;
        const y = PADDING + HEADER_ROTATED_HEIGHT + (i + 0.5) * CELL_SIZE;
        svgString += `<text x="${x}" y="${y}" class="header-text header-text-side" alignment-baseline="central">${s}</text>`;
    });

    // --- Matrix Cells ---
    species.forEach((spA, i) => {
        species.forEach((spB, j) => {
            const cellData = matrix[spA]?.[spB];
            const x = PADDING + HEADER_SIDE_WIDTH + j * CELL_SIZE;
            const y = PADDING + HEADER_ROTATED_HEIGHT + i * CELL_SIZE;

            let fill = '#f9fafb'; // Default random/empty
            let textColor = '#1f2937';
            let symbol = '';
            let textContent = '?';
            
            if (cellData) {
                if (i === j && 'obs' in cellData) { // Diagonal
                    fill = '#d1d5db'; // bg-gray-300
                    textContent = String(cellData.obs);
                } else if ('effect' in cellData) {
                    const { obs, effect } = cellData;
                    textContent = String(obs);
                    if (effect === 'positive') {
                        fill = '#3b82f6'; // bg-blue-500
                        textColor = 'white';
                        symbol = '+';
                    } else if (effect === 'negative') {
                        fill = '#ef4444'; // bg-red-500
                        textColor = 'white';
                        symbol = '–';
                    } else { // 'random'
                        const intensity = maxObsRandom > 0 ? obs / maxObsRandom : 0;
                        const lightness = 96 - (intensity * 21); // from 96% to 75%
                        fill = `hsl(210, 10%, ${lightness}%)`;
                    }
                }
            }
            
            svgString += `<rect x="${x}" y="${y}" width="${CELL_SIZE}" height="${CELL_SIZE}" fill="${fill}" stroke="#ffffff" stroke-width="1" />`;
            
            const fullText = `${textContent}${symbol ? `<tspan dx="2" dy="-1" font-size="12px" font-weight="bold">${symbol}</tspan>` : ''}`;
            svgString += `<text x="${x + CELL_SIZE / 2}" y="${y + CELL_SIZE / 2}" class="cell-text" fill="${textColor}">${fullText}</text>`;
        });
    });


    svgString += `</svg>`;

    // --- Download Logic ---
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", `co-occurrence-matrix-${site}.svg`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
};

interface CooccurrenceTableProps {
  matrix: SiteCooccurrenceMatrix;
  sites: string[];
  selectedSite: string;
  onSiteChange: (site: string) => void;
}

const CooccurrenceTable: React.FC<CooccurrenceTableProps> = ({ matrix, sites, selectedSite, onSiteChange }) => {
  const t = useTranslations();
  
  const siteOptions = ['General', ...sites];
  const currentMatrix = matrix[selectedSite] || {};
  const species = Object.keys(currentMatrix).sort();
  
  const maxObsRandom = React.useMemo(() => {
    let max = 0;
    species.forEach((spA, i) => {
        species.forEach((spB, j) => {
            if (i >= j) return;
            const cell = currentMatrix[spA]?.[spB];
            if (cell && 'effect' in cell && cell.effect === 'random') {
                if (cell.obs > max) {
                    max = cell.obs;
                }
            }
        });
    });
    return max > 0 ? max : 1; // Avoid division by zero
  }, [currentMatrix, species]);

  const handleExportCSV = () => {
    const headers = ['Species_A', 'Species_B', 'Observed', 'Expected', 'P_Value', 'Statistical_Effect'];
    const rows: (string|number)[][] = [];

    for (let i = 0; i < species.length; i++) {
        for (let j = i + 1; j < species.length; j++) {
            const spA = species[i];
            const spB = species[j];
            const cell = currentMatrix[spA][spB];

            if ('effect' in cell) {
                const p_value = cell.obs > cell.exp ? cell.p_gt : cell.p_lt;
                rows.push([
                    spA,
                    spB,
                    cell.obs,
                    cell.exp.toFixed(4),
                    p_value.toPrecision(4),
                    cell.effect
                ]);
            }
        }
    }
    
    const dataForCSV = [headers, ...rows];
    exportDataToCSV(dataForCSV, `co-occurrence-analysis-${selectedSite}.csv`);
  };

  const renderCell = (cellData: CooccurrenceCell, isDiagonal: boolean) => {
    if (isDiagonal) {
      return (
        <td className="p-3 text-center font-bold bg-gray-300 text-gray-800" title={t.diagonalCellTitle.replace('{obs}', String(cellData.obs))}>
          {cellData.obs}
        </td>
      );
    }
    
    if ('effect' in cellData) {
      const { obs, exp, p_lt, p_gt, effect } = cellData;
      let bgColorClass = '';
      let textColorClass = 'text-gray-800';
      let symbol = '';
      let bgStyle = {};

      const p_value = obs > exp ? p_gt : p_lt;

      if (effect === 'positive') {
        bgColorClass = 'bg-blue-500 hover:bg-blue-600';
        textColorClass = 'text-white';
        symbol = '+';
      } else if (effect === 'negative') {
        bgColorClass = 'bg-red-500 hover:bg-red-600';
        textColorClass = 'text-white';
        symbol = '–'; // En dash for better visual appearance
      } else { // effect === 'random' for heatmap
        const intensity = maxObsRandom > 0 ? obs / maxObsRandom : 0;
        const lightness = 96 - (intensity * 21); // from 96% (light gray) to 75% (darker gray)
        bgStyle = { backgroundColor: `hsl(210, 10%, ${lightness}%)` };
      }
      
      const title = t.cellTitle
        .replace('{obs}', String(obs))
        .replace('{exp}', exp.toFixed(2))
        .replace('{p_value}', p_value.toPrecision(3))
        .replace('{effect}', effect);
      
      return (
        <td
          title={title}
          style={bgStyle}
          className={`p-3 text-center font-semibold ${bgColorClass} ${textColorClass} transition-colors duration-200 cursor-help`}
        >
          {obs}{symbol && <span className="font-bold ml-1">{symbol}</span>}
        </td>
      );
    }
    
    return <td className="p-3 text-center bg-gray-50">?</td>;
  };

  return (
    <div className="bg-white p-4">
      <div className="flex justify-between items-center mb-4 flex-wrap gap-2">
          <h3 className="text-xl font-bold text-primary">{t.cooccurrenceMatrixTitle}</h3>
           <div className="flex items-center space-x-2">
              <label htmlFor="site-select-cooc" className="text-sm font-medium text-gray-700">{t.selectSiteCooc}</label>
              <select 
                  id="site-select-cooc"
                  value={selectedSite}
                  onChange={e => onSiteChange(e.target.value)}
                  className="p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
              >
                  {siteOptions.map(site => <option key={site} value={site}>{site}</option>)}
              </select>
            </div>
           <div className="flex space-x-2">
              <button
                  onClick={() => handleExportSVG(currentMatrix, selectedSite, maxObsRandom)}
                  className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors duration-200 text-sm"
                  title={t.exportSVGTooltip}
              >
                  <SVGIcon className="h-4 w-4 mr-2"/>
                  {t.exportSVG}
              </button>
              <button
                  onClick={handleExportCSV}
                  className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors duration-200 text-sm"
                  title={t.exportCSVTooltip}
              >
                  <ExportIcon className="h-4 w-4 mr-2"/>
                  {t.exportCSV}
              </button>
           </div>
      </div>
      <div className="text-sm bg-blue-50 text-blue-900 mb-4 p-4 rounded-lg border border-blue-200" role="alert">
          <h4 className="font-semibold text-lg text-primary mb-2">{t.matrixInterpretationTitle}</h4>
          <p className="mb-2" dangerouslySetInnerHTML={{ __html: t.matrixInterpretationLine1 }} />
          <ul className="list-disc list-inside space-y-1">
              <li dangerouslySetInnerHTML={{ __html: t.matrixInterpretationPositive }} />
              <li dangerouslySetInnerHTML={{ __html: t.matrixInterpretationNegative }} />
              <li dangerouslySetInnerHTML={{ __html: t.matrixInterpretationRandom }} />
          </ul>
          <p className="mt-2">{t.matrixInterpretationDiagonal}</p>
          <p className="mt-2">{t.matrixInterpretationHover}</p>
      </div>
       {selectedSite !== 'General' && (
        <div className="text-sm bg-yellow-50 text-yellow-900 mb-4 p-4 rounded-lg border border-yellow-200" role="status">
            <h4 className="font-semibold text-yellow-800">{t.siteAnalysisNoteTitle}</h4>
            <p className="mt-1">{t.siteAnalysisNoteContent}</p>
        </div>
      )}
      {species.length > 0 ? (
        <div className="overflow-x-auto bg-white rounded-lg shadow">
            <table className="min-w-full text-sm text-left text-gray-600">
                <thead className="bg-gray-100 text-xs text-gray-700 uppercase tracking-wider">
                <tr>
                    <th scope="col" className="p-3 sticky left-0 bg-gray-100 z-10 font-semibold">{t.speciesColumn}</th>
                    {species.map(s => (
                    <th key={s} scope="col" className="p-1 font-semibold align-bottom" style={{ height: '160px', minWidth: '30px', maxWidth: '30px' }}>
                        <div className="flex justify-center items-end h-full">
                            <span className="whitespace-nowrap italic" style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}>
                               {s}
                            </span>
                        </div>
                    </th>
                    ))}
                </tr>
                </thead>
                <tbody>
                {species.map((speciesA, rowIndex) => (
                    <tr key={speciesA} className="bg-white border-b">
                    <td className="p-3 font-medium text-gray-900 sticky left-0 bg-white z-10 whitespace-nowrap italic">{speciesA}</td>
                    {species.map((speciesB, colIndex) => {
                        const cellData = currentMatrix[speciesA]?.[speciesB];
                        if (!cellData) {
                            return <td key={speciesB} className="p-3 text-center bg-gray-50">?</td>;
                        }
                        return (
                            <React.Fragment key={speciesB}>
                                {renderCell(cellData, rowIndex === colIndex)}
                            </React.Fragment>
                        );
                    })}
                    </tr>
                ))}
                </tbody>
            </table>
        </div>
      ) : (
        <p className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm">
            {t.noDataForSite}
        </p>
      )}
    </div>
  );
};

export default CooccurrenceTable;
