import React from 'react';

interface HorizontalBarChartProps {
    data: { label: string; value: number }[];
    xAxisLabel: string;
    svgRef: React.RefObject<SVGSVGElement>;
    palette: string[];
}

const HorizontalBarChart: React.FC<HorizontalBarChartProps> = ({ data, xAxisLabel, svgRef, palette }) => {
    const PADDING = { top: 40, right: 20, bottom: 20, left: 150 };
    const BAR_HEIGHT = 20;
    const BAR_GAP = 5;
    const HEIGHT = PADDING.top + PADDING.bottom + data.length * (BAR_HEIGHT + BAR_GAP);
    const WIDTH = 800;
    
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    
    const maxValue = Math.max(...data.map(d => d.value), 0);
    const xScale = (value: number) => PADDING.left + (value / (maxValue || 1)) * plotWidth;

    return (
        <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full h-auto bg-white rounded-lg shadow border">
            {/* Title / X-Axis Label */}
            <text x={PADDING.left + plotWidth / 2} y={PADDING.top / 2} textAnchor="middle" fontSize="14" className="font-semibold">{xAxisLabel}</text>

            {/* X-Axis Ticks and Grid Lines */}
            {Array.from({ length: 6 }).map((_, i) => {
                const tickValue = i * maxValue / 5;
                const x = xScale(tickValue);
                return (
                    <g key={tickValue}>
                        <line x1={x} y1={PADDING.top} x2={x} y2={HEIGHT - PADDING.bottom} stroke="#e5e7eb" strokeWidth="1" />
                        <text x={x} y={PADDING.top - 5} textAnchor="middle" fontSize="10">{tickValue.toFixed(1)}</text>
                    </g>
                );
            })}

            {/* Bars and Labels */}
            {data.map((d, i) => {
                const y = PADDING.top + i * (BAR_HEIGHT + BAR_GAP);
                const barWidth = xScale(d.value) - PADDING.left;
                
                const color = palette[i % palette.length];

                return (
                    <g key={d.label}>
                        <text x={PADDING.left - 10} y={y + BAR_HEIGHT / 2} textAnchor="end" alignmentBaseline="middle" fontSize="11" className="italic">{d.label}</text>
                        <rect 
                            x={PADDING.left} 
                            y={y} 
                            width={barWidth > 0 ? barWidth : 0} 
                            height={BAR_HEIGHT} 
                            fill={color}
                            className="transition-all hover:opacity-80"
                        >
                             <title>{`${d.label}: ${d.value.toFixed(2)} Mg`}</title>
                        </rect>
                    </g>
                );
            })}
        </svg>
    );
};

export default HorizontalBarChart;