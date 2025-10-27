'use client';

import React from 'react';

interface ChartDataPoint {
  label: string;
  value: number;
  color?: string;
}

interface AnalyticsChartProps {
  title: string;
  data: ChartDataPoint[];
  type: 'line' | 'bar' | 'pie' | 'area';
  height?: number;
  showLegend?: boolean;
  showGrid?: boolean;
  className?: string;
}

export default function AnalyticsChart({
  title,
  data,
  type,
  height = 300,
  showLegend = true,
  showGrid = true,
  className = ''
}: AnalyticsChartProps) {
  const maxValue = Math.max(...data.map(d => d.value));
  const colors = [
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#84CC16', '#F97316', '#EC4899', '#6366F1'
  ];

  const renderLineChart = () => {
    const width = 100;
    const chartHeight = height - 80;
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = chartHeight - (point.value / maxValue) * chartHeight;
      return `${x},${y}`;
    }).join(' ');

    return (
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          className="w-full"
          style={{ height: chartHeight }}
        >
          {showGrid && (
            <g className="opacity-20">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                <line
                  key={index}
                  x1="0"
                  y1={chartHeight - ratio * chartHeight}
                  x2={width}
                  y2={chartHeight - ratio * chartHeight}
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              ))}
            </g>
          )}
          <polyline
            points={points}
            fill="none"
            stroke={colors[0]}
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          {data.map((point, index) => {
            const x = (index / (data.length - 1)) * width;
            const y = chartHeight - (point.value / maxValue) * chartHeight;
            return (
              <circle
                key={index}
                cx={x}
                cy={y}
                r="3"
                fill={colors[0]}
                className="drop-shadow-sm"
              />
            );
          })}
        </svg>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          {data.map((point, index) => (
            <span key={index} className="text-center">
              {point.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderBarChart = () => {
    const chartHeight = height - 80;
    const barWidth = 80 / data.length;

    return (
      <div className="relative">
        <div className="flex items-end justify-between h-full space-x-1" style={{ height: chartHeight }}>
          {data.map((point, index) => {
            const barHeight = (point.value / maxValue) * chartHeight;
            return (
              <div key={index} className="flex flex-col items-center flex-1">
                <div className="relative group">
                  <div
                    className="rounded-t transition-all duration-300 hover:opacity-80"
                    style={{
                      height: barHeight,
                      backgroundColor: point.color || colors[index % colors.length],
                      minHeight: '2px'
                    }}
                  />
                  <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                    {point.value.toLocaleString()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          {data.map((point, index) => (
            <span key={index} className="text-center flex-1 truncate">
              {point.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderPieChart = () => {
    const total = data.reduce((sum, point) => sum + point.value, 0);
    let currentAngle = 0;
    const radius = 80;
    const centerX = 100;
    const centerY = 100;

    const slices = data.map((point, index) => {
      const percentage = point.value / total;
      const angle = percentage * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + angle;
      
      const x1 = centerX + radius * Math.cos((startAngle * Math.PI) / 180);
      const y1 = centerY + radius * Math.sin((startAngle * Math.PI) / 180);
      const x2 = centerX + radius * Math.cos((endAngle * Math.PI) / 180);
      const y2 = centerY + radius * Math.sin((endAngle * Math.PI) / 180);
      
      const largeArcFlag = angle > 180 ? 1 : 0;
      
      const pathData = [
        `M ${centerX} ${centerY}`,
        `L ${x1} ${y1}`,
        `A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`,
        'Z'
      ].join(' ');
      
      currentAngle += angle;
      
      return {
        pathData,
        color: point.color || colors[index % colors.length],
        percentage: Math.round(percentage * 100),
        label: point.label,
        value: point.value
      };
    });

    return (
      <div className="flex items-center justify-center">
        <div className="relative">
          <svg viewBox="0 0 200 200" className="w-48 h-48">
            {slices.map((slice, index) => (
              <g key={index}>
                <path
                  d={slice.pathData}
                  fill={slice.color}
                  className="hover:opacity-80 transition-opacity cursor-pointer"
                >
                  <title>{`${slice.label}: ${slice.value} (${slice.percentage}%)`}</title>
                </path>
              </g>
            ))}
          </svg>
        </div>
      </div>
    );
  };

  const renderAreaChart = () => {
    const chartHeight = height - 80;
    const width = 100;
    
    const points = data.map((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = chartHeight - (point.value / maxValue) * chartHeight;
      return { x, y };
    });

    const pathData = [
      `M 0 ${chartHeight}`,
      ...points.map(point => `L ${point.x} ${point.y}`),
      `L ${width} ${chartHeight}`,
      'Z'
    ].join(' ');

    return (
      <div className="relative">
        <svg
          viewBox={`0 0 ${width} ${chartHeight}`}
          className="w-full"
          style={{ height: chartHeight }}
        >
          {showGrid && (
            <g className="opacity-20">
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, index) => (
                <line
                  key={index}
                  x1="0"
                  y1={chartHeight - ratio * chartHeight}
                  x2={width}
                  y2={chartHeight - ratio * chartHeight}
                  stroke="currentColor"
                  strokeWidth="0.5"
                />
              ))}
            </g>
          )}
          <path
            d={pathData}
            fill={colors[0]}
            fillOpacity="0.3"
            stroke={colors[0]}
            strokeWidth="2"
            className="drop-shadow-sm"
          />
          {points.map((point, index) => (
            <circle
              key={index}
              cx={point.x}
              cy={point.y}
              r="3"
              fill={colors[0]}
              className="drop-shadow-sm"
            />
          ))}
        </svg>
        <div className="flex justify-between text-xs text-gray-500 mt-2">
          {data.map((point, index) => (
            <span key={index} className="text-center">
              {point.label}
            </span>
          ))}
        </div>
      </div>
    );
  };

  const renderChart = () => {
    switch (type) {
      case 'line':
        return renderLineChart();
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'area':
        return renderAreaChart();
      default:
        return renderBarChart();
    }
  };

  return (
    <div className={`bg-white rounded-lg shadow p-6 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-900 mb-4">{title}</h3>
      
      <div style={{ height }}>
        {renderChart()}
      </div>

      {showLegend && type === 'pie' && (
        <div className="mt-4 grid grid-cols-2 gap-2">
          {data.map((point, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: point.color || colors[index % colors.length] }}
              />
              <span className="text-sm text-gray-600 truncate">
                {point.label}: {point.value.toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      )}

      {showLegend && type !== 'pie' && data.length > 1 && (
        <div className="mt-4 flex flex-wrap gap-4">
          {data.map((point, index) => (
            <div key={index} className="flex items-center space-x-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: point.color || colors[index % colors.length] }}
              />
              <span className="text-sm text-gray-600">
                {point.label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}