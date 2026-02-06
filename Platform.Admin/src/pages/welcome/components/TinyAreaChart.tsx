import React, { useState } from 'react';
import { Tooltip } from 'antd';

const TinyAreaChart: React.FC<{ data: { value: number; time: string }[]; color: string; height?: number }> = React.memo(({ data, color, height = 45 }) => {
    const [hoverIndex, setHoverIndex] = useState<number | null>(null);

    const max = 100;
    const width = 100;
    const step = width / (data.length - 1);

    // Generate path for the area
    const areaPath = `
    M 0,${height} 
    ${data.map((item, i) => {
        const x = i * step;
        const y = height - (Math.min(Math.max(item.value, 0), max) / max) * height;
        return `L ${x},${y}`;
    }).join(' ')} 
    L ${width},${height} 
    Z
  `;

    // Generate path for the line
    const linePath = `M ${data.map((item, i) => {
        const x = i * step;
        const y = height - (Math.min(Math.max(item.value, 0), max) / max) * height;
        return `${x},${y}`;
    }).join(' ')}`;

    if (!data || data.length < 2) return <div style={{ height }} />;

    return (
        <svg viewBox={`0 0 ${width} ${height}`} style={{ width: '100%', height, overflow: 'visible' }} preserveAspectRatio="none">
            <defs>
                <linearGradient id={`gradient-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={color} stopOpacity="0.2" />
                    <stop offset="100%" stopColor={color} stopOpacity="0.0" />
                </linearGradient>
            </defs>

            {/* Area */}
            <path
                d={areaPath}
                fill={`url(#gradient-${color.replace('#', '')})`}
                stroke="none"
            />

            {/* Line */}
            <path
                d={linePath}
                fill="none"
                stroke={color}
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
            />

            {/* Hover Point */}
            {hoverIndex !== null && hoverIndex < data.length && (
                <circle
                    cx={hoverIndex * step}
                    cy={height - (Math.min(Math.max(data[hoverIndex].value, 0), max) / max) * height}
                    r={3}
                    fill="#fff"
                    stroke={color}
                    strokeWidth={2}
                    vectorEffect="non-scaling-stroke"
                />
            )}

            {/* Interaction Layer */}
            {data.map((item, i) => {
                // Calculate rect area for each point
                const startX = i === 0 ? 0 : (i - 0.5) * step;
                const endX = i === data.length - 1 ? width : (i + 0.5) * step;
                const rectWidth = endX - startX;

                return (
                    <Tooltip key={i} title={`${item.time}: ${item.value.toFixed(1)}%`} open={hoverIndex === i}>
                        <rect
                            x={startX}
                            y={0}
                            width={rectWidth}
                            height={height}
                            fill="transparent"
                            style={{ cursor: 'pointer' }}
                            onMouseEnter={() => setHoverIndex(i)}
                            onMouseLeave={() => setHoverIndex(null)}
                        />
                    </Tooltip>
                );
            })}
        </svg>
    );
});

export default TinyAreaChart;
