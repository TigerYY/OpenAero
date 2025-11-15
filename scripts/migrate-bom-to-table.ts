/**
 * BOM 数据迁移脚本
 * 将 Solution.bom JSON 字段转换为 SolutionBomItem 记录
 * 
 * 使用方法：
 *   npx tsx scripts/migrate-bom-to-table.ts [--dry-run] [--rollback]
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface BomJsonItem {
  name?: string;
  model?: string;
  quantity?: number;
  unit?: string;
  notes?: string;
  unitPrice?: number;
  price?: number; // 兼容旧字段名
  supplier?: string;
  partNumber?: string;
  manufacturer?: string;
  category?: string;
  position?: string;
  weight?: number;
  specifications?: Record<string, any>;
  productId?: string;
}

interface BomJsonData {
  components?: BomJsonItem[];
  [key: string]: any; // 兼容对象格式 { "component1": {...}, ... }
}

interface MigrationStats {
  totalSolutions: number;
  solutionsWithBom: number;
  solutionsMigrated: number;
  solutionsSkipped: number;
  itemsCreated: number;
  errors: Array<{ solutionId: string; error: string }>;
}

/**
 * 解析 BOM JSON 数据
 */
function parseBomJson(bomJson: any): BomJsonItem[] {
  if (!bomJson) {
    return [];
  }

  // 如果是数组格式
  if (Array.isArray(bomJson)) {
    return bomJson.map(item => normalizeBomItem(item));
  }

  // 如果是对象格式，包含 components 字段
  if (typeof bomJson === 'object' && bomJson.components && Array.isArray(bomJson.components)) {
    return bomJson.components.map(item => normalizeBomItem(item));
  }

  // 如果是对象格式，键值对形式 { "component1": {...}, ... }
  if (typeof bomJson === 'object') {
    return Object.entries(bomJson).map(([key, value]) => {
      const item = typeof value === 'object' && value !== null ? value as BomJsonItem : {};
      return normalizeBomItem({
        name: key,
        ...item,
      });
    });
  }

  return [];
}

/**
 * 规范化 BOM 项数据
 */
function normalizeBomItem(item: any): BomJsonItem {
  return {
    name: item.name || item.component || '未知物料',
    model: item.model || undefined,
    quantity: typeof item.quantity === 'number' ? item.quantity : (item.quantity ? parseInt(String(item.quantity)) : 1),
    unit: item.unit || '个',
    notes: item.notes || item.description || undefined,
    unitPrice: item.unitPrice !== undefined ? item.unitPrice : (item.price !== undefined ? item.price : undefined),
    supplier: item.supplier || undefined,
    partNumber: item.partNumber || item.part_number || item.sku || undefined,
    manufacturer: item.manufacturer || undefined,
    category: item.category || undefined,
    position: item.position || undefined,
    weight: item.weight !== undefined ? item.weight : undefined,
    specifications: item.specifications || item.specs || undefined,
    productId: item.productId || item.product_id || undefined,
  };
}

/**
 * 验证 BOM 项数据
 */
function validateBomItem(item: BomJsonItem): { valid: boolean; error?: string } {
  if (!item.name || item.name.trim().length === 0) {
    return { valid: false, error: '物料名称不能为空' };
  }

  if (item.quantity !== undefined && (item.quantity < 1 || !Number.isInteger(item.quantity))) {
    return { valid: false, error: '数量必须是大于0的整数' };
  }

  if (item.unitPrice !== undefined && item.unitPrice < 0) {
    return { valid: false, error: '单价不能为负数' };
  }

  if (item.weight !== undefined && item.weight < 0) {
    return { valid: false, error: '重量不能为负数' };
  }

  return { valid: true };
}

/**
 * 执行迁移
 */
async function migrateBomData(dryRun: boolean = false): Promise<MigrationStats> {
  const stats: MigrationStats = {
    totalSolutions: 0,
    solutionsWithBom: 0,
    solutionsMigrated: 0,
    solutionsSkipped: 0,
    itemsCreated: 0,
    errors: [],
  };

  console.log(`\n${dryRun ? '[DRY RUN] ' : ''}开始 BOM 数据迁移...\n`);

  try {
    // 获取所有方案
    const solutions = await prisma.solution.findMany({
      where: {
        bom: { not: null },
      },
      select: {
        id: true,
        title: true,
        bom: true,
        _count: {
          select: {
            bomItems: true,
          },
        },
      },
    });

    stats.totalSolutions = solutions.length;
    stats.solutionsWithBom = solutions.length;

    console.log(`找到 ${solutions.length} 个包含 BOM JSON 数据的方案\n`);

    for (const solution of solutions) {
      try {
        // 检查是否已有 BOM 项记录
        if (solution._count.bomItems > 0) {
          console.log(`⏭️  跳过方案 ${solution.id} (${solution.title}): 已有 ${solution._count.bomItems} 个 BOM 项记录`);
          stats.solutionsSkipped++;
          continue;
        }

        // 解析 BOM JSON
        const bomItems = parseBomJson(solution.bom);

        if (bomItems.length === 0) {
          console.log(`⚠️  跳过方案 ${solution.id} (${solution.title}): BOM JSON 数据为空或格式不正确`);
          stats.solutionsSkipped++;
          continue;
        }

        // 验证所有 BOM 项
        const validationErrors: string[] = [];
        for (const item of bomItems) {
          const validation = validateBomItem(item);
          if (!validation.valid) {
            validationErrors.push(`${item.name}: ${validation.error}`);
          }
        }

        if (validationErrors.length > 0) {
          console.log(`❌ 方案 ${solution.id} (${solution.title}) 验证失败:`);
          validationErrors.forEach(err => console.log(`   - ${err}`));
          stats.errors.push({
            solutionId: solution.id,
            error: validationErrors.join('; '),
          });
          continue;
        }

        // 执行迁移
        if (!dryRun) {
          await prisma.$transaction(async (tx) => {
            // 创建 BOM 项记录
            await Promise.all(
              bomItems.map(item =>
                tx.solutionBomItem.create({
                  data: {
                    solutionId: solution.id,
                    name: item.name!,
                    model: item.model,
                    quantity: item.quantity || 1,
                    unit: item.unit || '个',
                    notes: item.notes,
                    unitPrice: item.unitPrice !== undefined ? item.unitPrice : null,
                    supplier: item.supplier,
                    partNumber: item.partNumber,
                    manufacturer: item.manufacturer,
                    category: item.category as any,
                    position: item.position,
                    weight: item.weight !== undefined ? item.weight : null,
                    specifications: item.specifications || null,
                    productId: item.productId || null,
                  },
                })
              )
            );
          });
        }

        console.log(`✅ ${dryRun ? '[DRY RUN] ' : ''}方案 ${solution.id} (${solution.title}): 创建了 ${bomItems.length} 个 BOM 项`);
        stats.solutionsMigrated++;
        stats.itemsCreated += bomItems.length;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`❌ 方案 ${solution.id} (${solution.title}) 迁移失败:`, errorMessage);
        stats.errors.push({
          solutionId: solution.id,
          error: errorMessage,
        });
      }
    }

    // 打印统计信息
    console.log(`\n${dryRun ? '[DRY RUN] ' : ''}迁移完成！`);
    console.log(`\n统计信息:`);
    console.log(`  总方案数: ${stats.totalSolutions}`);
    console.log(`  包含 BOM JSON: ${stats.solutionsWithBom}`);
    console.log(`  成功迁移: ${stats.solutionsMigrated}`);
    console.log(`  跳过: ${stats.solutionsSkipped}`);
    console.log(`  创建 BOM 项: ${stats.itemsCreated}`);
    console.log(`  错误: ${stats.errors.length}`);

    if (stats.errors.length > 0) {
      console.log(`\n错误详情:`);
      stats.errors.forEach((err, index) => {
        console.log(`  ${index + 1}. 方案 ${err.solutionId}: ${err.error}`);
      });
    }

    return stats;
  } catch (error) {
    console.error('迁移过程发生错误:', error);
    throw error;
  }
}

/**
 * 回滚迁移（删除所有从 JSON 迁移的 BOM 项）
 */
async function rollbackMigration(): Promise<void> {
  console.log('\n开始回滚迁移...\n');

  try {
    // 获取所有有 BOM 项记录且仍有 BOM JSON 的方案
    const solutions = await prisma.solution.findMany({
      where: {
        bom: { not: null },
        bomItems: {
          some: {},
        },
      },
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            bomItems: true,
          },
        },
      },
    });

    console.log(`找到 ${solutions.length} 个需要回滚的方案\n`);

    for (const solution of solutions) {
      try {
        await prisma.solutionBomItem.deleteMany({
          where: { solutionId: solution.id },
        });

        console.log(`✅ 方案 ${solution.id} (${solution.title}): 删除了 ${solution._count.bomItems} 个 BOM 项`);
      } catch (error) {
        console.error(`❌ 方案 ${solution.id} (${solution.title}) 回滚失败:`, error);
      }
    }

    console.log('\n回滚完成！');
  } catch (error) {
    console.error('回滚过程发生错误:', error);
    throw error;
  }
}

// 主函数
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const rollback = args.includes('--rollback');

  try {
    if (rollback) {
      await rollbackMigration();
    } else {
      await migrateBomData(dryRun);
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

export { migrateBomData, rollbackMigration, parseBomJson, normalizeBomItem, validateBomItem };

