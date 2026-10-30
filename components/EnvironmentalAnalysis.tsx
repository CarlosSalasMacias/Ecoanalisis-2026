
import React from 'react';
import { AllEnvironmentalAnalyses } from '../types';
import { ChartBarIcon, ExportIcon } from './Icons';
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

interface EnvironmentalAnalysisProps {
  allAnalyses: AllEnvironmentalAnalyses;
}

const EnvironmentalAnalysis: React.FC<EnvironmentalAnalysisProps> = ({
  allAnalyses,
}) => {
  const t = useTranslations();
  const analysisKeys = Object.keys(allAnalyses).sort();

  if (analysisKeys.length === 0) {
    return (
      <div>
        <h3 className="text-xl font-bold text-primary mb-2 flex items-center"><ChartBarIcon className="h-5 w-5 mr-2" /> {t.envAnalysisTitle}</h3>
        <p className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm">
            {t.envAnalysisNoData}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
          <h3 className="text-xl font-bold text-primary mb-2 flex items-center"><ChartBarIcon className="h-5 w-5 mr-2" /> {t.envAnalysisTitle}</h3>
          <p className="mb-6 text-gray-600">
            {t.envAnalysisDescription}
          </p>
      </div>

      <p className="text-xs text-gray-600">{t.envTestNote}</p>

      {analysisKeys.map(key => {
        const { pair, analysis } = allAnalyses[key];
        const effectClass = pair.effect === 'positive' ? 'text-blue-600' : 'text-red-600';
        const effectText = pair.effect === 'positive' ? t.positive : t.negative;
        
        const handleExport = () => {
            const headers = [t.envFactor, t.cooccurrenceMean, 'n', t.controlMean, 'n', 'p', 'p_adj', t.envTestType];
            const rows = analysis.map(res => [t.header(res.factor), res.cooccurrenceMean, res.nCooccurrence, res.controlMean, res.nControl,
                res.pValue ?? 'NA', res.pAdj ?? 'NA', res.exact === null ? '' : res.exact ? 'exacta' : 'Monte Carlo']);
            const dataForCSV = [headers, ...rows.map(r => r.map(c => c ?? 'N/A'))];
            const filename = `environmental-analysis-${pair.speciesA.replace(' ', '_')}-${pair.speciesB.replace(' ', '_')}`;
            exportDataToCSV(dataForCSV, filename);
        };
        
        return (
          <div key={key} className="p-4 border border-gray-200 rounded-lg bg-gray-50">
            <div className="flex justify-between items-start mb-3">
                <div>
                    <h4 className="text-lg font-bold text-secondary">
                        <i className="font-bold not-italic">{pair.speciesA}</i> & <i className="font-bold not-italic">{pair.speciesB}</i>
                    </h4>
                    <p className={`text-sm font-semibold ${effectClass}`}>{t.pairAssociation.replace('{effectText}', effectText)}</p>
                </div>
                 <button
                    onClick={handleExport}
                    className="flex items-center bg-white hover:bg-gray-100 text-gray-700 font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors duration-200 text-sm border border-gray-300"
                >
                    <ExportIcon className="h-4 w-4 mr-2"/>
                    {t.exportCSV}
                </button>
            </div>
            
            <div className="overflow-x-auto bg-white rounded-lg shadow">
               <table className="min-w-full text-sm text-left text-gray-600">
                <thead className="bg-gray-100 text-xs text-gray-700 uppercase tracking-wider">
                  <tr>
                    <th scope="col" className="p-3 font-semibold">{t.envFactor}</th>
                    <th scope="col" className="p-3 font-semibold text-center">{t.cooccurrenceMean}</th>
                    <th scope="col" className="p-3 font-semibold text-center">{t.controlMean}</th>
                    <th scope="col" className="p-3 font-semibold text-center">p</th>
                    <th scope="col" className="p-3 font-semibold text-center">{t.pAdjValue}</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.map(res => (
                    <tr key={res.factor} className="bg-white border-b">
                      {/* FIX: Use the new header function from the translation hook */}
                      <td className="p-3 font-medium text-gray-900">{t.header(res.factor)}</td>
                      {pair.effect === 'negative' && res.cooccurrenceMean === 'N/A' ? (
                        <td 
                          className="p-3 text-center font-mono text-gray-400 cursor-help"
                          title={t.negativeCooccurrenceTooltip}
                        >
                          {res.cooccurrenceMean}
                        </td>
                      ) : (
                        <td className="p-3 text-center font-mono">{res.cooccurrenceMean} <span className="text-gray-400">(n = {res.nCooccurrence})</span></td>
                      )}
                      <td className="p-3 text-center font-mono">{res.controlMean} <span className="text-gray-400">(n = {res.nControl})</span></td>
                      <td className="p-3 text-center font-mono">{res.pValue === null ? '—' : res.pValue < 0.001 ? '< 0.001' : res.pValue.toFixed(3)}</td>
                      <td className={`p-3 text-center font-mono ${res.pAdj !== null && res.pAdj < 0.05 ? 'font-bold text-primary' : ''}`}>{res.pAdj === null ? '—' : res.pAdj < 0.001 ? '< 0.001' : res.pAdj.toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default EnvironmentalAnalysis;