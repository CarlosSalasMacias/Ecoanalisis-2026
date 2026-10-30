import React from 'react';
import { SiteStandCharacteristics } from '../types';
import { useTranslations } from '../translations';
import { ExportIcon } from './Icons';

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


interface StandCharacteristicsTableProps {
  data: SiteStandCharacteristics;
}

const StandCharacteristicsTable: React.FC<StandCharacteristicsTableProps> = ({ data }) => {
  const t = useTranslations();
  const sites = Object.keys(data).sort();
  
  const parameters = [
    { key: 'numPlots', label: t.numPlotsLabel },
    { key: 'stemDensity', label: t.stemDensityLabel },
    { key: 'minHeight', label: t.minHeightLabel },
    { key: 'maxHeight', label: t.maxHeightLabel },
    { key: 'avgHeight', label: t.avgHeightLabel },
    { key: 'minDBH', label: t.minDBHLabel },
    { key: 'maxDBH', label: t.maxDBHLabel },
    { key: 'avgDBH', label: t.avgDBHLabel },
    { key: 'minWoodDensity', label: t.minWoodDensityLabel },
    { key: 'maxWoodDensity', label: t.maxWoodDensityLabel },
    { key: 'avgWoodDensity', label: t.avgWoodDensityLabel },
  ];

  const handleExport = () => {
      const headers = [t.parameter, ...sites];
      const rows = parameters.map(param => {
          const rowData: (string | number)[] = [param.label];
          sites.forEach(site => {
              const value = data[site]?.[param.key as keyof typeof data[typeof site]];
              rowData.push(value ?? 'N/A');
          });
          return rowData;
      });
      exportDataToCSV(headers, rows, 'stand_characteristics.csv');
  };

  if (sites.length === 0) {
    return null;
  }
  
  const formatValue = (key: string, value: any): string | number => {
    if (value === 'N/A' || value === undefined || value === null) return 'N/A';
    if (typeof value === 'string') return value; // Already formatted (e.g., avg values)
    if (key === 'numPlots') return value; // Integer
    return value.toFixed(2);
  };

  return (
    <div className="mb-8">
        <div className="flex justify-between items-center mb-3">
            <h4 className="text-lg font-semibold text-secondary">{t.standCharacteristicsTitle}</h4>
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
              <th scope="col" className="p-3 font-semibold sticky left-0 bg-gray-100 z-10">{t.parameter}</th>
              {sites.map(site => <th key={site} scope="col" className="p-3 font-semibold text-center whitespace-nowrap">{site.replace(/_/g, ' ')}</th>)}
            </tr>
          </thead>
          <tbody>
            {parameters.map(param => (
              <tr key={param.key} className="bg-white border-b hover:bg-gray-50">
                <td className="p-3 font-medium text-gray-900 whitespace-nowrap sticky left-0 bg-white z-10">{param.label}</td>
                {sites.map(site => (
                  <td key={site} className="p-3 text-center font-mono">
                    {data[site] ? formatValue(param.key, data[site][param.key as keyof typeof data[typeof site]]) : 'N/A'}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StandCharacteristicsTable;