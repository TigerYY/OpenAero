/**
 * 图表工具函数测试
 */
import {
  aggregateByDay,
  aggregateByWeek,
  aggregateByMonth,
  calculateGrowthRate,
  calculateMovingAverage,
  formatChartValue,
  formatChartDate,
  calculateStatistics,
  generateChartColors,
} from '../chart-utils';

describe('chart-utils', () => {
  const mockTimeSeriesData = [
    { date: '2024-01-01', value: 10 },
    { date: '2024-01-02', value: 15 },
    { date: '2024-01-03', value: 20 },
    { date: '2024-01-01', value: 5 }, // 同一天的数据
  ];

  describe('aggregateByDay', () => {
    it('应该按天聚合数据', () => {
      const result = aggregateByDay(mockTimeSeriesData, 'value');
      expect(result).toHaveLength(3); // 3个不同的日期
      
      const jan1 = result.find(r => r.date === '2024-01-01');
      expect(jan1?.value).toBe(15); // 10 + 5
    });

    it('应该处理空数组', () => {
      const result = aggregateByDay([], 'value');
      expect(result).toEqual([]);
    });
  });

  describe('aggregateByWeek', () => {
    it('应该按周聚合数据', () => {
      const weekData = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-05', value: 15 },
        { date: '2024-01-08', value: 20 },
      ];

      const result = aggregateByWeek(weekData, 'value');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('aggregateByMonth', () => {
    it('应该按月聚合数据', () => {
      const monthData = [
        { date: '2024-01-15', value: 10 },
        { date: '2024-02-10', value: 20 },
        { date: '2024-01-20', value: 15 },
      ];

      const result = aggregateByMonth(monthData, 'value');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('calculateGrowthRate', () => {
    it('应该计算正确的增长率', () => {
      expect(calculateGrowthRate(100, 50)).toBe(100); // 100%增长
      expect(calculateGrowthRate(50, 100)).toBe(-50); // -50%下降
    });

    it('应该处理除零情况', () => {
      expect(calculateGrowthRate(100, 0)).toBe(100);
      expect(calculateGrowthRate(0, 0)).toBe(0);
    });
  });

  describe('calculateMovingAverage', () => {
    it('应该计算移动平均', () => {
      const data = [
        { date: '2024-01-01', value: 10 },
        { date: '2024-01-02', value: 20 },
        { date: '2024-01-03', value: 30 },
      ];

      const result = calculateMovingAverage(data, 2);
      expect(result).toHaveLength(3);
      expect(result[2].value).toBe(25); // (20 + 30) / 2
    });

    it('应该处理空数组', () => {
      const result = calculateMovingAverage([], 7);
      expect(result).toEqual([]);
    });
  });

  describe('formatChartValue', () => {
    it('应该格式化货币', () => {
      const result = formatChartValue(1000, 'currency');
      expect(result).toContain('¥');
      expect(result).toContain('1,000');
    });

    it('应该格式化百分比', () => {
      const result = formatChartValue(25.5, 'percentage');
      expect(result).toContain('%');
      expect(result).toContain('25.5');
    });

    it('应该格式化时长', () => {
      expect(formatChartValue(0.5, 'duration')).toContain('分钟');
      expect(formatChartValue(2, 'duration')).toContain('小时');
      expect(formatChartValue(48, 'duration')).toContain('天');
    });

    it('应该格式化大数字', () => {
      expect(formatChartValue(1500, 'number')).toContain('K');
      expect(formatChartValue(2000000, 'number')).toContain('M');
    });
  });

  describe('formatChartDate', () => {
    it('应该格式化日期', () => {
      const date = new Date('2024-01-15');
      expect(formatChartDate(date, 'short')).toContain('1/15');
      expect(formatChartDate(date, 'medium')).toBeDefined();
      expect(formatChartDate(date, 'long')).toBeDefined();
    });
  });

  describe('calculateStatistics', () => {
    it('应该计算统计信息', () => {
      const data = [10, 20, 30, 40, 50];
      const stats = calculateStatistics(data);

      expect(stats.min).toBe(10);
      expect(stats.max).toBe(50);
      expect(stats.average).toBe(30);
      expect(stats.median).toBe(30);
      expect(stats.total).toBe(150);
    });

    it('应该处理空数组', () => {
      const stats = calculateStatistics([]);
      expect(stats.min).toBe(0);
      expect(stats.max).toBe(0);
      expect(stats.average).toBe(0);
    });
  });

  describe('generateChartColors', () => {
    it('应该生成指定数量的颜色', () => {
      const colors = generateChartColors(5);
      expect(colors).toHaveLength(5);
      colors.forEach(color => {
        expect(color).toMatch(/^#|^hsl/);
      });
    });

    it('应该处理大量颜色需求', () => {
      const colors = generateChartColors(20);
      expect(colors).toHaveLength(20);
    });
  });
});

