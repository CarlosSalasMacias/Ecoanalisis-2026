


import React from 'react';
import { IndValResult } from '../types';
import { TagIcon, ExportIcon } from './Icons';
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

interface IndValTableProps {
  analysisData: IndValResult;
  sites: string[];
  selectedSite: string;
  onSiteChange: (site: string) => void;
  isLoading: boolean;
}

const IndValTable: React.FC<IndValTableProps> = ({ analysisData, sites, selectedSite, onSiteChange, isLoading }) => {
    const t = useTranslations();
    const species = Object.keys(analysisData).sort();

    if (species.length === 0 && !isLoading) {
        return <p className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm">{t.noData}</p>;
    }

    const currentSites = species.length > 0 ? Object.keys(analysisData[species[0]] || {}).sort() : [];
    const siteOptions = ['General', ...sites];

    const handleExport = () => {
        const headers = [t.speciesColumn, ...currentSites.flatMap(site => [`${site}_${t.indValValue}`, `${site}_${t.pValue}`])];
        const rows = species.map(sp => {
            const rowData: (string | number)[] = [sp];
            currentSites.forEach(site => {
                const metrics = analysisData[sp]?.[site];
                rowData.push(metrics?.indval ?? 'N/A');
                rowData.push(metrics?.pvalue ?? 'N/A');
            });
            return rowData;
        });
        exportDataToCSV([headers, ...rows], `indicator-species-analysis-${selectedSite}.csv`);
    };

    return (
        <div className="space-y-6">
            <div>
                <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                    <h3 className="text-xl font-bold text-primary flex items-center">
                        <TagIcon className="h-5 w-5 mr-2" /> {t.indValAnalysisTitle}
                    </h3>
                    <div className="flex items-center space-x-2">
                        <label htmlFor="site-select-indval" className="text-sm font-medium text-gray-700">{t.selectSite}</label>
                        <select 
                            id="site-select-indval"
                            value={selectedSite}
                            onChange={e => onSiteChange(e.target.value)}
                            className="p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary"
                        >
                            {siteOptions.map(site => <option key={site} value={site}>{site}</option>)}
                        </select>
                    </div>
                </div>
                <p className="mb-4 text-gray-600">{t.indValAnalysisDescription}</p>
            </div>
            
            <div className="flex justify-end">
                <button
                    onClick={handleExport}
                    disabled={isLoading}
                    className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1.5 px-3 rounded-lg shadow-sm transition-colors duration-200 text-sm disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                    <ExportIcon className="h-4 w-4 mr-2"/>
                    {t.exportTableCSV}
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center items-center p-6 bg-gray-50 rounded-lg">
                    <svg className="animate-spin h-6 w-6 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    <p className="ml-3 text-md font-semibold text-primary">{t.indValRecalculating}</p>
                </div>
            ) : species.length === 0 ? (
                 <p className="p-4 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded-md text-sm">{t.noDataForSite}</p>
            ) : (
                <div className="overflow-x-auto bg-white rounded-lg shadow">
                    <table className="min-w-full text-sm text-left text-gray-600">
                        <thead className="bg-gray-100 text-xs text-gray-700 uppercase tracking-wider">
                            <tr>
                                <th scope="col" rowSpan={2} className="p-3 font-semibold align-bottom border-b-2 border-gray-200 sticky left-0 bg-gray-100 z-10">{t.speciesColumn}</th>
                                {currentSites.map(site => (
                                    <th key={site} scope="col" colSpan={2} className="p-3 font-semibold text-center border-b-2 border-l border-gray-200">{site}</th>
                                ))}
                            </tr>
                            <tr>
                                {currentSites.map(site => (
                                    <React.Fragment key={site}>
                                        <th scope="col" className="p-3 font-semibold text-center bg-gray-50 border-l border-gray-200">{t.indValValue}</th>
                                        <th scope="col" className="p-3 font-semibold text-center bg-gray-50">{t.pValue}</th>
                                    </React.Fragment>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {species.map(s => {
                                return (
                                    <tr key={s} className="bg-white border-b hover:bg-gray-50">
                                        <td className="p-3 font-medium text-gray-900 sticky left-0 bg-white z-10 whitespace-nowrap italic">{s}</td>
                                        {currentSites.map(site => {
                                            const metrics = analysisData[s]?.[site];
                                            if (!metrics) {
                                                return <React.Fragment key={site}><td className="border-l"></td><td></td></React.Fragment>;
                                            }
                                            const isSignificant = metrics.pvalue < 0.05;
                                            return (
                                                <React.Fragment key={site}>
                                                    <td className={`p-3 text-center font-mono ${isSignificant ? 'bg-blue-50 text-primary font-bold' : ''} border-l border-gray-200`}>
                                                        {metrics.indval}
                                                    </td>
                                                    <td className={`p-3 text-center font-mono ${isSignificant ? 'bg-blue-50' : ''}`}>
                                                        {metrics.pvalue}
                                                    </td>
                                                </React.Fragment>
                                            );
                                        })}
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default IndValTable;