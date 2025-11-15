/**
 * 检查 BOM 迁移状态
 * 查找需要迁移的 BOM 数据
 * 
 * 使用方法：
 *   npx tsx scripts/check-bom-migration-status.ts
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

interface MigrationStatus {
  solutionId: string;
  title: string;
  hasBomJson: boolean;
  bomJsonItemCount: number;
  hasBomItems: boolean;
  bomItemCount: number;
  needsMigration: boolean;
  bomJsonPreview?: any;
}

/**
 * 解析 BOM JSON 数据并计算项数
 */
function countBomJsonItems(bomJson: any): number {
  if (!bomJson) {
    return 0;
  }

  if (Array.isArray(bomJson)) {
    return bomJson.length;
  }

  if (typeof bomJson === 'object' && bomJson.components && Array.isArray(bomJson.components)) {
    return bomJson.components.length;
  }

  if (typeof bomJson === 'object') {
    return Object.keys(bomJson).length;
  }

  return 0;
}

/**
 * 检查迁移状态
 */
async function checkMigrationStatus(): Promise<void> {
  console.log('\n检查 BOM 迁移状态...\n');

  try {
    // 检查数据库是否有 bom 字段
    let hasBomColumn = true;
    try {
      // 尝试查询 bom 字段
      await prisma.$queryRaw`SELECT bom FROM solutions LIMIT 1`;
    } catch (error: any) {
      if (error?.code === 'P2022' || error?.message?.includes('does not exist')) {
        hasBomColumn = false;
        console.log('⚠️  数据库中没有 bom 字段，可能从未创建过或已被移除。\n');
      } else {
        throw error;
      }
    }

    // 获取所有方案
    const solutions = await prisma.solution.findMany({
      select: {
        id: true,
        title: true,
        ...(hasBomColumn ? { bom: true } : {}),
        _count: {
          select: {
            bomItems: true,
          },
        },
      },
    });

    console.log(`总共找到 ${solutions.length} 个方案\n`);

    const statuses: MigrationStatus[] = [];
    let needsMigrationCount = 0;
    let alreadyMigratedCount = 0;
    let noBomDataCount = 0;

    for (const solution of solutions) {
      const hasBomJson = hasBomColumn && (solution as any).bom !== null && (solution as any).bom !== undefined;
      const bomJsonItemCount = hasBomJson ? countBomJsonItems((solution as any).bom) : 0;
      const hasBomItems = solution._count.bomItems > 0;
      const bomItemCount = solution._count.bomItems;
      const needsMigration = hasBomJson && bomJsonItemCount > 0 && !hasBomItems;

      const status: MigrationStatus = {
        solutionId: solution.id,
        title: solution.title,
        hasBomJson,
        bomJsonItemCount,
        hasBomItems,
        bomItemCount,
        needsMigration,
        bomJsonPreview: hasBomJson && needsMigration ? (solution as any).bom : undefined,
      };

      statuses.push(status);

      if (needsMigration) {
        needsMigrationCount++;
      } else if (hasBomItems) {
        alreadyMigratedCount++;
      } else {
        noBomDataCount++;
      }
    }

    // 打印统计信息
    console.log('=== 迁移状态统计 ===\n');
    console.log(`总方案数: ${solutions.length}`);
    console.log(`需要迁移: ${needsMigrationCount}`);
    console.log(`已迁移: ${alreadyMigratedCount}`);
    console.log(`无 BOM 数据: ${noBomDataCount}\n`);

    // 列出需要迁移的方案
    const needsMigration = statuses.filter(s => s.needsMigration);
    if (needsMigration.length > 0) {
      console.log('=== 需要迁移的方案 ===\n');
      needsMigration.forEach((status, index) => {
        console.log(`${index + 1}. ${status.title} (${status.solutionId})`);
        console.log(`   JSON BOM 项数: ${status.bomJsonItemCount}`);
        console.log(`   表 BOM 项数: ${status.bomItemCount}`);
        if (status.bomJsonPreview) {
          const preview = JSON.stringify(status.bomJsonPreview).substring(0, 100);
          console.log(`   JSON 预览: ${preview}...`);
        }
        console.log('');
      });
    } else {
      console.log('✅ 没有需要迁移的方案！\n');
    }

    // 列出已迁移的方案（有表数据但可能还有 JSON）
    const migrated = statuses.filter(s => s.hasBomItems);
    if (migrated.length > 0) {
      console.log('=== 已迁移的方案 ===\n');
      migrated.forEach((status, index) => {
        const hasBoth = status.hasBomJson && status.hasBomItems;
        console.log(`${index + 1}. ${status.title} (${status.solutionId})`);
        console.log(`   表 BOM 项数: ${status.bomItemCount}`);
        if (hasBoth) {
          console.log(`   ⚠️  同时存在 JSON 数据 (${status.bomJsonItemCount} 项)`);
        }
        console.log('');
      });
    }

    // 列出无 BOM 数据的方案
    const noBom = statuses.filter(s => !s.hasBomJson && !s.hasBomItems);
    if (noBom.length > 0) {
      console.log(`\n=== 无 BOM 数据的方案 (${noBom.length} 个) ===\n`);
      console.log('这些方案没有 BOM 数据，无需迁移。\n');
    }

    // 建议
    console.log('=== 建议 ===\n');
    if (!hasBomColumn) {
      console.log('📋 数据库中没有 bom 字段。');
      console.log('这意味着：');
      console.log('  - 可能从未使用过 JSON 格式的 BOM 数据');
      console.log('  - 或者该字段已被移除');
      console.log('  - 所有 BOM 数据应该已经存储在 solution_bom_items 表中\n');
      console.log('✅ 无需执行迁移。');
      console.log('可以运行验证脚本检查现有 BOM 数据: npm run bom:validate:report\n');
    } else if (needsMigrationCount > 0) {
      console.log(`发现 ${needsMigrationCount} 个方案需要迁移。`);
      console.log('建议执行以下步骤：');
      console.log('1. 预览迁移: npm run bom:migrate:dry-run');
      console.log('2. 执行迁移: npm run bom:migrate');
      console.log('3. 验证数据: npm run bom:validate:report\n');
    } else {
      console.log('✅ 所有方案都已迁移或无需迁移。');
      console.log('可以运行验证脚本确认数据完整性: npm run bom:validate:report\n');
    }

  } catch (error) {
    console.error('检查过程发生错误:', error);
    throw error;
  }
}

// 主函数
async function main() {
  try {
    await checkMigrationStatus();
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

export { checkMigrationStatus };

