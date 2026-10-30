
import React, { useRef, useState, useMemo } from 'react';
import { SiteCCAPlotData, SingleCCAPlotData, CCACoordinates, CorrelationMatrix } from '../types';
import { ExportIcon, ScatterChartIcon } from './Icons';
import { useTranslations } from '../translations';
import { palettes, PaletteName } from './palettes';

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


const Biplot: React.FC<{ data: SingleCCAPlotData, palette: PaletteName, showLabels: boolean, showConnectors: boolean, showEllipses: boolean, svgRef: React.RefObject<SVGSVGElement> }> = ({ data, palette, showLabels, showConnectors, showEllipses, svgRef }) => {
    const { species, vectors } = data.biplot;
    const allPoints = [...species, ...vectors];
    const PLOT_WIDTH = WIDTH - PADDING * 2;
    const PLOT_HEIGHT = HEIGHT - PADDING * 2;

    // --- DYNAMIC SCALING LOGIC ---
    const { scaleX, scaleY, originX, originY } = useMemo(() => {
        const allFiniteX = allPoints.map(p => p.x).filter(Number.isFinite);
        const allFiniteY = allPoints.map(p => p.y).filter(Number.isFinite);

        if (allFiniteX.length === 0 || allFiniteY.length === 0) {
            const fallbackScale = (v: number) => v + WIDTH/2;
            return { scaleX: fallbackScale, scaleY: fallbackScale, originX: WIDTH/2, originY: HEIGHT/2 };
        }

        const minX = Math.min(...allFiniteX);
        const maxX = Math.max(...allFiniteX);
        const minY = Math.min(...allFiniteY);
        const maxY = Math.max(...allFiniteY);

        const rangeX = maxX - minX;
        const rangeY = maxY - minY;

        const plotWidth = WIDTH - PADDING * 2;
        const plotHeight = HEIGHT - PADDING * 2;

        const scaleFactor = Math.min(plotWidth / (rangeX || 1), plotHeight / (rangeY || 1)) * 0.9; // 0.9 for extra margin

        const midX = minX + rangeX / 2;
        const midY = minY + rangeY / 2;

        const sX = (x: number) => PADDING + plotWidth / 2 + (x - midX) * scaleFactor;
        const sY = (y: number) => PADDING + plotHeight / 2 - (y - midY) * scaleFactor;

        return { scaleX: sX, scaleY: sY, originX: sX(0), originY: sY(0) };
    }, [allPoints]);

    const colors = palettes[palette];
    const vectorColor = palette === 'Greyscale' ? '#000000' : '#333333';
    const labelPositions = useLabelPositions(allPoints, scaleX, scaleY, showLabels);
    
    const renderPoint = (point: CCACoordinates, isVector: boolean) => {
        const scaledX = scaleX(point.x);
        const scaledY = scaleY(point.y);

        if (isVector) {
            return (
                <g key={point.name} className="group cursor-pointer">
                    <title>{point.name}</title>
                    <line x1={originX} y1={originY} x2={scaledX} y2={scaledY} stroke={vectorColor} strokeWidth="2" markerEnd="url(#arrowhead)" />
                </g>
            );
        } else {
            // Distinct rendering for background (unlabeled) vs significant (labeled) species
            const isBackground = point.isBackground;
            const clusterColor = colors[point.cluster === undefined ? 0 : point.cluster % colors.length];
            
            return (
                <g key={`${point.x}-${point.y}-${isBackground ? 'bg' : 'fg'}`} className="group cursor-pointer">
                    {!isBackground && <title>{point.name}</title>}
                    {isBackground ? (
                        // Background point: Small, semi-transparent cross or dot
                        <circle 
                            cx={scaledX} 
                            cy={scaledY} 
                            r="2" 
                            fill={clusterColor} 
                            fillOpacity="0.4"
                            stroke="none"
                        />
                    ) : (
                        // Significant point: Larger, solid
                        <circle 
                            cx={scaledX} 
                            cy={scaledY} 
                            r="4" 
                            fill={clusterColor} 
                            stroke="white" 
                            strokeWidth="1"
                            className="transition-transform group-hover:scale-150" 
                        />
                    )}
                </g>
            );
        }
    };

    return (
        <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto">
             <defs>
                <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="8" refY="3.5" orient="auto" markerUnits="strokeWidth">
                    <polygon points="0 0, 10 3.5, 0 7" fill={vectorColor} />
                </marker>
            </defs>

            {/* Axis Labels */}
            <text x={PADDING + PLOT_WIDTH / 2} y={HEIGHT - PADDING / 2.5} textAnchor="middle" fontSize="12" className="font-semibold">CCA1</text>
            <text transform={`rotate(-90, ${PADDING / 2.5}, ${PADDING + PLOT_HEIGHT / 2})`} x={PADDING / 2.5} y={PADDING + PLOT_HEIGHT / 2} textAnchor="middle" fontSize="12" className="font-semibold">CCA2</text>
            
            {/* Use scaled origin for axis lines */}
            <line x1={PADDING} y1={originY} x2={WIDTH - PADDING} y2={originY} stroke="#ccc" />
            <line x1={originX} y1={PADDING} x2={originX} y2={HEIGHT - PADDING} stroke="#ccc" />
            
            {showEllipses && data.ellipses?.map(ellipse => {
                 const scaledCx = scaleX(ellipse.cx);
                 const scaledCy = scaleY(ellipse.cy);
                 // The scaleFactor is unitless (pixels per data unit), so we can apply it directly to radii
                 const radiusX = Math.abs(ellipse.rx * (scaleX(1) - scaleX(0)));
                 const radiusY = Math.abs(ellipse.ry * (scaleY(0) - scaleY(1)));
                 
                 if (!Number.isFinite(scaledCx) || !Number.isFinite(scaledCy) || !Number.isFinite(radiusX) || !Number.isFinite(radiusY)) {
                     return null;
                 }
                return (
                    <ellipse
                        key={ellipse.cluster}
                        cx={scaledCx}
                        cy={scaledCy}
                        rx={radiusX}
                        ry={radiusY}
                        transform={`rotate(${-ellipse.angle * 180 / Math.PI}, ${scaledCx}, ${scaledCy})`}
                        fill={colors[ellipse.cluster % colors.length]}
                        fillOpacity="0.15" // Slightly reduced opacity to handle more points
                        stroke={colors[ellipse.cluster % colors.length]}
                        strokeWidth="1"
                        strokeOpacity="0.4"
                    />
                );
            })}

            {/* Render points: Background first, then significant ones on top, then vectors */}
            {species.filter(s => s.isBackground).map(s => renderPoint(s, false))}
            {species.filter(s => !s.isBackground).map(s => renderPoint(s, false))}
            {vectors.map(v => renderPoint(v, true))}
            
            {showLabels && labelPositions.map((label) => {
                const isVector = vectors.some(v => v.name === label.point.name);
                // Determine text anchor based on final label position relative to its point
                const textAnchor = label.x > label.scaledPoint.x ? 'start' : 'end';
                
                return (
                    <g key={`${label.point.name}-label-group`} className="pointer-events-none">
                       {showConnectors && (
                           <line
                                x1={label.scaledPoint.x}
                                y1={label.scaledPoint.y}
                                x2={label.x + (textAnchor === 'start' ? -2 : 2)}
                                y2={label.y - 4} // adjust to point to middle of text
                                stroke="#6b7280"
                                strokeWidth="0.5"
                            />
                       )}
                        <text 
                            x={label.x} 
                            y={label.y} 
                            fontSize="10" 
                            className={isVector ? "font-semibold" : "italic"}
                            textAnchor={textAnchor}
                        >
                            {label.point.name}
                        </text>
                    </g>
                );
            })}
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
  sites: string[];
  selectedSite: string;
  onSiteChange: (site: string) => void;
  isLoading: boolean;
}

export const CCAPlot: React.FC<CCAPlotProps> = ({ data, sites, selectedSite, onSiteChange, isLoading }) => {
    const t = useTranslations();
    const [biplotPalette, setBiplotPalette] = useState<PaletteName>('Viridis');
    const [heatmapPalette, setHeatmapPalette] = useState<PaletteName>('Viridis');
    const [showLabels, setShowLabels] = useState(true);
    const [showEllipses, setShowEllipses] = useState(true);
    const [showConnectors, setShowConnectors] = useState(true);

    const biplotRef = useRef<SVGSVGElement>(null);
    const heatmapRef = useRef<SVGSVGElement>(null);

    const siteOptions = ['General', ...sites];
    const currentData = data ? data[selectedSite] : null;

    if (isLoading) {
        return <div className="flex justify-center items-center p-6"><div className="loader w-6 h-6 border-4 border-secondary border-t-transparent rounded-full animate-spin mr-3"></div><p>{t.ccaSiteLoading}</p></div>;
    }
    if (!currentData || currentData.biplot.species.length === 0) {
        return <p className="p-4 bg-yellow-50 text-yellow-800 rounded-md text-sm">{t.noDataForSite}</p>
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center mb-2 flex-wrap gap-2">
                <h3 className="text-xl font-bold text-primary flex items-center">
                    <ScatterChartIcon className="h-5 w-5 mr-2" /> {t.ccaVisualizationTitle}
                </h3>
                <div className="flex items-center space-x-2">
                    <label htmlFor="site-select-cca" className="text-sm font-medium text-gray-700">{t.selectSiteCCA}</label>
                    <select id="site-select-cca" value={selectedSite} onChange={e => onSiteChange(e.target.value)} className="p-2 border-gray-300 rounded-md shadow-sm focus:ring-primary focus:border-primary">
                        {siteOptions.map(site => <option key={site} value={site}>{site}</option>)}
                    </select>
                </div>
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
                                <input type="checkbox" id="show-ellipses" checked={showEllipses} onChange={() => setShowEllipses(!showEllipses)} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"/>
                                <label htmlFor="show-ellipses" className="ml-2 text-sm text-gray-700 select-none cursor-pointer">{t.showEllipses}</label>
                            </div>
                            <button onClick={() => exportSVG(biplotRef.current, `cca-biplot-${selectedSite}.svg`)} className="flex items-center bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold py-1 px-3 rounded-lg text-sm"><ExportIcon className="h-4 w-4 mr-1"/> SVG</button>
                        </div>
                    </div>
                     <Biplot data={currentData} palette={biplotPalette} showLabels={showLabels} showConnectors={showConnectors} showEllipses={showEllipses} svgRef={biplotRef} />
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
