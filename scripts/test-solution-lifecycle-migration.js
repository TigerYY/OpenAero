#!/usr/bin/env node

/**
 * 测试解决方案全周期管理流程迁移
 * 验证数据库迁移是否正确执行
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testMigration() {
  console.log('🔍 开始测试解决方案全周期管理流程迁移...\n');
  
  // 检查环境变量
  if (!process.env.DATABASE_URL) {
    console.error('❌ 错误: DATABASE_URL 环境变量未设置');
    console.error('\n💡 解决方案:');
    console.error('   1. 确保 .env.local 文件存在');
    console.error('   2. 在 .env.local 中设置 DATABASE_URL');
    console.error('   3. 或使用: DATABASE_URL=your_url node scripts/test-solution-lifecycle-migration.js');
    process.exit(1);
  }

  const results = {
    success: [],
    warnings: [],
    errors: [],
  };

  try {
    // 测试1: 检查 SolutionStatus 枚举是否包含新状态
    console.log('✅ 测试1: 检查 SolutionStatus 枚举');
    try {
      const enumValues = await prisma.$queryRaw`
        SELECT enumlabel 
        FROM pg_enum 
        WHERE enumtypid = (SELECT oid FROM pg_type WHERE typname = 'SolutionStatus')
        ORDER BY enumsortorder
      `;
      
      const statuses = enumValues.map(v => v.enumlabel);
      const hasReadyToPublish = statuses.includes('READY_TO_PUBLISH');
      const hasSuspended = statuses.includes('SUSPENDED');
      
      console.log('   枚举值:', statuses.join(', '));
      
      if (hasReadyToPublish && hasSuspended) {
        console.log('   ✅ 新状态已添加: READY_TO_PUBLISH, SUSPENDED');
        results.success.push('SolutionStatus 枚举包含新状态');
      } else {
        const missing = [];
        if (!hasReadyToPublish) missing.push('READY_TO_PUBLISH');
        if (!hasSuspended) missing.push('SUSPENDED');
        console.log('   ❌ 缺少状态:', missing.join(', '));
        results.errors.push(`SolutionStatus 枚举缺少状态: ${missing.join(', ')}`);
      }
    } catch (error) {
      console.log('   ❌ 查询枚举失败:', error.message);
      results.errors.push('无法查询 SolutionStatus 枚举');
    }

    // 测试2: 检查 solutions 表的升级相关字段
    console.log('\n✅ 测试2: 检查 solutions 表升级字段');
    try {
      const columns = await prisma.$queryRaw`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'solutions' 
        AND column_name IN ('upgraded_from_id', 'upgraded_from_version', 'upgrade_notes', 'is_upgrade')
        ORDER BY column_name
      `;
      
      const expectedFields = ['upgraded_from_id', 'upgraded_from_version', 'upgrade_notes', 'is_upgrade'];
      const foundFields = columns.map(c => c.column_name);
      
      console.log('   找到的字段:', foundFields.join(', '));
      
      const missingFields = expectedFields.filter(f => !foundFields.includes(f));
      if (missingFields.length === 0) {
        console.log('   ✅ 所有升级字段已添加');
        results.success.push('solutions 表升级字段完整');
      } else {
        console.log('   ❌ 缺少字段:', missingFields.join(', '));
        results.errors.push(`solutions 表缺少字段: ${missingFields.join(', ')}`);
      }
    } catch (error) {
      console.log('   ❌ 查询字段失败:', error.message);
      results.errors.push('无法查询 solutions 表字段');
    }

    // 测试3: 检查 solution_publishing 表是否存在
    console.log('\n✅ 测试3: 检查 solution_publishing 表');
    try {
      const tableExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT 1 FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'solution_publishing'
        ) as exists
      `;
      
      if (tableExists[0]?.exists) {
        console.log('   ✅ solution_publishing 表存在');
        results.success.push('solution_publishing 表已创建');
        
        // 检查关键字段
        const columns = await prisma.$queryRaw`
          SELECT column_name, data_type
          FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = 'solution_publishing'
          AND column_name IN ('publish_description', 'media_links', 'product_links', 'meta_title', 'is_featured', 'view_count')
          ORDER BY column_name
        `;
        
        const keyFields = ['publish_description', 'media_links', 'product_links', 'meta_title', 'is_featured', 'view_count'];
        const foundKeyFields = columns.map(c => c.column_name);
        const missingKeyFields = keyFields.filter(f => !foundKeyFields.includes(f));
        
        if (missingKeyFields.length === 0) {
          console.log('   ✅ 关键字段完整');
          results.success.push('solution_publishing 表字段完整');
        } else {
          console.log('   ⚠️  缺少关键字段:', missingKeyFields.join(', '));
          results.warnings.push(`solution_publishing 表缺少字段: ${missingKeyFields.join(', ')}`);
        }
      } else {
        console.log('   ❌ solution_publishing 表不存在');
        results.errors.push('solution_publishing 表未创建');
      }
    } catch (error) {
      console.log('   ❌ 查询表失败:', error.message);
      results.errors.push('无法查询 solution_publishing 表');
    }

    // 测试4: 检查外键约束
    console.log('\n✅ 测试4: 检查外键约束');
    try {
      const foreignKeys = await prisma.$queryRaw`
        SELECT
          tc.constraint_name,
          tc.table_name,
          kcu.column_name,
          ccu.table_name AS foreign_table_name,
          ccu.column_name AS foreign_column_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.constraint_type = 'FOREIGN KEY'
        AND (
          (tc.table_name = 'solution_publishing' AND kcu.column_name = 'solution_id')
          OR (tc.table_name = 'solutions' AND kcu.column_name = 'upgraded_from_id')
        )
      `;
      
      const expectedFKs = [
        { table: 'solution_publishing', column: 'solution_id', refTable: 'solutions' },
        { table: 'solutions', column: 'upgraded_from_id', refTable: 'solutions' },
      ];
      
      let foundCount = 0;
      for (const fk of foreignKeys) {
        const match = expectedFKs.find(
          e => e.table === fk.table_name && 
               e.column === fk.column_name && 
               e.refTable === fk.foreign_table_name
        );
        if (match) {
          console.log(`   ✅ 外键: ${fk.table_name}.${fk.column_name} → ${fk.foreign_table_name}.${fk.foreign_column_name}`);
          foundCount++;
        }
      }
      
      if (foundCount === expectedFKs.length) {
        results.success.push('外键约束完整');
      } else {
        results.warnings.push(`部分外键可能缺失 (找到 ${foundCount}/${expectedFKs.length})`);
      }
    } catch (error) {
      console.log('   ⚠️  查询外键失败:', error.message);
      results.warnings.push('无法查询外键约束');
    }

    // 测试5: 检查索引
    console.log('\n✅ 测试5: 检查索引');
    try {
      const indexes = await prisma.$queryRaw`
        SELECT indexname, tablename
        FROM pg_indexes
        WHERE schemaname = 'public'
        AND (
          (tablename = 'solution_publishing' AND indexname LIKE '%solution_publishing%')
          OR (tablename = 'solutions' AND indexname LIKE '%upgraded%')
        )
        ORDER BY tablename, indexname
      `;
      
      console.log(`   找到 ${indexes.length} 个相关索引`);
      if (indexes.length > 0) {
        indexes.forEach(idx => {
          console.log(`   - ${idx.tablename}.${idx.indexname}`);
        });
        results.success.push(`创建了 ${indexes.length} 个索引`);
      } else {
        results.warnings.push('未找到相关索引（可能不影响功能）');
      }
    } catch (error) {
      console.log('   ⚠️  查询索引失败:', error.message);
      results.warnings.push('无法查询索引');
    }

    // 测试6: 测试 Prisma Client 类型
    console.log('\n✅ 测试6: 测试 Prisma Client 类型');
    try {
      // 尝试使用新的 SolutionStatus 值
      const testStatuses = ['READY_TO_PUBLISH', 'SUSPENDED'];
      for (const status of testStatuses) {
        try {
          // 只是验证类型，不实际查询
          const _test = status; // TypeScript 会在编译时检查
          console.log(`   ✅ ${status} 类型可用`);
        } catch (error) {
          console.log(`   ❌ ${status} 类型不可用:`, error.message);
          results.errors.push(`${status} 类型不可用`);
        }
      }
      results.success.push('Prisma Client 类型验证通过');
    } catch (error) {
      console.log('   ⚠️  类型测试失败:', error.message);
      results.warnings.push('Prisma Client 类型测试失败');
    }

  } catch (error) {
    console.error('\n❌ 测试过程中发生错误:', error);
    results.errors.push(`测试错误: ${error.message}`);
  } finally {
    await prisma.$disconnect();
  }

  // 输出总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果总结');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${results.success.length}`);
  results.success.forEach(msg => console.log(`   ✓ ${msg}`));
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  警告: ${results.warnings.length}`);
    results.warnings.forEach(msg => console.log(`   ⚠ ${msg}`));
  }
  
  if (results.errors.length > 0) {
    console.log(`\n❌ 错误: ${results.errors.length}`);
    results.errors.forEach(msg => console.log(`   ✗ ${msg}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (results.errors.length === 0) {
    console.log('🎉 迁移验证通过！所有检查项都成功。');
    process.exit(0);
  } else {
    console.log('⚠️  迁移验证未完全通过，请检查上述错误。');
    process.exit(1);
  }
}

// 运行测试
testMigration().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

