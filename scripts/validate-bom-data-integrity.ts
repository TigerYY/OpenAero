/**
 * BOM 数据完整性验证脚本
 * 对比 JSON 和 SolutionBomItem 数据一致性
 * 
 * 使用方法：
 *   npx tsx scripts/validate-bom-data-integrity.ts [--generate-report]
 */

import { PrismaClient } from '@prisma/client';
import { bomItemsToJson } from '../src/lib/bom-dual-write';

const prisma = new PrismaClient();

interface ValidationResult {
  solutionId: string;
  solutionTitle: string;
  status: 'consistent' | 'inconsistent' | 'missing_table' | 'missing_json' | 'error';
  tableItemCount: number;
  jsonItemCount: number;
  differences?: string[];
  error?: string;
}

interface ValidationReport {
  totalSolutions: number;
  consistentSolutions: number;
  inconsistentSolutions: number;
  missingTableSolutions: number;
  missingJsonSolutions: number;
  errorSolutions: number;
  results: ValidationResult[];
}

/**
 * 规范化 BOM 项用于比较
 */
function normalizeBomItemForComparison(item: any): any {
  return {
    name: String(item.name || '').trim(),
    model: String(item.model || '').trim(),
    quantity: Number(item.quantity || 1),
    unit: String(item.unit || '个').trim(),
    notes: String(item.notes || '').trim(),
    unitPrice: item.unitPrice !== null && item.unitPrice !== undefined ? Number(item.unitPrice) : null,
    supplier: String(item.supplier || '').trim(),
    partNumber: String(item.partNumber || '').trim(),
    manufacturer: String(item.manufacturer || '').trim(),
    category: String(item.category || '').trim(),
    position: String(item.position || '').trim(),
    weight: item.weight !== null && item.weight !== undefined ? Number(item.weight) : null,
    productId: String(item.productId || '').trim() || null,
  };
}

/**
 * 比较两个 BOM 项是否一致
 */
function compareBomItems(item1: any, item2: any): boolean {
  const normalized1 = normalizeBomItemForComparison(item1);
  const normalized2 = normalizeBomItemForComparison(item2);

  // 比较所有字段
  return (
    normalized1.name === normalized2.name &&
    normalized1.model === normalized2.model &&
    normalized1.quantity === normalized2.quantity &&
    normalized1.unit === normalized2.unit &&
    normalized1.notes === normalized2.notes &&
    Math.abs((normalized1.unitPrice || 0) - (normalized2.unitPrice || 0)) < 0.01 &&
    normalized1.supplier === normalized2.supplier &&
    normalized1.partNumber === normalized2.partNumber &&
    normalized1.manufacturer === normalized2.manufacturer &&
    normalized1.category === normalized2.category &&
    normalized1.position === normalized2.position &&
    Math.abs((normalized1.weight || 0) - (normalized2.weight || 0)) < 0.01 &&
    normalized1.productId === normalized2.productId
  );
}

/**
 * 解析 JSON BOM 数据
 */
function parseJsonBom(bomJson: any): any[] {
  if (!bomJson) {
    return [];
  }

  if (Array.isArray(bomJson)) {
    return bomJson;
  }

  if (typeof bomJson === 'object' && bomJson.components && Array.isArray(bomJson.components)) {
    return bomJson.components;
  }

  if (typeof bomJson === 'object') {
    return Object.entries(bomJson).map(([key, value]) => ({
      name: key,
      ...(typeof value === 'object' && value !== null ? value : {}),
    }));
  }

  return [];
}

/**
 * 验证单个方案的数据完整性
 */
async function validateSolution(solutionId: string, solutionTitle: string): Promise<ValidationResult> {
  try {
    // 获取表数据
    const tableItems = await prisma.solutionBomItem.findMany({
      where: { solutionId },
      orderBy: { createdAt: 'asc' },
    });

    // 获取 JSON 数据
    const solution = await prisma.solution.findUnique({
      where: { id: solutionId },
      select: { bom: true },
    });

    const jsonItems = parseJsonBom(solution?.bom);

    // 判断状态
    if (tableItems.length === 0 && jsonItems.length === 0) {
      return {
        solutionId,
        solutionTitle,
        status: 'consistent',
        tableItemCount: 0,
        jsonItemCount: 0,
      };
    }

    if (tableItems.length === 0 && jsonItems.length > 0) {
      return {
        solutionId,
        solutionTitle,
        status: 'missing_table',
        tableItemCount: 0,
        jsonItemCount: jsonItems.length,
      };
    }

    if (tableItems.length > 0 && jsonItems.length === 0) {
      return {
        solutionId,
        solutionTitle,
        status: 'missing_json',
        tableItemCount: tableItems.length,
        jsonItemCount: 0,
      };
    }

    // 比较数据一致性
    if (tableItems.length !== jsonItems.length) {
      return {
        solutionId,
        solutionTitle,
        status: 'inconsistent',
        tableItemCount: tableItems.length,
        jsonItemCount: jsonItems.length,
        differences: [`数量不一致: 表中有 ${tableItems.length} 项，JSON 中有 ${jsonItems.length} 项`],
      };
    }

    // 逐项比较
    const differences: string[] = [];
    for (let i = 0; i < tableItems.length; i++) {
      const tableItem = tableItems[i];
      const jsonItem = jsonItems[i];

      if (!compareBomItems(tableItem, jsonItem)) {
        differences.push(`第 ${i + 1} 项不一致: ${tableItem.name}`);
      }
    }

    return {
      solutionId,
      solutionTitle,
      status: differences.length > 0 ? 'inconsistent' : 'consistent',
      tableItemCount: tableItems.length,
      jsonItemCount: jsonItems.length,
      differences: differences.length > 0 ? differences : undefined,
    };
  } catch (error) {
    return {
      solutionId,
      solutionTitle,
      status: 'error',
      tableItemCount: 0,
      jsonItemCount: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * 验证所有方案的数据完整性
 */
async function validateAllSolutions(): Promise<ValidationReport> {
  const report: ValidationReport = {
    totalSolutions: 0,
    consistentSolutions: 0,
    inconsistentSolutions: 0,
    missingTableSolutions: 0,
    missingJsonSolutions: 0,
    errorSolutions: 0,
    results: [],
  };

  console.log('\n开始验证 BOM 数据完整性...\n');

  try {
    // 获取所有有 BOM 数据的方案
    const solutions = await prisma.solution.findMany({
      where: {
        OR: [
          { bom: { not: null } },
          { bomItems: { some: {} } },
        ],
      },
      select: {
        id: true,
        title: true,
      },
    });

    report.totalSolutions = solutions.length;
    console.log(`找到 ${solutions.length} 个包含 BOM 数据的方案\n`);

    for (const solution of solutions) {
      const result = await validateSolution(solution.id, solution.title);

      report.results.push(result);

      // 更新统计
      switch (result.status) {
        case 'consistent':
          report.consistentSolutions++;
          console.log(`✅ ${solution.title} (${solution.id}): 数据一致`);
          break;
        case 'inconsistent':
          report.inconsistentSolutions++;
          console.log(`⚠️  ${solution.title} (${solution.id}): 数据不一致`);
          if (result.differences) {
            result.differences.forEach(diff => console.log(`   - ${diff}`));
          }
          break;
        case 'missing_table':
          report.missingTableSolutions++;
          console.log(`📋 ${solution.title} (${solution.id}): 缺少表数据 (JSON 有 ${result.jsonItemCount} 项)`);
          break;
        case 'missing_json':
          report.missingJsonSolutions++;
          console.log(`📄 ${solution.title} (${solution.id}): 缺少 JSON 数据 (表有 ${result.tableItemCount} 项)`);
          break;
        case 'error':
          report.errorSolutions++;
          console.log(`❌ ${solution.title} (${solution.id}): 验证错误 - ${result.error}`);
          break;
      }
    }

    // 打印统计信息
    console.log(`\n验证完成！`);
    console.log(`\n统计信息:`);
    console.log(`  总方案数: ${report.totalSolutions}`);
    console.log(`  数据一致: ${report.consistentSolutions}`);
    console.log(`  数据不一致: ${report.inconsistentSolutions}`);
    console.log(`  缺少表数据: ${report.missingTableSolutions}`);
    console.log(`  缺少 JSON 数据: ${report.missingJsonSolutions}`);
    console.log(`  验证错误: ${report.errorSolutions}`);

    return report;
  } catch (error) {
    console.error('验证过程发生错误:', error);
    throw error;
  }
}

/**
 * 生成验证报告文件
 */
async function generateReport(report: ValidationReport): Promise<void> {
  const fs = await import('fs/promises');
  const path = await import('path');

  const reportContent = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalSolutions: report.totalSolutions,
      consistentSolutions: report.consistentSolutions,
      inconsistentSolutions: report.inconsistentSolutions,
      missingTableSolutions: report.missingTableSolutions,
      missingJsonSolutions: report.missingJsonSolutions,
      errorSolutions: report.errorSolutions,
    },
    results: report.results,
  };

  const reportPath = path.join(process.cwd(), 'bom-validation-report.json');
  await fs.writeFile(reportPath, JSON.stringify(reportContent, null, 2), 'utf-8');

  console.log(`\n验证报告已保存到: ${reportPath}`);
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const generateReport = args.includes('--generate-report');

  try {
    const report = await validateAllSolutions();

    if (generateReport) {
      await generateReport(report);
    }
  } catch (error) {
    console.error('执行失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行脚本
if (require.main === module) {
  main();
}

export { validateAllSolutions, validateSolution, generateReport };

