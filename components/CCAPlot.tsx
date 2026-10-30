
import React, { useRef, useState, useMemo } from 'react';
import { SiteCCAPlotData, SingleCCAPlotData, CCACoordinates, CorrelationMatrix } from '../types';
import { ExportIcon, ScatterChartIcon } from './Icons';
import { useTranslations } from '../translations';
import { palettes, PaletteName } from './palettes';
import { naturalCompare } from '../services/stats/cca';

export type EllipseMode = 'none' | 'sd' | 'se';
const LABEL_OPTIONS = [0, 5, 10, 15, 25, Infinity];

const PADDING = 80; // Increased padding to prevent labels from overflowing
const WIDTH = 600;
const HEIGHT = 500;

// Helper to trigger SVG download
const exportSVG = (svgEl: SVGSVGElement | null, filename: string) => {
    if (!svgEl) return;
    
    const svgClone = svgEl.cloneNode(true) as SVGSVGElement;
    // Explicitly set background to white for export
    svgClone.style.backgroundColor = "white";

    const style = document.createElement('style');
    // Add styles for exported SVG since classes are not carried over
    style.textContent = `
        .font-semibold { font-weight: 600; }
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

// This hook calculates label positions using a simple physics simulation to avoid overlaps.
const useLabelPositions = (
    points: CCACoordinates[],
    scaleX: (v: number) => number,
    scaleY: (v: number) => number,
    showLabels: boolean
) => {
    return useMemo(() => {
        if (!showLabels || points.length === 0) {
            return [];
        }

        // Only generate labels for points that are NOT background points and have a name
        const labels = points
            .filter(p => !p.isBackground && p.name)
            .map(p => {
                const FONT_SIZE = 10;
                const scaledX = scaleX(p.x);
                const scaledY = scaleY(p.y);

                // Radially position anchor point away from the plot center
                const plotCenterX = PADDING + (WIDTH - PADDING * 2) / 2;
                const plotCenterY = PADDING + (HEIGHT - PADDING * 2) / 2;
                const dx = scaledX - plotCenterX;
                const dy = scaledY - plotCenterY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const unitDx = dx / (dist || 1);
                const unitDy = dy / (dist || 1);
                
                const LABEL_OFFSET = 12; // Start labels a bit away from their points
                const anchorX = scaledX + unitDx * LABEL_OFFSET;
                const anchorY = scaledY + unitDy * LABEL_OFFSET;

                return {
                    x: anchorX,
                    y: anchorY,
                    width: p.name.length * (FONT_SIZE * 0.55) + 4,
                    height: FONT_SIZE + 4,
                    originalAnchor: { x: anchorX, y: anchorY },
                    point: p,
                    scaledPoint: { x: scaledX, y: scaledY } // Store scaled point for connector line
                };
            });

        // Simulation parameters - tuned for better separation
        const REPULSION_STRENGTH = 0.8;
        const ATTRACTION_STRENGTH = 0.04; // Weak attraction to allow labels to move
        const ITERATIONS = 150;

        for (let iter = 0; iter < ITERATIONS; iter++) {
            for (let i = 0; i < labels.length; i++) {
                // Repulsion from other labels
                for (let j = i + 1; j < labels.length; j++) {
                    const labelA = labels[i];
                    const labelB = labels[j];

                    const aRight = labelA.x + labelA.width;
                    const aLeft = labelA.x - (labelA.point.x < 0 ? labelA.width : 0);
                    const aTop = labelA.y - labelA.height;
                    const aBottom = labelA.y;

                    const bRight = labelB.x + labelB.width;
                    const bLeft = labelB.x - (labelB.point.x < 0 ? labelB.width : 0);
                    const bTop = labelB.y - labelB.height;
                    const bBottom = labelB.y;
                    
                    const overlapX = Math.max(0, Math.min(aRight, bRight) - Math.max(aLeft, bLeft));
                    const overlapY = Math.max(0, Math.min(aBottom, bBottom) - Math.max(aTop, bTop));

                    if (overlapX > 0 && overlapY > 0) {
                        const dx = labelB.x - labelA.x;
                        const dy = labelB.y - labelA.y;
                        const distance = Math.sqrt(dx * dx + dy * dy) + 1e-6;
                        
                        const moveX = (dx / distance) * REPULSION_STRENGTH;
                        const moveY = (dy / distance) * REPULSION_STRENGTH;

                        labelA.x -= moveX;
                        labelA.y -= moveY;
                        labelB.x += moveX;
                        labelB.y += moveY;
                    }
                }

                // Attraction to original anchor point
                const label = labels[i];
                const attractDx = label.originalAnchor.x - label.x;
                const attractDy = label.originalAnchor.y - label.y;
                label.x += attractDx * ATTRACTION_STRENGTH;
                label.y += attractDy * ATTRACTION_STRENGTH;
            }
        }
        return labels;
    }, [points, scaleX, scaleY, showLabels]);
};


const SITE_SHAPES = ['circle', 'triangle', 'square', 'diamond'] as const;

const SiteMarker: React.FC<{ shape: typeof SITE_SHAPES[number]; cx: number; cy: number; r: number; fill: string }> = ({ shape, cx, cy, r, fill }) => {
    switch (shape) {
        case 'triangle':
            return <path d={`M ${cx} ${cy - r * 1.2} L ${cx - r * 1.1} ${cy + r * 0.8} L ${cx + r * 1.1} ${cy + r * 0.8} Z`} fill={fill} stroke="white" strokeWidth="0.8" />;
        case 'square':
            return <rect x={cx - r} y={cy - r} width={2 * r} height={2 * r} fill={fill} stroke="white" strokeWidth="0.8" />;
        case 'diamond':
            return <path d={`M ${cx} ${cy - r * 1.3} L ${cx + r * 1.1} ${cy} L ${cx} ${cy + r * 1.3} L ${cx - r * 1.1} ${cy} Z`} fill={fill} stroke="white" strokeWidth="0.8" />;
        default:
            return <circle cx={cx} cy={cy} r={r} fill={fill} stroke="white" strokeWidth="0.8" />;
    }
};

const Biplot: React.FC<{ data: SingleCCAPlotData, palette: PaletteName, showLabels: boolean, showConnectors: boolean, ellipseMode: EllipseMode, nSpeciesLabels: number, showSites: boolean, svgRef: React.RefObject<SVGSVGElement> }> = ({ data, palette, showLabels, showConnectors, ellipseMode, nSpeciesLabels, showSites, svgRef }) => {
    const t = useTranslations();
    // Se etiquetan las N especies de mayor peso (abundancia total); el resto se dibuja como punto.
    const species = useMemo(() => {
        const all = data.biplot.species;
        if (!all.some(s => typeof s.weight === 'number')) return all;
        const keep = new Set(all.slice().sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0)).slice(0, nSpeciesLabels).map(s => s.name));
        return all.map(s => ({ ...s, isBackground: !keep.has(s.name) }));
    }, [data, nSpeciesLabels]);
    const showEllipses = ellipseMode !== 'none';
    const ellipseList = ellipseMode === 'se' ? (data.ellipsesSE ?? []) : ellipseMode === 'sd' ? (data.ellipses ?? []) : [];
    const sites = showSites ? (data.biplot.sites ?? []) : [];
    const groups = useMemo(() => Array.from(new Set((data.biplot.sites ?? []).map(s => s.group || ''))).sort(naturalCompare), [data]);
    const PLOT_WIDTH = WIDTH - PADDING * 2;
    const PLOT_HEIGHT = HEIGHT - PADDING * 2;

    // Environmental arrows are correlations (|r| ≤ 1). As in vegan's ordiArrowMul, they are multiplied by a
    // common factor so that the longest arrow reaches 75% of the extent of the plotted scores.
    const arrowMul = useMemo(() => {
        const pts = [...species, ...sites];
        const extent = Math.max(1e-9, ...pts.map(p => Math.max(Math.abs(p.x), Math.abs(p.y))));
        const longest = Math.max(1e-9, ...data.biplot.vectors.map(v => Math.hypot(v.x, v.y)));
        return (0.75 * extent) / longest;
    }, [data, species, sites]);
    const vectors = useMemo(() => data.biplot.vectors.map(v => ({ ...v, x: v.x * arrowMul, y: v.y * arrowMul })), [data, arrowMul]);
    const allPoints = useMemo(() => [...species, ...vectors, ...sites], [species, vectors, sites]);

    const { scaleX, scaleY, originX, originY } = useMemo(() => {
        const xs = allPoints.map(p => p.x).filter(Number.isFinite);
        const ys = allPoints.map(p => p.y).filter(Number.isFinite);
        if (showEllipses) {
            ellipseList.forEach(e => {
                const r = Math.max(e.rx, e.ry);
                xs.push(e.cx - r, e.cx + r);
                ys.push(e.cy - r, e.cy + r);
            });
        }
        if (xs.length === 0 || ys.length === 0) {
            const fallbackScale = (v: number) => v + WIDTH / 2;
            return { scaleX: fallbackScale, scaleY: fallbackScale, originX: WIDTH / 2, originY: HEIGHT / 2 };
        }
        const minX = Math.min(...xs, 0), maxX = Math.max(...xs, 0);
        const minY = Math.min(...ys, 0), maxY = Math.max(...ys, 0);
        const rangeX = maxX - minX, rangeY = maxY - minY;
        // Same scale on both axes so that distances and angles are preserved (aspect ratio 1).
        const scaleFactor = Math.min(PLOT_WIDTH / (rangeX || 1), PLOT_HEIGHT / (rangeY || 1)) * 0.95;
        const midX = minX + rangeX / 2;
        const midY = minY + rangeY / 2;
        const sX = (x: number) => PADDING + PLOT_WIDTH / 2 + (x - midX) * scaleFactor;
        const sY = (y: number) => PADDING + PLOT_HEIGHT / 2 - (y - midY) * scaleFactor;
        return { scaleX: sX, scaleY: sY, originX: sX(0), originY: sY(0) };
    }, [allPoints, ellipseList, showEllipses, PLOT_WIDTH, PLOT_HEIGHT]);

    const colors = palettes[palette];
    const groupColor = (g?: string) => colors[Math.max(0, groups.indexOf(g || '')) % colors.length];
    const groupShape = (g?: string) => SITE_SHAPES[Math.max(0, groups.indexOf(g || '')) % SITE_SHAPES.length];
    const vectorColor = palette === 'Greyscale' ? '#000000' : '#1d4ed8';
    const labelPoints = useMemo(() => [...species, ...vectors], [species, vectors]);
    const labelPositions = useLabelPositions(labelPoints, scaleX, scaleY, showLabels);
    const pct = data.varianceExplained ?? [0, 0];

    return (
        <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT + (groups.length > 1 && showSites ? 30 : 0)}`} className="w-full h-auto">
            <rect x="0" y="0" width={WIDTH} height={HEIGHT + 30} fill="white" />
            <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="strokeWidth">
                    <polygon points="0 0, 10 3.5, 0 7" fill={vectorColor} />
                </marker>
            </defs>

            <text x={PADDING + PLOT_WIDTH / 2} y={HEIGHT - PADDING / 2.5} textAnchor="middle" fontSize="12" className="font-semibold">{`CCA1 (${pct[0].toFixed(1)} %)`}</text>
            <text transform={`rotate(-90, ${PADDING / 2.5}, ${PADDING + PLOT_HEIGHT / 2})`} x={PADDING / 2.5} y={PADDING + PLOT_HEIGHT / 2} textAnchor="middle" fontSize="12" className="font-semibold">{`CCA2 (${pct[1].toFixed(1)} %)`}</text>

            <rect x={PADDING} y={PADDING} width={PLOT_WIDTH} height={PLOT_HEIGHT} fill="none" stroke="#9ca3af" />
            <line x1={PADDING} y1={originY} x2={WIDTH - PADDING} y2={originY} stroke="#d1d5db" strokeDasharray="4 3" />
            <line x1={originX} y1={PADDING} x2={originX} y2={HEIGHT - PADDING} stroke="#d1d5db" strokeDasharray="4 3" />

            {showEllipses && ellipseList.map(ellipse => {
                const scaledCx = scaleX(ellipse.cx);
                const scaledCy = scaleY(ellipse.cy);
                const radiusX = Math.abs(ellipse.rx * (scaleX(1) - scaleX(0)));
                const radiusY = Math.abs(ellipse.ry * (scaleY(0) - scaleY(1)));
                if (![scaledCx, scaledCy, radiusX, radiusY].every(Number.isFinite)) return null;
                const color = groupColor(ellipse.group);
                return (
                    <ellipse
                        key={ellipse.group}
                        cx={scaledCx}
                        cy={scaledCy}
                        rx={radiusX}
                        ry={radiusY}
                        transform={`rotate(${-ellipse.angle * 180 / Math.PI}, ${scaledCx}, ${scaledCy})`}
                        fill={color}
                        fillOpacity="0.12"
                        stroke={color}
                        strokeWidth="1.2"
                    />
                );
            })}

            {sites.map(s => (
                <g key={`site-${s.name}`}>
                    <title>{`${s.name} (${s.group})`}</title>
                    <SiteMarker shape={groupShape(s.group)} cx={scaleX(s.x)} cy={scaleY(s.y)} r={4} fill={groupColor(s.group)} />
                </g>
            ))}

            {species.map(sp => (
                <g key={`sp-${sp.name}`}>
                    <title>{sp.name}</title>
                    <circle cx={scaleX(sp.x)} cy={scaleY(sp.y)} r={sp.isBackground ? 1.8 : 2.8} fill="#374151" fillOpacity={sp.isBackground ? 0.5 : 0.9} />
                </g>
            ))}

            {vectors.map(v => (
                <g key={`vec-${v.name}`}>
                    <title>{v.name}</title>
                    <line x1={originX} y1={originY} x2={scaleX(v.x)} y2={scaleY(v.y)} stroke={vectorColor} strokeWidth="1.8" markerEnd="url(#arrowhead)" />
                </g>
            ))}

            {showLabels && labelPositions.map((label) => {
                const isVector = vectors.some(v => v.name === label.point.name && v.x === label.point.x);
                const textAnchor = label.x > label.scaledPoint.x ? 'start' : 'end';
                return (
                    <g key={`${label.point.name}-label-group`} className="pointer-events-none">
                        {showConnectors && (
                            <line x1={label.scaledPoint.x} y1={label.scaledPoint.y} x2={label.x + (textAnchor === 'start' ? -2 : 2)} y2={label.y - 4} stroke="#6b7280" strokeWidth="0.5" />
                        )}
                        <text x={label.x} y={label.y} fontSize="10" fill={isVector ? vectorColor : '#111827'} className={isVector ? 'font-semibold' : 'italic'} textAnchor={textAnchor}>
                            {label.point.name}
                        </text>
                    </g>
                );
            })}

            {groups.length > 1 && showSites && (() => {
                // Legend laid out left to right, wrapping to a new line when the row is full.
                let x = 0;
                let row = 0;
                const items = groups.map(g => {
                    const w = 22 + g.length * 5.6;
                    if (x + w > WIDTH - 2 * 20 && x > 0) { x = 0; row++; }
                    const item = { g, x, row };
                    x += w + 10;
                    return item;
                });
                return (
                    <g transform={`translate(20, ${HEIGHT - 6})`}>
                        {items.map(({ g, x: ix, row: r }) => (
                            <g key={g} transform={`translate(${ix}, ${r * 16})`}>
                                <SiteMarker shape={groupShape(g)} cx={6} cy={0} r={4} fill={groupColor(g)} />
                                <text x={16} y={4} fontSize="10">{g.replace(/_/g, ' ')}</text>
                            </g>
                        ))}
                    </g>
                );
            })()}
            <text x={WIDTH - PADDING} y={PADDING - 8} textAnchor="end" fontSize="9" fill="#6b7280">{`${t.ccaArrowScale} ×${arrowMul.toFixed(2)}`}</text>
        </svg>
    );
}

const CorrelationHeatmap: React.FC<{ matrix: CorrelationMatrix, palette: PaletteName, svgRef: React.RefObject<SVGSVGElement> }> = ({ matrix, palette, svgRef }) => {
    const t = useTranslations();
    const species = Object.keys(matrix).sort();
    const factors = species.length > 0 ? Object.keys(matrix[species[0]]).sort() : [];
    if (species.length === 0 || factors.length === 0) return null;

    const CELL_SIZE = 25;
    const PADDING_TOP = 100;
    const PADDING_LEFT = 150;
    const LEGEND_WIDTH = 120;
    const WIDTH = PADDING_LEFT + factors.length * CELL_SIZE + 20 + LEGEND_WIDTH;
    const HEIGHT = PADDING_TOP + species.length * CELL_SIZE + 20;
    const currentPalette = palettes[palette];
    const positiveColor = currentPalette.length > 4 ? currentPalette[1] : currentPalette[0];
    const negativeColor = currentPalette.length > 4 ? currentPalette[3] : currentPalette[1];


    return (
        <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto">
             {factors.map((f, i) => (
                <text key={f} x={PADDING_LEFT + (i + 0.5) * CELL_SIZE} y={PADDING_TOP - 10} transform={`rotate(-65, ${PADDING_LEFT + (i + 0.5) * CELL_SIZE}, ${PADDING_TOP - 10})`} textAnchor="start" fontSize="10">{f}</text>
            ))}
             {species.map((s, i) => (
                <text key={s} x={PADDING_LEFT - 10} y={PADDING_TOP + (i + 0.5) * CELL_SIZE} textAnchor="end" fontSize="10" className="italic">{s}</text>
            ))}

            {species.map((s, i) =>
                factors.map((f, j) => {
                    const value = matrix[s][f];
                    if (value === undefined || isNaN(value) || !Number.isFinite(value)) {
                        return null;
                    }
                    const absValue = Math.abs(value);
                    const color = value > 0 ? positiveColor : negativeColor;
                    const rectX = PADDING_LEFT + j * CELL_SIZE + (CELL_SIZE - absValue * CELL_SIZE) / 2;
                    const rectY = PADDING_TOP + i * CELL_SIZE + (CELL_SIZE - absValue * CELL_SIZE) / 2;
                    const rectW = absValue * CELL_SIZE;
                    const rectH = absValue * CELL_SIZE;
                    if (!Number.isFinite(rectX) || !Number.isFinite(rectY) || !Number.isFinite(rectW) || !Number.isFinite(rectH)) {
                        return null;
                    }
                    return (
                        <rect
                            key={`${s}-${f}`}
                            x={rectX}
                            y={rectY}
                            width={rectW}
                            height={rectH}
                            fill={color}
                        >
                            <title>{`${s} & ${f}: ${value.toFixed(2)}`}</title>
                        </rect>
                    )
                })
            )}
            
            {/* Legend */}
            <g transform={`translate(${WIDTH - LEGEND_WIDTH + 10}, ${PADDING_TOP})`}>
                <text x="10" y="0" fontSize="12" className="font-semibold">{t.legendCorrelation}</text>
                
                {/* Color Key */}
                <rect x="10" y="20" width="15" height="15" fill={positiveColor} />
                <text x="30" y="32" fontSize="10">{t.positive}</text>
                <rect x="10" y="40" width="15" height="15" fill={negativeColor} />
                <text x="30" y="52" fontSize="10">{t.negative}</text>

                {/* Size Key */}
                <g transform={`translate(0, 40)`}>
                    <text x="10" y="50" fontSize="12" className="font-semibold">{t.legendStrength}</text>
                    <rect x="15" y="65" width="8" height="8" fill="#a1a1aa" />
                    <rect x="27" y="62.5" width="13" height="13" fill="#a1a1aa" />
                    <rect x="44" y="60" width="18" height="18" fill="#a1a1aa" />
                </g>
            </g>
        </svg>
    )
}

interface CCAPlotProps {
  data: SiteCCAPlotData | null;
  ellipseMode: EllipseMode;
  onEllipseModeChange: (mode: EllipseMode) => void;
  sites: string[];
  selectedSite: string;
  onSiteChange: (site: string) => void;
  isLoading: boolean;
}

export const CCAPlot: React.FC<CCAPlotProps> = ({ data, sites, selectedSite, onSiteChange, isLoading, ellipseMode, onEllipseModeChange }) => {
    const t = useTranslations();
    const [biplotPalette, setBiplotPalette] = useState<PaletteName>('Viridis');
    const [heatmapPalette, setHeatmapPalette] = useState<PaletteName>('Viridis');
    const [showLabels, setShowLabels] = useState(true);
    const [nSpeciesLabels, setNSpeciesLabels] = useState(10);
    const [showConnectors, setShowConnectors] = useState(true);
    const [showSites, setShowSites] = useState(true);

    const biplotRef = useRef<SVGSVGElement>(null);
    const heatmapRef = useRef<SVGSVGElement>(null);

    const siteOptions = ['General', ...sites];
    const currentData = data ? data[selectedSite] : null;

    if (isLoading) {
        return <div className="flex justify-center items-center p-6"><div className="loader w-6 h-6 border-4 border-secondary border-t-transparent rounded-full animate-spin mr-3"></div><p>{t.ccaSiteLoading}</p></div>;
    }
    const siteSelector = (
        <div className="flex items-center space-x-2">
            <label htmlFor="site-select-cca" className="text-sm font-medium text-gray-700">{t.selectSiteCCA}</label>
            <select id="site-select-cca" value={selectedSite} onChange={e => onSiteChange(e.target.value)} className="p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                {siteOptions.map(site => <option key={site} value={site}>{site}</option>)}
            </select>
        </div>
    );
    if (!currentData || currentData.biplot.species.length === 0) {
        return (
            <div className="space-y-3">
                <div className="flex justify-end">{siteSelector}</div>
                <div className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm space-y-1">
                    <p>{t.noDataForSite}</p>
                    {currentData?.notes?.map((n, i) => <p key={i}>{n}</p>)}
                </div>
            </div>
        );
    }
    const st = currentData.stats;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <h3 className="text-xl font-bold text-primary flex items-center">
                    <ScatterChartIcon className="h-5 w-5 mr-2" /> {t.ccaVisualizationTitle}
                </h3>
                {siteSelector}
            </div>

            <div className="grid grid-cols-1 gap-8">
                <div className="p-4 border border-gray-200 rounded-lg bg-white">
                    <div className="flex justify-between items-center mb-2 flex-wrap gap-y-2">
                         <h4 className="text-lg font-semibold text-secondary">{t.ccaBiplotTitle}</h4>
                         <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
                            <div className="flex items-center space-x-2">
                                <label htmlFor="cca-palette-select" className="text-sm font-medium text-gray-700">{t.palette}</label>
                                <select id="cca-palette-select" value={biplotPalette} onChange={e => setBiplotPalette(e.target.value as PaletteName)} className="p-1.5 border-gray-300 rounded-md shadow-sm">
                                    {Object.keys(palettes).map(name => <option key={name} value={name}>{name}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="show-labels" checked={showLabels} onChange={() => setShowLabels(!showLabels)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                                <label htmlFor="show-labels" className="ml-2 text-sm text-gray-700 select-none cursor-pointer">{t.showLabels}</label>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="show-connectors" checked={showConnectors && showLabels} disabled={!showLabels} onChange={() => setShowConnectors(!showConnectors)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary disabled:bg-gray-200 disabled:cursor-not-allowed"/>
                                <label htmlFor="show-connectors" className={`ml-2 text-sm select-none ${!showLabels ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700 cursor-pointer'}`}>{t.showConnectors}</label>
                            </div>
                            <div className="flex items-center">
                                <input type="checkbox" id="show-sites" checked={showSites} onChange={() => setShowSites(!showSites)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                                <label htmlFor="show-sites" className="ml-2 text-sm text-gray-700 select-none cursor-pointer">{t.showSites}</label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <label htmlFor="cca-label-count" className="text-sm font-medium text-gray-700">{t.ccaSpeciesLabels}</label>
                                <select id="cca-label-count" value={String(nSpeciesLabels)} onChange={e => setNSpeciesLabels(Number(e.target.value))} disabled={!showLabels} className="p-1.5 border-gray-300 rounded-md shadow-sm disabled:bg-gray-100">
                                    {LABEL_OPTIONS.map(n => <option key={n} value={String(n)}>{Number.isFinite(n) ? n : t.all}</option>)}
                                </select>
                            </div>
                            <div className="flex items-center space-x-2">
                                <label htmlFor="cca-ellipse-mode" className="text-sm font-medium text-gray-700">{t.ccaEllipses}</label>
                                <select id="cca-ellipse-mode" value={ellipseMode} onChange={e => onEllipseModeChange(e.target.value as EllipseMode)} className="p-1.5 border-gray-300 rounded-md shadow-sm">
                                    <option value="se">{t.ccaEllipseSE}</option>
                                    <option value="sd">{t.ccaEllipseSD}</option>
                                    <option value="none">{t.ccaEllipseNone}</option>
                                </select>
                            </div>
                            <button onClick={() => exportSVG(biplotRef.current, `cca-biplot-${selectedSite}.svg`)} className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-lg text-sm"><ExportIcon className="h-4 w-4 mr-1"/> SVG</button>
                        </div>
                    </div>
                     <Biplot data={currentData} palette={biplotPalette} showLabels={showLabels} showConnectors={showConnectors} ellipseMode={ellipseMode} nSpeciesLabels={nSpeciesLabels} showSites={showSites} svgRef={biplotRef} />
                     {st && (
                        <div className="mt-3 text-sm text-gray-700 space-y-1 border-t pt-3">
                            <p>
                                <span className="font-semibold">{t.ccaConstrainedInertia}:</span> {st.constrainedInertia.toFixed(4)} / {st.totalInertia.toFixed(4)} ({st.constrainedPercent.toFixed(1)} %).{' '}
                                <span className="font-semibold">{t.ccaPermutationTest}:</span> F = {st.F.toFixed(3)}, gl = {st.df}, {st.dfResidual}, p = {st.pValue.toFixed(3)} ({st.nPermutations} {t.permutations}).
                            </p>
                            <p>
                                <span className="font-semibold">{t.ccaEigenvalues}:</span> {st.eigenvalues.map((e, i) => `CCA${i + 1} = ${e.toFixed(4)} (${st.axisPercent[i].toFixed(1)} %)`).join('; ')}.
                            </p>
                            <p>
                                <span className="font-semibold">VIF:</span>{' '}
                                {Object.entries(st.vif).map(([k, v], i) => {
                                    const high = !Number.isFinite(v) || (v as number) > 10;
                                    return <span key={k} className={high ? 'text-red-700 font-semibold' : ''}>{i > 0 ? '; ' : ''}{k} = {Number.isFinite(v) ? (v as number).toFixed(2) : '∞'}</span>;
                                })}.{' '}
                                <span className="text-gray-500">{t.ccaVifNote}</span>
                            </p>
                            {Object.values(st.vif).some(v => !Number.isFinite(v) || (v as number) > 10) && (
                                <p className="p-2 bg-red-50 border border-red-200 rounded text-red-800">{t.ccaVifWarning}</p>
                            )}
                            <p className="text-gray-600">{t.ccaInertiaNote}</p>
                            {ellipseMode !== 'none' && currentData.groupSizes && Object.entries(currentData.groupSizes as Record<string, number>).some(([, n]) => n < 3) && (
                                <p className="text-xs text-amber-700">{t.ccaSmallGroups.replace('{groups}', Object.entries(currentData.groupSizes as Record<string, number>).filter(([, n]) => n < 3).map(([g]) => g).join(', '))}</p>
                            )}
                            {ellipseMode !== 'none' && (
                                <p className="text-xs text-gray-500">{ellipseMode === 'se' ? t.ccaEllipseSENote : t.ccaEllipseSDNote}</p>
                            )}
                            <p className="text-xs text-gray-500">{t.ccaMethodNote.replace('{n}', String(st.nSites)).replace('{s}', String(st.nSpecies)).replace('{seed}', String(st.seed))}</p>
                            {currentData.notes?.map((n, i) => <p key={i} className="text-xs text-amber-700">{n}</p>)}
                        </div>
                     )}
                </div>
                 <div className="p-4 border border-gray-200 rounded-lg bg-white">
                     <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                         <h4 className="text-lg font-semibold text-secondary">{t.correlationChartTitle}</h4>
                         <div className="flex items-center space-x-2">
                            <label htmlFor="heatmap-palette-select" className="text-sm font-medium text-gray-700">{t.palette}</label>
                            <select id="heatmap-palette-select" value={heatmapPalette} onChange={e => setHeatmapPalette(e.target.value as PaletteName)} className="p-1.5 border-gray-300 rounded-md shadow-sm">
                                {Object.keys(palettes).map(name => <option key={name} value={name}>{name}</option>)}
                            </select>
                            <button onClick={() => exportSVG(heatmapRef.current, `cca-correlation-heatmap-${selectedSite}.svg`)} className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-lg text-sm"><ExportIcon className="h-4 w-4 mr-1"/> SVG</button>
                        </div>
                    </div>
                     <CorrelationHeatmap matrix={currentData.correlationMatrix} palette={heatmapPalette} svgRef={heatmapRef} />
                 </div>
            </div>
             <div className="p-4 bg-blue-50 text-blue-900 rounded-lg border border-blue-200">
                <h4 className="font-semibold text-lg text-primary mb-2">{t.interpretationTitle}</h4>
                <ul className="space-y-2 text-sm">
                    <li dangerouslySetInnerHTML={{__html: t.interpretationBiplot}}/>
                    <li dangerouslySetInnerHTML={{__html: t.interpretationCorrelation}}/>
                    <li dangerouslySetInnerHTML={{__html: t.interpretationEllipses}}/>
                </ul>
            </div>
        </div>
    );
};
