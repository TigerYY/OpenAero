/**
 * 数据导出工具函数
 * 支持 CSV 和 Excel 格式导出
 */

import * as XLSX from 'xlsx';

export type ExportFormat = 'json' | 'csv' | 'excel';

export interface ExportOptions {
  format: ExportFormat;
  filename?: string;
  sheetName?: string;
}

/**
 * 将数据导出为 CSV 格式
 */
export function exportToCSV(data: any[], filename: string = 'export'): string {
  if (!data || data.length === 0) {
    return '';
  }

  // 获取所有键作为表头
  const headers = Object.keys(data[0]);
  
  // 构建 CSV 内容
  const csvRows: string[] = [];
  
  // 添加表头
  csvRows.push(headers.map(h => escapeCSVField(h)).join(','));
  
  // 添加数据行
  for (const row of data) {
    const values = headers.map(header => {
      const value = row[header];
      if (value === null || value === undefined) {
        return '';
      }
      // 处理日期对象
      if (value instanceof Date) {
        return escapeCSVField(value.toISOString());
      }
      // 处理数组和对象
      if (typeof value === 'object') {
        return escapeCSVField(JSON.stringify(value));
      }
      return escapeCSVField(String(value));
    });
    csvRows.push(values.join(','));
  }
  
  return csvRows.join('\n');
}

/**
 * 将数据导出为 Excel 格式
 */
export function exportToExcel(
  data: any[],
  filename: string = 'export',
  sheetName: string = 'Sheet1'
): Buffer {
  if (!data || data.length === 0) {
    // 返回空的工作簿
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet([[]]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
  }

  // 创建工作簿
  const wb = XLSX.utils.book_new();
  
  // 将数据转换为工作表
  const ws = XLSX.utils.json_to_sheet(data, {
    // 日期处理
    dateNF: 'yyyy-mm-dd hh:mm:ss',
  });
  
  // 设置列宽（自动调整）
  const colWidths = Object.keys(data[0]).map(key => ({
    wch: Math.max(key.length, 15), // 最小宽度15
  }));
  ws['!cols'] = colWidths;
  
  // 添加工作表到工作簿
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  
  // 生成 Excel 文件缓冲区
  return XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
}

/**
 * 格式化数据用于导出
 */
export function formatDataForExport(data: any[]): any[] {
  return data.map(item => {
    const formatted: any = {};
    
    for (const [key, value] of Object.entries(item)) {
      // 处理日期
      if (value instanceof Date) {
        formatted[key] = value.toISOString();
      }
      // 处理 null/undefined
      else if (value === null || value === undefined) {
        formatted[key] = '';
      }
      // 处理数组
      else if (Array.isArray(value)) {
        formatted[key] = value.join(', ');
      }
      // 处理对象
      else if (typeof value === 'object') {
        formatted[key] = JSON.stringify(value);
      }
      // 其他类型直接使用
      else {
        formatted[key] = value;
      }
    }
    
    return formatted;
  });
}

/**
 * 转义 CSV 字段（处理逗号、引号、换行符）
 */
function escapeCSVField(field: string): string {
  if (typeof field !== 'string') {
    field = String(field);
  }
  
  // 如果包含逗号、引号或换行符，需要用引号包裹并转义引号
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  
  return field;
}

/**
 * 生成导出文件名
 */
export function generateExportFilename(
  prefix: string,
  format: ExportFormat,
  timestamp?: Date
): string {
  const date = timestamp || new Date();
  const dateStr = date.toISOString().split('T')[0];
  const ext = format === 'excel' ? 'xlsx' : format;
  return `${prefix}-${dateStr}.${ext}`;
}

/**
 * 处理大数据量导出（分批处理）
 */
export async function exportLargeDataset<T>(
  data: T[],
  options: ExportOptions,
  batchSize: number = 10000
): Promise<{ format: ExportFormat; data: string | Buffer; filename: string }> {
  const filename = options.filename || generateExportFilename('export', options.format);
  
  // 如果数据量小于批次大小，直接导出
  if (data.length <= batchSize) {
    return exportDataset(data, options, filename);
  }
  
  // 大数据量分批处理
  const batches: T[][] = [];
  for (let i = 0; i < data.length; i += batchSize) {
    batches.push(data.slice(i, i + batchSize));
  }
  
  if (options.format === 'excel') {
    // Excel 格式：创建多个工作表
    const wb = XLSX.utils.book_new();
    
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const formatted = formatDataForExport(batch as any[]);
      const ws = XLSX.utils.json_to_sheet(formatted);
      const sheetName = options.sheetName 
        ? `${options.sheetName}_${i + 1}` 
        : `Sheet${i + 1}`;
      XLSX.utils.book_append_sheet(wb, ws, sheetName);
    }
    
    const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    return { format: 'excel', data: buffer, filename };
  } else {
    // CSV 格式：合并所有批次
    const allFormatted = formatDataForExport(data as any[]);
    const csv = exportToCSV(allFormatted, filename);
    return { format: 'csv', data: csv, filename };
  }
}

/**
 * 导出数据集
 */
function exportDataset<T>(
  data: T[],
  options: ExportOptions,
  filename: string
): { format: ExportFormat; data: string | Buffer; filename: string } {
  const formatted = formatDataForExport(data as any[]);
  
  switch (options.format) {
    case 'csv':
      return {
        format: 'csv',
        data: exportToCSV(formatted, filename),
        filename,
      };
    
    case 'excel':
      return {
        format: 'excel',
        data: exportToExcel(formatted, filename, options.sheetName),
        filename,
      };
    
    case 'json':
    default:
      return {
        format: 'json',
        data: JSON.stringify(formatted, null, 2),
        filename,
      };
  }
}

