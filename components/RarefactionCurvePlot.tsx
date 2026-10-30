import React, { useRef, useState } from 'react';
import { RarefactionData, RarefactionPoint } from '../types';
import { useTranslations } from '../translations';
import { ExportIcon } from './Icons';
import { palettes, PaletteName } from './palettes';

// --- Plotting and Export Utilities ---
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
        const svgSize = svgEl.getBoundingClientRect();
        const scale = 3; // For higher resolution (300 DPI equivalent)
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

const SHAPES = ['circle', 'triangle', 'square'];
const Marker: React.FC<{
    shape: string;
    cx: number;
    cy: number;
    size: number;
    [key: string]: any;
}> = ({ shape, cx, cy, size, ...props }) => {
    switch (shape) {
        case 'triangle':
            const h = size * (Math.sqrt(3) / 2);
            return <path d={`M ${cx} ${cy - (2/3)*h} L ${cx - size/2} ${cy + (1/3)*h} L ${cx + size/2} ${cy + (1/3)*h} Z`} {...props} />;
        case 'square':
            return <rect x={cx - size/2} y={cy - size/2} width={size} height={size} {...props} />;
        case 'circle':
        default:
            return <circle cx={cx} cy={cy} r={size/2} {...props} />;
    }
};


/**
 * Cleans and processes an array of data points to ensure there are no duplicate
 * x-coordinates, which can cause rendering artifacts in SVG paths. If duplicates
 * are found, their y-values are averaged.
 * @param points - An array of {x, y} points.
 * @returns A new array of points, sorted by x and free of duplicate x-coordinates.
 */
const cleanAndAveragePoints = (points: RarefactionPoint[]): RarefactionPoint[] => {
    const pointMap = new Map<number, { ySum: number; count: number }>();
    points.forEach(p => {
        if (p.x === undefined || p.y === undefined) return;
        const existing = pointMap.get(p.x);
        if (existing) {
            existing.ySum += p.y;
            existing.count += 1;
        } else {
            pointMap.set(p.x, { ySum: p.y, count: 1 });
        }
    });
    
    const averagedPoints: RarefactionPoint[] = [];
    pointMap.forEach((value, key) => {
        averagedPoints.push({ x: key, y: value.ySum / value.count });
    });

    return averagedPoints.sort((a, b) => a.x - b.x);
};

interface RarefactionCurvePlotProps {
  data: RarefactionData;
}

const RarefactionCurvePlot: React.FC<RarefactionCurvePlotProps> = ({ data }) => {
    const t = useTranslations();
    const svgRef = useRef<SVGSVGElement>(null);
    const [activePalette, setActivePalette] = useState<PaletteName>('Viridis');
    const [exportFormat, setExportFormat] = useState<'svg' | 'png'>('svg');
    const [showCI, setShowCI] = useState<boolean>(true);
    
    const sites = Object.keys(data).sort();
    if (sites.length === 0) return null;

    const allPoints = sites.flatMap(site => [
        ...data[site].observed.curve,
        ...data[site].extrapolated.curve,
        ...data[site].confidenceInterval.lower,
        ...data[site].confidenceInterval.upper,
    ]);
    
    // --- SVG Layout Constants ---
    const PADDING = { top: 60, right: 20, bottom: 60, left: 60 };
    const PLOT_WIDTH = 800;
    const PLOT_HEIGHT = 500;
    const LEGEND_WIDTH = 200;
    const WIDTH = PADDING.left + PLOT_WIDTH + LEGEND_WIDTH + PADDING.right;
    const HEIGHT = PADDING.top + PLOT_HEIGHT + PADDING.bottom;
    
    const xMax = Math.max(1, ...allPoints.map(p => p.x)) * 1.05;
    const yMax = Math.max(1, ...allPoints.map(p => p.y)) * 1.05;
    const xMin = -xMax * 0.02;
    const yMin = -yMax * 0.02;

    const xScale = (x: number) => PADDING.left + ((x - xMin) / (xMax - xMin)) * PLOT_WIDTH;
    const yScale = (y: number) => PADDING.top + PLOT_HEIGHT - ((y - yMin) / (yMax - yMin)) * PLOT_HEIGHT;
    
    const createPath = (points: RarefactionPoint[]) => {
        if (points.length === 0) return "M0,0";
        return "M" + points.map(p => `${xScale(p.x)},${yScale(p.y)}`).join(" L");
    };

    const confidenceAreaGenerator = (lower: RarefactionPoint[], upper: RarefactionPoint[]) => {
        if (lower.length === 0 || upper.length === 0) return "";
        const lowerPath = lower.map(p => `${xScale(p.x)},${yScale(p.y)}`).join(" L");
        const upperPathReversed = [...upper].reverse().map(p => `${xScale(p.x)},${yScale(p.y)}`).join(" L");
        return `M${lowerPath} L${upperPathReversed} Z`;
    };

    const colors = palettes[activePalette];
    
    return (
        <div className="space-y-4">
             <div className="flex flex-wrap items-center gap-4 p-3 bg-gray-50 border rounded-lg">
                <div className="flex-grow">
                    <label htmlFor="rarefaction-palette-select" className="block text-sm font-medium text-gray-700 mb-1">{t.palette}</label>
                    <select id="rarefaction-palette-select" value={activePalette} onChange={e => setActivePalette(e.target.value as PaletteName)} className="w-full p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                        {Object.keys(palettes).map(name => <option key={name} value={name}>{name}</option>)}
                    </select>
                </div>
                <div className="flex items-end pt-5">
                     <div className="flex items-center">
                        <input type="checkbox" id="show-ci-toggle" checked={showCI} onChange={() => setShowCI(!showCI)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                        <label htmlFor="show-ci-toggle" className="ml-2 text-sm text-gray-700 select-none cursor-pointer">{t.showCI}</label>
                    </div>
                </div>
                 <div className="flex-grow">
                    <label htmlFor="export-format-select" className="block text-sm font-medium text-gray-700 mb-1">{t.exportFormat}</label>
                    <div className="flex">
                        <select id="export-format-select" value={exportFormat} onChange={e => setExportFormat(e.target.value as 'svg' | 'png')} className="w-full p-2 border-gray-300 rounded-l-md shadow-sm focus:ring-primary focus:border-primary">
                            <option value="svg">SVG</option>
                            <option value="png">PNG</option>
                        </select>
                        <button onClick={() => handleExport(exportFormat, svgRef, 'rarefaction-curve')} className="bg-primary hover:bg-secondary text-white font-semibold py-2 px-4 rounded-r-md transition-colors flex items-center">
                            <ExportIcon className="h-4 w-4 mr-2" />
                            {t.downloadChart}
                        </button>
                    </div>
                </div>
            </div>

            <div className="overflow-x-auto bg-white rounded-lg shadow border">
                <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto min-w-[600px]">
                    <rect x="0" y="0" width={WIDTH} height={HEIGHT} fill="white" />
                    <text x={WIDTH/2 - LEGEND_WIDTH/2} y={PADDING.top / 3} textAnchor="middle" fontSize="20" className="font-bold">{t.rarefactionPlotTitle}</text>
                    <text x={WIDTH/2 - LEGEND_WIDTH/2} y={(PADDING.top / 3) + 25} textAnchor="middle" fontSize="16" fill="#4b5563">{t.rarefactionPlotSubtitle}</text>

                    {/* Y-Axis Grid & Labels */}
                    <text transform={`rotate(-90, ${PADDING.left / 2.5}, ${HEIGHT / 2})`} x={PADDING.left / 2.5} y={HEIGHT / 2} textAnchor="middle" fontSize="14" className="font-semibold">{t.yAxisSpeciesDiversity}</text>
                    {Array.from({ length: 6 }).map((_, i) => {
                        const value = (i * yMax / 5);
                        if (value < 0) return null;
                        const y = yScale(value);
                        return (
                            <g key={`y-axis-${i}`}>
                                <line x1={PADDING.left} y1={y} x2={PADDING.left + PLOT_WIDTH} y2={y} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
                                <text x={PADDING.left - 8} y={y + 4} textAnchor="end" fontSize="12">{Math.round(value)}</text>
                            </g>
                        );
                    })}
                    
                    {/* X-Axis Grid & Labels */}
                    <text x={(PLOT_WIDTH / 2) + PADDING.left} y={HEIGHT - PADDING.bottom + 40} textAnchor="middle" fontSize="14" className="font-semibold">{t.xAxisIndividuals}</text>
                    {Array.from({ length: 7 }).map((_, i) => {
                        const value = (i * xMax / 6);
                         if (value < 0) return null;
                        const x = xScale(value);
                        return (
                            <g key={`x-axis-${i}`}>
                                <line x1={x} y1={PADDING.top} x2={x} y2={HEIGHT - PADDING.bottom} stroke="#e5e7eb" strokeWidth="1" strokeDasharray="3 3" />
                                <text x={x} y={HEIGHT - PADDING.bottom + 20} textAnchor="middle" fontSize="12">{Math.round(value)}</text>
                            </g>
                        );
                    })}
                    
                    {/* Main Axes */}
                    <line x1={PADDING.left} y1={yScale(0)} x2={PADDING.left + PLOT_WIDTH} y2={yScale(0)} stroke="#374151" strokeWidth="1" />
                    <line x1={xScale(0)} y1={PADDING.top} x2={xScale(0)} y2={HEIGHT - PADDING.bottom} stroke="#374151" strokeWidth="1" />

                    {/* Curves */}
                    {sites.map((site, i) => {
                        const curve = data[site];
                        const color = colors[i % colors.length];
                        const shape = SHAPES[i % SHAPES.length];
                        const zeroPoint = { x: 0, y: 0 };
                        const observedPoint = curve.observed.point;

                        const rarefactionPoints = cleanAndAveragePoints([zeroPoint, ...curve.observed.curve]);
                        const extrapolationPoints = cleanAndAveragePoints([observedPoint, ...curve.extrapolated.curve]);

                        const lowerCI = cleanAndAveragePoints([zeroPoint, ...curve.confidenceInterval.lower]);
                        const upperCI = cleanAndAveragePoints([zeroPoint, ...curve.confidenceInterval.upper]);

                        const rarefactionPath = createPath(rarefactionPoints);
                        const extrapolationPath = createPath(extrapolationPoints);


                        return (
                            <g key={site}>
                                {showCI && <path d={confidenceAreaGenerator(lowerCI, upperCI)} fill={color} fillOpacity="0.2" />}
                                <path d={rarefactionPath} stroke={color} fill="none" strokeWidth="2" />
                                <path d={extrapolationPath} stroke={color} fill="none" strokeWidth="2" strokeDasharray="6 6" />
                                <Marker
                                    shape={shape}
                                    cx={xScale(curve.observed.point.x)}
                                    cy={yScale(curve.observed.point.y)}
                                    size={10}
                                    fill={color}
                                    stroke="white"
                                    strokeWidth="1.5"
                                />
                            </g>
                        );
                    })}
                    
                    {/* Legend */}
                    <g transform={`translate(${PADDING.left + PLOT_WIDTH + 40}, ${PADDING.top})`} className="legend-text">
                        {/* Site Legend */}
                        <text x="0" y="0" fontSize="14" className="font-semibold">{t.legendSite}</text>
                        {sites.map((site, i) => {
                            const color = colors[i % colors.length];
                            const shape = SHAPES[i % SHAPES.length];
                            const yOffset = 25 + i * 25;
                            return (
                                <g key={site} transform={`translate(0, ${yOffset})`}>
                                    <Marker shape={shape} cx={5} cy={0} size={8} fill={color} />
                                    <text x="20" y="4" fontSize="12">{site}</text>
                                </g>
                            );
                        })}

                        {/* Line Type Legend */}
                        <g transform={`translate(0, ${25 + sites.length * 25 + 30})`}>
                            <text x="0" y="0" fontSize="14" className="font-semibold">{t.legendLineType}</text>
                            <line x1="5" y1="20" x2="35" y2="20" stroke="black" strokeWidth="2" />
                            <text x="45" y="24" fontSize="12">{t.legendRarefaction}</text>
                            <line x1="5" y1="45" x2="35" y2="45" stroke="black" strokeWidth="2" strokeDasharray="4 4" />
                            <text x="45" y="49" fontSize="12">{t.legendExtrapolation}</text>
                        </g>
                    </g>
                </svg>
            </div>
        </div>
    );
};

export default RarefactionCurvePlot;