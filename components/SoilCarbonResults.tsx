
import React, { useMemo, useRef } from 'react';
import { SoilCarbonAnalysisResults, BiomassAnalysisResults } from '../types';
import { useTranslations } from '../translations';
import { ExportIcon } from './Icons';
import HorizontalBarChart from './HorizontalBarChart';
import { palettes } from './palettes';

interface SoilCarbonResultsProps {
  results: SoilCarbonAnalysisResults;
  biomassResults: BiomassAnalysisResults;
}

const SoilCarbonResults: React.FC<SoilCarbonResultsProps> = ({ results, biomassResults }) => {
  const t = useTranslations();
  const comparisonChartRef = useRef<SVGSVGElement>(null);

  const comparisonData = useMemo(() => {
    // Merge biomass and soil results for comparison by vegetation type
    const labels = results.summary.map(s => s.vegetationType);
    return labels.map(label => {
        const soilStock = results.summary.find(s => s.vegetationType === label)?.avgSocMgHa || 0;
        const biomassStock = biomassResults.summary.find(b => b['Tipo de vegetación'] === label)?.['Carbono_Mg/ha'] || 0;
        return {
            label,
            soil: soilStock,
            biomass: biomassStock,
            total: soilStock + biomassStock
        };
    }).sort((a, b) => b.total - a.total);
  }, [results, biomassResults]);

  const chartData = useMemo(() => {
      // Create a grouped format or just stacked for the horizontal chart
      return comparisonData.map(d => ({
          label: d.label,
          value: d.total
      }));
  }, [comparisonData]);

  return (
    <div className="bg-white p-4 border rounded-lg shadow-sm space-y-6">
        <h4 className="text-lg font-bold text-primary border-b pb-2">{t.soilHeader}</h4>
        
        <div className="grid grid-cols-1 gap-4">
             <div className="p-4 bg-green-50 rounded-lg border border-green-100 flex justify-between items-center">
                <div>
                    <p className="text-xs font-semibold text-green-800 uppercase tracking-wider">{t.avgCarbonPerHa}</p>
                    <p className="text-3xl font-bold text-green-900">{results.totals.avgSocMgHa.toFixed(2)} <span className="text-sm font-normal">Mg/ha</span></p>
                </div>
                <div className="text-right">
                    <p className="text-xs font-semibold text-green-800 uppercase tracking-wider">{t.totalCarbon}</p>
                    <p className="text-xl font-bold text-green-900">{results.totals.totalCarbonMg.toFixed(1)} <span className="text-sm font-normal">Mg</span></p>
                </div>
            </div>
        </div>

        <div className="space-y-4">
             <h5 className="text-md font-semibold text-secondary">{t.comparisonChartTitle}</h5>
             <div className="relative">
                <HorizontalBarChart 
                    data={chartData} 
                    xAxisLabel="Total Carbon (Mg/ha)" 
                    svgRef={comparisonChartRef} 
                    palette={palettes.Viridis} 
                />
                <div className="flex justify-center space-x-6 mt-2">
                    <div className="flex items-center text-xs text-gray-600">
                        <span className="w-3 h-3 bg-[#440154] inline-block mr-1"></span> {t.legendBiomass}
                    </div>
                    <div className="flex items-center text-xs text-gray-600">
                        <span className="w-3 h-3 bg-[#fde725] inline-block mr-1"></span> {t.legendSoil}
                    </div>
                </div>
             </div>
        </div>

        <div className="overflow-x-auto">
            <table className="min-w-full text-xs text-left text-gray-600">
                <thead className="bg-gray-100 uppercase tracking-wider">
                    <tr>
                        <th className="p-2 font-semibold">{t.vegetationType}</th>
                        <th className="p-2 font-semibold text-center">{t.depthLabel} (cm)</th>
                        <th className="p-2 font-semibold text-center">SOC (Mg/ha)</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {results.summary.map(row => (
                        <tr key={row.vegetationType} className="hover:bg-gray-50">
                            <td className="p-2 font-medium text-gray-900">{row.vegetationType}</td>
                            <td className="p-2 text-center">30</td>
                            <td className="p-2 text-center font-bold text-green-700">{row.avgSocMgHa.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );
};

export default SoilCarbonResults;
