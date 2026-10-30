
import React, { useMemo } from 'react';
import { useTranslations } from '../translations';

// --- TYPE DEFINITIONS ---
interface ArcData {
    index: number;
    startAngle: number;
    endAngle: number;
    value: number;
    label: string;
}

interface ChordData {
    source: {
        index: number;
        startAngle: number;
        endAngle: number;
        value: number;
    };
    target: {
        index: number;
        startAngle: number;
        endAngle: number;
        value: number;
    }
}

// --- LAYOUT CALCULATION ---
const calculateLayout = (matrix: number[][], labels: string[], padAngle: number, vegTypeCount: number): { arcs: ArcData[], chords: ChordData[] } => {
    const n = matrix.length;
    if (n === 0) return { arcs: [], chords: [] };

    const groupTotals = Array(n).fill(0);
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            groupTotals[i] += matrix[i][j]; // outgoing
            groupTotals[i] += matrix[j][i]; // incoming
        }
    }

    const totalSum = groupTotals.reduce((a, b) => a + b, 0);
    if (totalSum === 0) return { arcs: [], chords: [] };

    const angleScale = (2 * Math.PI - n * padAngle) / totalSum;

    // Calculate the total angular width of the vegetation type block to center it at the top
    const vegTypesTotalValue = groupTotals.slice(0, vegTypeCount).reduce((a, b) => a + b, 0);
    const vegTypesTotalAngle = vegTypesTotalValue * angleScale + (vegTypeCount > 0 ? (vegTypeCount -1) * padAngle : 0);
    
    // Set the starting angle to center the veg block around 12 o'clock (-PI/2)
    let currentAngle = -Math.PI / 2 - vegTypesTotalAngle / 2;
    
    const arcs: ArcData[] = [];
    for (let i = 0; i < n; i++) {
        const startAngle = currentAngle;
        const endAngle = startAngle + groupTotals[i] * angleScale;
        arcs.push({ index: i, startAngle, endAngle, value: groupTotals[i], label: labels[i] });
        currentAngle = endAngle + padAngle;
    }
    
    const chords: ChordData[] = [];
    // Keep track of the angle for the next chord segment on each arc
    const nextAngle = arcs.map(a => a.startAngle);
    
    // Layout outgoing chords first, then incoming, for a more organized look
    for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
            const value = matrix[i][j];
            if (value > 0) {
                const sourceStart = nextAngle[i];
                const sourceEnd = sourceStart + value * angleScale;
                nextAngle[i] = sourceEnd;
                
                const targetStart = nextAngle[j];
                const targetEnd = targetStart + value * angleScale;
                nextAngle[j] = targetEnd;
                
                chords.push({
                    source: { index: i, startAngle: sourceStart, endAngle: sourceEnd, value },
                    target: { index: j, startAngle: targetStart, endAngle: targetEnd, value },
                });
            }
        }
    }

    return { arcs, chords };
};


// --- SVG PATH HELPERS ---
const polarToCartesian = (radius: number, angle: number) => ({
    x: radius * Math.cos(angle),
    y: radius * Math.sin(angle)
});

const describeArc = (innerRadius: number, outerRadius: number, startAngle: number, endAngle: number) => {
    const startOuter = polarToCartesian(outerRadius, endAngle);
    const endOuter = polarToCartesian(outerRadius, startAngle);
    const startInner = polarToCartesian(innerRadius, endAngle);
    const endInner = polarToCartesian(innerRadius, startAngle);

    const largeArcFlag = endAngle - startAngle <= Math.PI ? "0" : "1";

    return `M ${startOuter.x} ${startOuter.y}
            A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 0 ${endOuter.x} ${endOuter.y}
            L ${endInner.x} ${endInner.y}
            A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 1 ${startInner.x} ${startInner.y}
            Z`;
};

const describeRibbon = (radius: number, source: ChordData['source'], target: ChordData['target']) => {
    const s0 = polarToCartesian(radius, source.startAngle);
    const s1 = polarToCartesian(radius, source.endAngle);
    const t0 = polarToCartesian(radius, target.startAngle);
    const t1 = polarToCartesian(radius, target.endAngle);
    
    return `M ${s0.x} ${s0.y}
            A ${radius} ${radius} 0 0 1 ${s1.x} ${s1.y}
            Q 0 0 ${t1.x} ${t1.y}
            A ${radius} ${radius} 0 0 1 ${t0.x} ${t0.y}
            Q 0 0 ${s0.x} ${s0.y}
            Z`;
};


// --- COMPONENT ---
interface ChordDiagramProps {
    matrix: number[][];
    labels: string[];
    colors: Record<string, string>;
    vegTypeCount: number;
    svgRef: React.RefObject<SVGSVGElement>;
}

const ChordDiagram: React.FC<ChordDiagramProps> = ({ matrix, labels, colors, vegTypeCount, svgRef }) => {
    const t = useTranslations();
    const WIDTH = 800;
    const HEIGHT = 800;
    const outerRadius = Math.min(WIDTH, HEIGHT) / 2 - 120; // Increased margin for labels
    const innerRadius = outerRadius - 20;
    const padAngle = 0.02;

    const layout = useMemo(() => calculateLayout(matrix, labels, padAngle, vegTypeCount), [matrix, labels, padAngle, vegTypeCount]);

    if (!layout || layout.arcs.length === 0) {
        return <div className="text-center p-8 text-gray-500">{t.noData}</div>;
    }

    const isSpecies = (index: number) => index >= vegTypeCount;

    return (
        <div className="flex justify-center items-center w-full">
            <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full max-w-2xl h-auto">
                <g transform={`translate(${WIDTH / 2}, ${HEIGHT / 2})`}>
                    {/* Ribbons */}
                    <g>
                        {layout.chords.map((chord, i) => (
                            <path
                                key={i}
                                d={describeRibbon(innerRadius, chord.source, chord.target)}
                                fill={colors[labels[chord.source.index]]}
                                fillOpacity={0.6}
                                className="transition-opacity hover:opacity-90"
                            >
                               <title>{`${labels[chord.source.index]} -> ${labels[chord.target.index]}: ${chord.source.value.toFixed(2)} Mg`}</title>
                            </path>
                        ))}
                    </g>

                    {/* Arcs and Labels */}
                    <g>
                        {layout.arcs.map(arc => {
                            const midAngle = (arc.startAngle + arc.endAngle) / 2;
                            const labelPos = polarToCartesian(outerRadius + 8, midAngle);
                            
                            // Determine text anchor based on which side of the circle the label is on.
                            // Angles between -PI/2 and PI/2 are on the right side.
                            const isRightSide = midAngle > -Math.PI / 2 && midAngle < Math.PI / 2;
                            const textAnchor = isRightSide ? "start" : "end";
                            const dx = isRightSide ? 5 : -5;

                            return (
                                <g key={arc.label}>
                                    <path
                                        d={describeArc(innerRadius, outerRadius, arc.startAngle, arc.endAngle)}
                                        fill={colors[arc.label]}
                                    >
                                       <title>{`${arc.label}: ${arc.value.toFixed(2)} Mg`}</title>
                                    </path>
                                    <text
                                        x={labelPos.x}
                                        y={labelPos.y}
                                        dx={dx}
                                        dy=".35em"
                                        textAnchor={textAnchor}
                                        fontSize="10"
                                        className={isSpecies(arc.index) ? 'italic' : ''}
                                    >
                                        {arc.label}
                                    </text>
                                </g>
                            );
                        })}
                    </g>
                </g>
            </svg>
        </div>
    );
};

export default ChordDiagram;
