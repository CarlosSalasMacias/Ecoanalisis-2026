
import React, { useMemo, useState, useRef } from 'react';
import { BiomassAnalysisResults, SummaryRow, PlotSummaryRow, ForestDataRow } from '../types';
import { useTranslations } from '../translations';
import { ExportIcon } from './Icons';
import ChordDiagram from './ChordDiagram';
import HorizontalBarChart from './HorizontalBarChart';
import { palettes, PaletteName } from './palettes';

// CSV Export Helper Function
const exportDataToCSV = (headers: string[], data: (string | number | null)[][], filename: string) => {
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

// SVG/PNG Export Helper Function
const handleExport = (format: 'svg' | 'png', svgRef: React.RefObject<SVGSVGElement>, filename: string) => {
    const svgEl = svgRef.current;
    if (!svgEl) return;

    const style = document.createElement('style');
    style.textContent = `
        .font-semibold { font-weight: 600; }
        .font-normal { font-weight: 400; }
        .italic { font-style: italic; }
        text, .legend-text { font-family: sans-serif; }
    `;
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
    svgClone.style.backgroundColor = 'white';
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
        
        const viewBox = svgEl.getAttribute('viewBox')?.split(' ').map(Number);
        const svgWidth = viewBox ? viewBox[2] : 800;
        const svgHeight = viewBox ? viewBox[3] : 600;

        const scale = 2; // For higher resolution
        canvas.width = svgWidth * scale;
        canvas.height = svgHeight * scale;
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

interface BiomassCalculatorTabProps {
  results: BiomassAnalysisResults;
}

const BiomassCalculatorTab: React.FC<BiomassCalculatorTabProps> = ({ results }) => {
  const t = useTranslations();
  const [taxonView, setTaxonView] = useState<'species' | 'genus' | 'family'>('species');
  
  const [vegTypePalette, setVegTypePalette] = useState<PaletteName>('Viridis');
  const [taxonPalette, setTaxonPalette] = useState<PaletteName>('Viridis');
  const [chordPalette, setChordPalette] = useState<PaletteName>('Viridis');
  
  const vegTypeChartRef = useRef<SVGSVGElement>(null);
  const taxonChartRef = useRef<SVGSVGElement>(null);
  const chordRef = useRef<SVGSVGElement>(null);
  
  const [vegTypeExportFormat, setVegTypeExportFormat] = useState<'svg' | 'png'>('svg');
  const [taxonExportFormat, setTaxonExportFormat] = useState<'svg' | 'png'>('svg');
  const [chordExportFormat, setChordExportFormat] = useState<'svg' | 'png'>('svg');

  const taxonLabels: Record<'species' | 'genus' | 'family', string> = {
      species: t.taxonSpecies,
      genus: t.taxonGenus,
      family: t.taxonFamily
  };

  const taxonMap = useMemo(() => {
    const map: { [key in 'species' | 'genus' | 'family']: Record<string, number> } = { species: {}, genus: {}, family: {} };
    results.processedData.forEach(row => {
        const carbon = Number(row['Carbono_Almacenado_Mg']);
        if (isNaN(carbon) || carbon === 0) return;

        const speciesName = row['N_Científico (Abreviado)'] as string;
        const genusName = row['Género'] as string;
        const familyName = row['Familia'] as string;

        if (typeof speciesName === 'string' && speciesName) map.species[speciesName] = (map.species[speciesName] || 0) + carbon;
        if (typeof genusName === 'string' && genusName) map.genus[genusName] = (map.genus[genusName] || 0) + carbon;
        if (typeof familyName === 'string' && familyName) map.family[familyName] = (map.family[familyName] || 0) + carbon;
    });
    return map;
  }, [results.processedData]);

  const sortedTaxonData = useMemo(() => {
      return Object.entries(taxonMap[taxonView])
          .map(([label, value]) => ({ label, value }))
          .sort((a, b) => Number(b.value) - Number(a.value))
          .slice(0, 20); 
  }, [taxonMap, taxonView]);

  const vegTypeChartData = useMemo(() => {
    return results.summary.map(row => ({
        label: row['Tipo de vegetación'],
        value: row['Carbono_Mg_Total'],
    })).sort((a, b) => b.value - a.value);
  }, [results.summary]);
  
  const chordData = useMemo(() => {
    const topSpecies = sortedTaxonData.filter((_, i) => i < 20).map(d => d.label);
    const vegTypes = Array.from(new Set(results.processedData.map(r => r['Tipo de vegetación'] as string))).filter(Boolean) as string[];
    
    const labels = [...vegTypes, ...topSpecies];
    const matrix = Array(labels.length).fill(0).map(() => Array(labels.length).fill(0));
    
    const vegTypeIndices = new Map<string, number>();
    vegTypes.forEach((vt, i) => vegTypeIndices.set(vt, i));

    const speciesIndices = new Map<string, number>();
    topSpecies.forEach((sp, i) => speciesIndices.set(sp, vegTypes.length + i));

    results.processedData.forEach((row: ForestDataRow) => {
        const vegType = row['Tipo de vegetación'] as string;
        const species = row['N_Científico (Abreviado)'] as string;
        const carbon = Number(row['Carbono_Almacenado_Mg']);

        if (typeof vegType === 'string' && typeof species === 'string' && !isNaN(carbon)) {
            const vegIndex = vegTypeIndices.get(vegType);
            const speciesIndex = speciesIndices.get(species);
            if (vegIndex !== undefined && speciesIndex !== undefined) {
                matrix[speciesIndex][vegIndex] += carbon;
            }
        }
    });

    const colors: Record<string, string> = {};
    const palette = palettes[chordPalette];
    labels.forEach((label, i) => {
        colors[label] = palette[i % palette.length];
    });

    return { matrix, labels, colors, vegTypeCount: vegTypes.length };
  }, [results.processedData, sortedTaxonData, chordPalette]);

  if (!results) {
    return <p className="p-4 bg-yellow-50 text-yellow-800 rounded-md">{t.noDataForBiomass}</p>;
  }

  const handleExportSummary = () => {
    const headers = [t.vegetationType, t.agbMgTotal, t.carbonMgTotal, t.carbonMgHa];
    const rows = results.summary.map(r => [r['Tipo de vegetación'], r.AGB_Mg_Total, r.Carbono_Mg_Total, r['Carbono_Mg/ha'] ?? 'N/A']);
    exportDataToCSV(headers, rows, 'biomass_summary_by_vegetation.csv');
  };

  const handleExportPlotSummary = () => {
    const headers = [t.vegetationType, t.plotColumnHeader, t.agbMgTotal, t.carbonMgTotal, t.carbonMgHa];
    const rows = results.summaryByPlot.map(r => [r['Tipo de vegetación'], r.Parcela, r.AGB_Mg_Total, r.Carbono_Mg_Total, r['Carbono_Mg/ha'] ?? 'N/A']);
    exportDataToCSV(headers, rows, 'biomass_summary_by_plot.csv');
  };

  const handleExportSpeciesSummary = () => {
      const headers = [t.taxonSpecies, t.agbMgTotal, t.carbonMgTotal];
      const rows = Object.entries(taxonMap.species)
          .sort((a, b) => Number(b[1]) - Number(a[1]))
          .map(([name, carbon]) => [name, (Number(carbon) / results.carbonFraction).toFixed(2), Number(carbon).toFixed(2)]);
      exportDataToCSV(headers, rows, 'biomass_summary_by_species.csv');
  };


  return (
    <div className="space-y-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-primary text-center">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.totalAGB}</p>
                <p className="text-3xl font-bold text-primary">{results.totals.agb.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">Mg</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-secondary text-center">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.totalCarbon}</p>
                <p className="text-3xl font-bold text-secondary">{results.totals.carbon.toFixed(2)}</p>
                <p className="text-xs text-gray-400 mt-1">Mg</p>
            </div>
            <div className="bg-white p-6 rounded-xl shadow-md border-t-4 border-accent text-center">
                <p className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">{t.avgCarbonPerHa}</p>
                <p className="text-3xl font-bold text-accent">{results.totals.carbonPerHa ? results.totals.carbonPerHa.toFixed(2) : 'N/A'}</p>
                <p className="text-xs text-gray-400 mt-1">Mg/ha</p>
            </div>
        </div>

        <CarbonUncertaintyPanel results={results} />

        <EquationUsagePanel results={results} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-8">
                <TableSection title={t.summaryByVegType} onExport={handleExportSummary}>
                    <DataTable headers={[t.vegetationType, t.agbMgTotal, t.carbonMgTotal, t.carbonMgHa]} rows={results.summary.map(r => [r['Tipo de vegetación'], r.AGB_Mg_Total.toFixed(2), r.Carbono_Mg_Total.toFixed(2), r['Carbono_Mg/ha'] != null ? Number(r['Carbono_Mg/ha']).toFixed(2) : 'N/A'])} />
                </TableSection>
                
                <TableSection title={t.summaryByPlotTitle} onExport={handleExportPlotSummary}>
                    <DataTable headers={[t.vegetationType, t.plotColumnHeader, t.agbMgTotal, t.carbonMgTotal, t.carbonMgHa]} rows={results.summaryByPlot.map(r => [r['Tipo de vegetación'], r.Parcela, r.AGB_Mg_Total.toFixed(2), r.Carbono_Mg_Total.toFixed(2), r['Carbono_Mg/ha'] != null ? Number(r['Carbono_Mg/ha']).toFixed(2) : 'N/A'])} />
                </TableSection>
                
                <TableSection title={t.summaryBySpecies} onExport={handleExportSpeciesSummary}>
                    <DataTable headers={[t.taxonSpecies, t.agbMgTotal, t.carbonMgTotal]} rows={Object.entries(taxonMap.species).sort((a, b) => Number(b[1]) - Number(a[1])).map(([name, carbon]) => [name, (Number(carbon) / results.carbonFraction).toFixed(2), Number(carbon).toFixed(2)])} />
                </TableSection>
            </div>

            <div className="space-y-8">
                <ChartSection 
                    title={t.carbonByVegTypeChart} 
                    svgRef={vegTypeChartRef} 
                    palette={vegTypePalette} 
                    onPaletteChange={setVegTypePalette} 
                    exportFormat={vegTypeExportFormat} 
                    onFormatChange={setVegTypeExportFormat} 
                    filename="carbon_by_vegetation_type"
                >
                    <HorizontalBarChart data={vegTypeChartData} xAxisLabel={t.yAxisCarbonMg} svgRef={vegTypeChartRef} palette={palettes[vegTypePalette]} />
                </ChartSection>

                <ChartSection 
                    title={t.carbonByTaxonChart} 
                    svgRef={taxonChartRef} 
                    palette={taxonPalette} 
                    onPaletteChange={setTaxonPalette} 
                    exportFormat={taxonExportFormat} 
                    onFormatChange={setTaxonExportFormat} 
                    filename="carbon_by_taxon"
                >
                    <div className="flex justify-center space-x-2 mb-4">
                        { (['species', 'genus', 'family'] as const).map(view => (
                            <button
                                key={view}
                                onClick={() => setTaxonView(view)}
                                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${taxonView === view ? 'bg-primary text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                            >
                                {taxonLabels[view]}
                            </button>
                        ))}
                    </div>
                    <p className="text-[10px] text-gray-400 text-center mb-2 italic">{t.top20Note}</p>
                    <HorizontalBarChart data={sortedTaxonData} xAxisLabel={t.yAxisCarbonMg} svgRef={taxonChartRef} palette={palettes[taxonPalette]} />
                </ChartSection>
            </div>
        </div>

        <div className="p-6 bg-white rounded-xl shadow-md border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h4 className="text-xl font-bold text-primary">{t.chordDiagramTitle}</h4>
                    <p className="text-sm text-gray-500 mt-1">{t.chordDiagramDescription}</p>
                </div>
                <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                        <label className="text-sm font-medium text-gray-700">{t.palette}</label>
                        <select value={chordPalette} onChange={e => setChordPalette(e.target.value as PaletteName)} className="p-1.5 border-gray-300 rounded-md text-sm">
                            {Object.keys(palettes).map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <div className="flex border rounded-md overflow-hidden">
                         <select value={chordExportFormat} onChange={e => setChordExportFormat(e.target.value as 'svg' | 'png')} className="p-1.5 border-none text-sm bg-gray-50">
                            <option value="svg">SVG</option>
                            <option value="png">PNG</option>
                        </select>
                        <button onClick={() => handleExport(chordExportFormat, chordRef, 'carbon_contribution_chord')} className="bg-primary hover:bg-secondary text-white p-2 transition-colors">
                            <ExportIcon className="h-4 w-4" />
                        </button>
                    </div>
                </div>
            </div>
            <ChordDiagram matrix={chordData.matrix} labels={chordData.labels} colors={chordData.colors} vegTypeCount={chordData.vegTypeCount} svgRef={chordRef} />
        </div>
    </div>
  );
};


const fmtP = (p: number) => (p < 0.001 ? '< 0.001' : p.toFixed(3));
const fmtCI = (ci: [number, number] | null) => (ci ? `${ci[0].toFixed(2)} – ${ci[1].toFixed(2)}` : '—');

/** Carbono por tipo de vegetación con su incertidumbre, y comparación entre tipos. */
const CarbonUncertaintyPanel: React.FC<{ results: BiomassAnalysisResults }> = ({ results }) => {
    const t = useTranslations();
    const u = results.uncertainty;
    if (!u || u.byType.length === 0) return null;
    const exportPlots = () => {
        const rows = u.byType.flatMap(b => b.plotValues.map(v => [b.type, v.plot, v.carbonPerHa.toFixed(4)]));
        exportDataToCSV([t.vegetationType, t.plotColumnHeader, 'Mg C/ha'], rows, 'carbono_por_parcela');
    };
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-3">
                <h4 className="text-md font-bold text-secondary uppercase tracking-tight">{t.carbonUncertaintyTitle}</h4>
                <button onClick={exportPlots} className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-md" title={t.exportCSV}><ExportIcon className="h-4 w-4"/></button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left text-gray-600">
                    <thead className="bg-gray-50 uppercase tracking-wider border-b">
                        <tr>
                            <th className="p-2">{t.vegetationType}</th>
                            <th className="p-2 text-right">{t.plotsColumn}</th>
                            <th className="p-2 text-right">{t.meanCarbonPerHa}</th>
                            <th className="p-2 text-right">{t.seColumn}</th>
                            <th className="p-2 text-right">{t.ciSampling}</th>
                            <th className="p-2 text-right">{t.ciTotal}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {u.byType.map(b => (
                            <tr key={b.type}>
                                <td className="p-2">{b.type}</td>
                                <td className="p-2 text-right">{b.nPlots}{b.emptyPlots > 0 ? ` (${b.emptyPlots} ${t.emptyPlotsShort})` : ''}</td>
                                <td className="p-2 text-right font-semibold">{b.mean.toFixed(2)}</td>
                                <td className="p-2 text-right">{b.nPlots > 1 ? b.se.toFixed(2) : '—'}</td>
                                <td className="p-2 text-right">{fmtCI(b.ciSampling)}</td>
                                <td className="p-2 text-right">{fmtCI(b.ciTotal)}</td>
                            </tr>
                        ))}
                        <tr className="bg-gray-50 font-semibold">
                            <td className="p-2">{t.wholeStudy}</td>
                            <td className="p-2 text-right">{u.byType.reduce((a, b) => a + b.nPlots, 0)}</td>
                            <td className="p-2 text-right">{u.overall.carbonPerHa.toFixed(2)}</td>
                            <td className="p-2 text-right">—</td>
                            <td className="p-2 text-right">—</td>
                            <td className="p-2 text-right">{fmtCI(u.overall.ciTotal)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {u.comparison && (
                <div className="mt-3 text-xs text-gray-700">
                    <p className="font-semibold">{t.kruskalLabel}: H = {u.comparison.kruskal.H.toFixed(2)}, gl = {u.comparison.kruskal.df}, p = {fmtP(u.comparison.kruskal.p)}</p>
                    <ul className="list-disc pl-5 mt-1">
                        {u.comparison.dunn.map(d => (
                            <li key={`${d.a}-${d.b}`}>{d.a} vs {d.b}: z = {d.z.toFixed(2)}, p = {fmtP(d.p)}, {t.pAdjShort} = {fmtP(d.pAdj)}</li>
                        ))}
                    </ul>
                </div>
            )}
            <ul className="mt-3 text-xs text-gray-600 list-disc pl-5 space-y-1">
                <li>{t.carbonUncertaintyNote.replace('{n}', String(u.nSimulations)).replace('{seed}', String(u.seed))}</li>
                {u.equationsWithoutModelError.length > 0 && <li className="text-amber-800">{t.noModelErrorNote} {u.equationsWithoutModelError.map(e => results.equationsUsed.find(x => x.equation === e)?.label ?? e).join('; ')}.</li>}
                {Object.keys(results.densitySources ?? {}).length > 0 && (
                    <li>{t.densitySourcesLabel} {Object.entries(results.densitySources).map(([k, n]) => `${k}: ${n}`).join(', ')}{results.woodDensityRegion ? ` (GWDD v2.2, ${results.woodDensityRegion === 'global' ? t.gwddWorld : results.woodDensityRegion})` : ''}.</li>
                )}
            </ul>
        </div>
    );
};

const DIAMETER_LABEL: Record<string, string> = { dbh: 'DAP (1,3 m)', d15: 'd15 (15 cm)', d30: 'd30 (30 cm)' };

/** Ecuaciones aplicadas y avisos que deben revisarse antes de publicar. */
const EquationUsagePanel: React.FC<{ results: BiomassAnalysisResults }> = ({ results }) => {
    const t = useTranslations();
    const usage = results.equationsUsed ?? [];
    if (usage.length === 0) return null;
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <h4 className="text-md font-bold text-secondary uppercase tracking-tight mb-3">{t.equationsUsedTitle}</h4>
            <div className="overflow-x-auto">
                <table className="min-w-full text-xs text-left text-gray-600">
                    <thead className="bg-gray-50 uppercase tracking-wider border-b">
                        <tr>
                            <th className="p-2">{t.equationColumn}</th>
                            <th className="p-2">{t.diameterExpected}</th>
                            <th className="p-2 text-right">{t.individualsColumn}</th>
                            <th className="p-2 text-right">{t.withoutResult}</th>
                            <th className="p-2 text-right">{t.outsideRange}</th>
                            <th className="p-2">{t.verificationColumn}</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {usage.map(u => (
                            <tr key={u.equation} className={u.verified ? '' : 'bg-red-50'}>
                                <td className="p-2">{u.label}</td>
                                <td className="p-2">{DIAMETER_LABEL[u.diameter]}</td>
                                <td className="p-2 text-right">{u.trees}</td>
                                <td className={`p-2 text-right ${u.trees - u.computed > 0 ? 'text-amber-700 font-semibold' : ''}`}>{u.trees - u.computed}</td>
                                <td className={`p-2 text-right ${u.outsideRange > 0 ? 'text-amber-700 font-semibold' : ''}`}>{u.outsideRange}</td>
                                <td className={`p-2 ${u.verified ? 'text-green-700' : 'text-red-700 font-semibold'}`}>{u.verified ? t.verifiedYes : t.verifiedNo}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <ul className="mt-3 text-xs text-gray-600 list-disc pl-5 space-y-1">
                {usage.some(u => !u.verified) && <li className="text-red-700">{t.unverifiedEquationWarning}</li>}
                {usage.some(u => u.diameter !== 'dbh') && <li>{t.diameterWarning}</li>}
                {usage.some(u => u.outsideRange > 0) && <li>{t.outsideRangeWarning}</li>}
                {usage.some(u => (u.fromDapColumn ?? 0) > 0) && (
                    <li>{t.fromDapColumnNote.replace('{n}', String(usage.reduce((a, u) => a + (u.fromDapColumn ?? 0), 0)))}</li>
                )}
                {usage.some(u => Object.keys(u.missing ?? {}).length > 0) && (
                    <li className="text-amber-800">{t.missingInputsWarning}{' '}
                        {usage.filter(u => Object.keys(u.missing ?? {}).length > 0).map(u =>
                            `${u.label}: ${Object.entries(u.missing).map(([col, n]) => `${n} sin «${col}»`).join(', ')}`).join('; ')}
                    </li>
                )}
                {results.withoutEquation > 0 && <li>{t.withoutEquationWarning.replace('{n}', String(results.withoutEquation))}</li>}
            </ul>
        </div>
    );
};

const TableSection: React.FC<{ title: string; onExport: () => void; children: React.ReactNode }> = ({ title, onExport, children }) => {
    const t = useTranslations();
    return (
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-bold text-secondary uppercase tracking-tight">{title}</h4>
                <button onClick={onExport} className="p-1.5 text-gray-400 hover:text-primary hover:bg-gray-50 rounded-md transition-all" title={t.exportCSV}><ExportIcon className="h-4 w-4"/></button>
            </div>
            {children}
        </div>
    );
};

interface ChartSectionProps {
    title: string;
    children: React.ReactNode;
    svgRef: React.RefObject<SVGSVGElement>;
    palette: PaletteName;
    onPaletteChange: (p: PaletteName) => void;
    exportFormat: 'svg' | 'png';
    onFormatChange: (f: 'svg' | 'png') => void;
    filename: string;
}

const ChartSection: React.FC<ChartSectionProps> = ({ title, children, svgRef, palette, onPaletteChange, exportFormat, onFormatChange, filename }) => {
    const t = useTranslations();
    return (
        <div className="bg-white p-5 rounded-xl shadow-md border border-gray-100">
            <div className="flex justify-between items-start mb-6">
                <h4 className="text-md font-bold text-secondary uppercase tracking-tight">{title}</h4>
                <div className="flex flex-col items-end space-y-2">
                     <div className="flex items-center space-x-2">
                        <label className="text-xs font-medium text-gray-500">{t.palette}</label>
                        <select value={palette} onChange={e => onPaletteChange(e.target.value as PaletteName)} className="p-1 border-gray-300 rounded text-xs">
                            {Object.keys(palettes).map(name => <option key={name} value={name}>{name}</option>)}
                        </select>
                    </div>
                    <div className="flex border rounded overflow-hidden">
                         <select value={exportFormat} onChange={e => onFormatChange(e.target.value as 'svg' | 'png')} className="p-1 text-xs bg-gray-50 border-r border-gray-200">
                            <option value="svg">SVG</option>
                            <option value="png">PNG</option>
                        </select>
                        <button onClick={() => handleExport(exportFormat, svgRef, filename)} className="bg-secondary hover:bg-primary text-white px-2 py-1 transition-colors">
                            <ExportIcon className="h-3 w-3" />
                        </button>
                    </div>
                </div>
            </div>
            {children}
        </div>
    );
};

const DataTable: React.FC<{ headers: string[], rows: (string|number|null)[][] }> = ({ headers, rows }) => (
    <div className="overflow-x-auto bg-white rounded shadow-sm max-h-64 border">
        <table className="min-w-full text-xs text-left text-gray-600">
            <thead className="bg-gray-50 uppercase tracking-wider sticky top-0 border-b">
                <tr>
                    {headers.map(h => <th key={h} scope="col" className="p-3 font-semibold">{h}</th>)}
                </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
                {rows.map((row, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                        {row.map((cell, j) => <td key={j} className={`p-3 whitespace-nowrap ${headers[j].toLowerCase().includes('científico') || headers[j].toLowerCase().includes('species') || headers[j].toLowerCase().includes('especie') ? 'italic' : ''}`}>{cell}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    </div>
);


export default BiomassCalculatorTab;
