/**
 * 导出工具函数测试
 */
import { exportLargeDataset, generateExportFilename, ExportFormat } from '../export-utils';

describe('export-utils', () => {
  const mockData = [
    { id: 1, name: '测试方案1', status: 'ACTIVE', price: 100 },
    { id: 2, name: '测试方案2', status: 'PENDING', price: 200 },
    { id: 3, name: '测试方案3', status: 'REJECTED', price: 300 },
  ];

  describe('exportLargeDataset', () => {
    it('应该导出JSON格式数据', () => {
      const result = exportLargeDataset(mockData, 'json');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      
      const parsed = JSON.parse(result);
      expect(parsed).toEqual(mockData);
    });

    it('应该导出CSV格式数据', () => {
      const result = exportLargeDataset(mockData, 'csv');
      expect(result).toBeDefined();
      expect(typeof result).toBe('string');
      expect(result).toContain('id,name,status,price');
      expect(result).toContain('1,测试方案1,ACTIVE,100');
    });

    it('应该导出Excel格式数据', () => {
      const result = exportLargeDataset(mockData, 'excel');
      expect(result).toBeDefined();
      expect(Buffer.isBuffer(result)).toBe(true);
    });

    it('应该处理空数组', () => {
      const jsonResult = exportLargeDataset([], 'json');
      expect(JSON.parse(jsonResult)).toEqual([]);

      const csvResult = exportLargeDataset([], 'csv');
      expect(csvResult).toBe('');
    });

    it('应该处理大数据量', () => {
      const largeData = Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `方案${i}`,
        status: 'ACTIVE',
      }));

      const result = exportLargeDataset(largeData, 'json');
      const parsed = JSON.parse(result);
      expect(parsed).toHaveLength(1000);
    });
  });

  describe('generateExportFilename', () => {
    it('应该生成默认文件名', () => {
      const filename = generateExportFilename('data', 'json');
      expect(filename).toContain('data');
      expect(filename).toContain('.json');
      expect(filename).toMatch(/^\d{4}-\d{2}-\d{2}/); // 日期格式
    });

    it('应该生成CSV文件名', () => {
      const filename = generateExportFilename('solutions', 'csv');
      expect(filename).toContain('solutions');
      expect(filename).toContain('.csv');
    });

    it('应该生成Excel文件名', () => {
      const filename = generateExportFilename('users', 'excel');
      expect(filename).toContain('users');
      expect(filename).toContain('.xlsx');
    });
  });
});

