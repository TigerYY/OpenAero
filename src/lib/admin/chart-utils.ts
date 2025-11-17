/**
 * 图表数据处理工具函数
 * 提供数据聚合、时间序列处理和图表配置生成功能
 */

export interface TimeSeriesDataPoint {
  date: string;
  value: number;
  [key: string]: string | number;
}

export interface AggregatedData {
  date: string;
  [key: string]: string | number;
}

export interface ChartConfig {
  colors: string[];
  labels: Record<string, string>;
  formatValue?: (value: number) => string;
}

/**
 * 按天聚合数据
 */
export function aggregateByDay<T extends Record<string, any>>(
  data: T[],
  valueKey: string,
  dateKey: string = 'date'
): TimeSeriesDataPoint[] {
  const aggregated: Record<string, number> = {};

  data.forEach((item) => {
    const date = item[dateKey] as string | Date | undefined;
    if (!date) return;
    
    const dateStr = typeof date === 'string' 
      ? date.split('T')[0] 
      : new Date(date).toISOString().split('T')[0];
    
    if (!dateStr) return;
    
    const value = typeof item[valueKey] === 'number' 
      ? item[valueKey] as number
      : parseFloat(String(item[valueKey])) || 0;

    aggregated[dateStr] = (aggregated[dateStr] ?? 0) + value;
  });

  return Object.entries(aggregated)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 按周聚合数据
 */
export function aggregateByWeek<T extends Record<string, any>>(
  data: T[],
  valueKey: string,
  dateKey: string = 'date'
): TimeSeriesDataPoint[] {
  const aggregated: Record<string, number> = {};

  data.forEach((item) => {
    const dateValue = item[dateKey] as string | Date | undefined;
    if (!dateValue) return;
    
    const date = typeof dateValue === 'string' 
      ? new Date(dateValue) 
      : dateValue as Date;
    
    if (isNaN(date.getTime())) return;
    
    // 获取周的开始日期（周一）
    const weekStart = new Date(date);
    const day = weekStart.getDay();
    const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // 调整为周一
    weekStart.setDate(diff);
    weekStart.setHours(0, 0, 0, 0);

    const weekKey = weekStart.toISOString().split('T')[0];
    if (!weekKey) return;
    
    const value = typeof item[valueKey] === 'number' 
      ? item[valueKey] as number
      : parseFloat(String(item[valueKey])) || 0;

    aggregated[weekKey] = (aggregated[weekKey] ?? 0) + value;
  });

  return Object.entries(aggregated)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 按月聚合数据
 */
export function aggregateByMonth<T extends Record<string, any>>(
  data: T[],
  valueKey: string,
  dateKey: string = 'date'
): TimeSeriesDataPoint[] {
  const aggregated: Record<string, number> = {};

  data.forEach((item) => {
    const dateValue = item[dateKey] as string | Date | undefined;
    if (!dateValue) return;
    
    const date = typeof dateValue === 'string' 
      ? new Date(dateValue) 
      : dateValue as Date;
    
    if (isNaN(date.getTime())) return;
    
    // 获取月份的开始日期
    const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
    const monthKey = monthStart.toISOString().split('T')[0];
    
    if (!monthKey) return;
    
    const value = typeof item[valueKey] === 'number' 
      ? item[valueKey] as number
      : parseFloat(String(item[valueKey])) || 0;

    aggregated[monthKey] = (aggregated[monthKey] ?? 0) + value;
  });

  return Object.entries(aggregated)
    .map(([date, value]) => ({ date, value }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * 填充时间序列中的缺失日期
 */
export function fillTimeSeries(
  data: TimeSeriesDataPoint[],
  startDate: Date,
  endDate: Date,
  granularity: 'day' | 'week' | 'month' = 'day'
): TimeSeriesDataPoint[] {
  const filled: TimeSeriesDataPoint[] = [];
  const dataMap = new Map(data.map(d => [d.date, d.value]));

  let current = new Date(startDate);
  const end = new Date(endDate);

  while (current <= end) {
    const dateKey = current.toISOString().split('T')[0];
    if (!dateKey) {
      // 移动到下一个时间点
      if (granularity === 'day') {
        current.setDate(current.getDate() + 1);
      } else if (granularity === 'week') {
        current.setDate(current.getDate() + 7);
      } else if (granularity === 'month') {
        current.setMonth(current.getMonth() + 1);
      }
      continue;
    }
    
    const value = dataMap.get(dateKey) || 0;
    
    filled.push({ date: dateKey, value });

    // 移动到下一个时间点
    if (granularity === 'day') {
      current.setDate(current.getDate() + 1);
    } else if (granularity === 'week') {
      current.setDate(current.getDate() + 7);
    } else if (granularity === 'month') {
      current.setMonth(current.getMonth() + 1);
    }
  }

  return filled;
}

/**
 * 计算增长率
 */
export function calculateGrowthRate(
  current: number,
  previous: number
): number {
  if (previous === 0) {
    return current > 0 ? 100 : 0;
  }
  return ((current - previous) / previous) * 100;
}

/**
 * 计算移动平均
 */
export function calculateMovingAverage(
  data: TimeSeriesDataPoint[],
  windowSize: number = 7
): TimeSeriesDataPoint[] {
  if (data.length === 0) return [];

  const result: TimeSeriesDataPoint[] = [];

  for (let i = 0; i < data.length; i++) {
    const start = Math.max(0, i - windowSize + 1);
    const window = data.slice(start, i + 1);
    const average = window.reduce((sum, d) => sum + d.value, 0) / window.length;

    const currentData = data[i];
    if (currentData) {
      result.push({
        date: currentData.date,
        value: Math.round(average * 100) / 100,
      });
    }
  }

  return result;
}

/**
 * 生成图表颜色配置
 */
export function generateChartColors(count: number): string[] {
  const baseColors = [
    '#0088FE', // 蓝色
    '#00C49F', // 绿色
    '#FFBB28', // 黄色
    '#FF8042', // 橙色
    '#8884d8', // 紫色
    '#82ca9d', // 浅绿色
    '#ffc658', // 金色
    '#ff7300', // 橙红色
  ];

  if (count <= baseColors.length) {
    return baseColors.slice(0, count);
  }

  // 如果需要更多颜色，生成渐变色
  const colors: string[] = [...baseColors];
  for (let i = baseColors.length; i < count; i++) {
    const hue = (i * 137.508) % 360; // 使用黄金角度生成颜色
    colors.push(`hsl(${hue}, 70%, 50%)`);
  }

  return colors;
}

/**
 * 格式化数值用于图表显示
 */
export function formatChartValue(
  value: number,
  type: 'number' | 'currency' | 'percentage' | 'duration' = 'number'
): string {
  switch (type) {
    case 'currency':
      return new Intl.NumberFormat('zh-CN', {
        style: 'currency',
        currency: 'CNY',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      }).format(value);
    
    case 'percentage':
      return `${value.toFixed(1)}%`;
    
    case 'duration':
      if (value < 1) {
        return `${Math.round(value * 60)}分钟`;
      } else if (value < 24) {
        return `${value.toFixed(1)}小时`;
      } else {
        return `${(value / 24).toFixed(1)}天`;
      }
    
    case 'number':
    default:
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toLocaleString('zh-CN');
  }
}

/**
 * 格式化日期用于图表显示
 */
export function formatChartDate(
  date: string | Date,
  format: 'short' | 'medium' | 'long' = 'short'
): string {
  const dateObj = typeof date === 'string' ? new Date(date) : date;

  switch (format) {
    case 'short':
      return `${dateObj.getMonth() + 1}/${dateObj.getDate()}`;
    case 'medium':
      return dateObj.toLocaleDateString('zh-CN', {
        month: 'short',
        day: 'numeric',
      });
    case 'long':
      return dateObj.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    default:
      return dateObj.toISOString().split('T')[0] || '';
  }
}

/**
 * 计算数据统计信息
 */
export function calculateStatistics(data: number[]): {
  min: number;
  max: number;
  average: number;
  median: number;
  total: number;
} {
  if (data.length === 0) {
    return { min: 0, max: 0, average: 0, median: 0, total: 0 };
  }

  const sorted = [...data].sort((a, b) => a - b);
  const total = data.reduce((sum, val) => sum + val, 0);
  const average = total / data.length;
  const median = sorted.length % 2 === 0
    ? ((sorted[sorted.length / 2 - 1] ?? 0) + (sorted[sorted.length / 2] ?? 0)) / 2
    : (sorted[Math.floor(sorted.length / 2)] ?? 0);

  return {
    min: sorted[0] ?? 0,
    max: sorted[sorted.length - 1] ?? 0,
    average: Math.round(average * 100) / 100,
    median: Math.round(median * 100) / 100,
    total,
  };
}

/**
 * 生成图表配置
 */
export function generateChartConfig(
  dataKeys: string[],
  labels?: Record<string, string>,
  colors?: string[]
): ChartConfig {
  return {
    colors: colors || generateChartColors(dataKeys.length),
    labels: labels || dataKeys.reduce((acc, key) => {
      acc[key] = key;
      return acc;
    }, {} as Record<string, string>),
    formatValue: (value: number) => formatChartValue(value),
  };
}

/**
 * 合并多个时间序列数据
 */
export function mergeTimeSeries(
  ...series: TimeSeriesDataPoint[][]
): AggregatedData[] {
  if (series.length === 0) return [];

  // 收集所有日期
  const allDates = new Set<string>();
  series.forEach(s => s.forEach(d => allDates.add(d.date)));

  // 创建数据映射
  const dataMaps = series.map(s => new Map(s.map(d => [d.date, d.value])));

  // 合并数据
  return Array.from(allDates)
    .sort()
    .map(date => {
      const result: AggregatedData = { date };
      dataMaps.forEach((map, index) => {
        result[`series${index}`] = map.get(date) || 0;
      });
      return result;
    });
}

/**
 * 按分类聚合数据
 */
export function aggregateByCategory<T extends Record<string, any>>(
  data: T[],
  categoryKey: string,
  valueKey: string
): Array<{ category: string; value: number; count: number }> {
  const aggregated: Record<string, { value: number; count: number }> = {};

  data.forEach((item) => {
    const category = String(item[categoryKey] || '未分类');
    const value = typeof item[valueKey] === 'number'
      ? item[valueKey]
      : parseFloat(String(item[valueKey])) || 0;

    if (!aggregated[category]) {
      aggregated[category] = { value: 0, count: 0 };
    }

    aggregated[category].value += value;
    aggregated[category].count += 1;
  });

  return Object.entries(aggregated)
    .map(([category, data]) => {
      const value = data?.value ?? 0;
      const count = data?.count ?? 0;
      return {
        category,
        value: Math.round(value * 100) / 100,
        count,
      };
    })
    .sort((a, b) => b.value - a.value);
}

