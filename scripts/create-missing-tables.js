#!/usr/bin/env node

/**
 * 创建缺失表的脚本
 * 检查 Prisma schema 中定义的表，并在 Supabase 中创建缺失的表
 */

// 加载 .env.local 文件
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function checkExistingTables() {
  logSection('📋 检查现有表');
  
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    const tableNames = tables.map(t => t.table_name);
    log(`发现 ${tableNames.length} 个现有表`, 'blue');
    
    return new Set(tableNames);
  } catch (error) {
    log(`❌ 检查表失败: ${error.message}`, 'red');
    return new Set();
  }
}

async function getExpectedTables() {
  // Prisma schema 中定义的所有表
  const expectedTables = [
    'user_profiles',
    'creator_profiles',
    'user_addresses',
    'user_sessions',
    'audit_logs',
    'solutions',
    'solution_versions',
    'solution_files',
    'solution_reviews',
    'orders',
    'order_solutions',
    'payment_transactions',
    'payment_events',
    'payment_gateways',
    'revenue_shares',
    'reviews',
    'favorites',
    'factories',
    'sample_orders',
    'product_categories',
    'products',
    'product_inventory',
    'carts',
    'cart_items',
    'order_items',
    'product_reviews',
    'notifications',
    'notification_preferences',
    'collaboration_sessions',
    'collaboration_operations',
  ];
  
  return expectedTables;
}

async function findMissingTables(existingTables, expectedTables) {
  const missing = expectedTables.filter(table => !existingTables.has(table));
  return missing;
}

async function createMissingTables() {
  logSection('🔍 检查缺失的表');
  
  // 检查环境变量
  if (!process.env.DATABASE_URL) {
    log('❌ 错误: DATABASE_URL 环境变量未设置', 'red');
    process.exit(1);
  }
  
  try {
    // 1. 获取现有表
    const existingTables = await checkExistingTables();
    
    // 2. 获取期望的表
    const expectedTables = await getExpectedTables();
    
    // 3. 找出缺失的表
    const missingTables = await findMissingTables(existingTables, expectedTables);
    
    if (missingTables.length === 0) {
      log('✅ 所有表都已存在！', 'green');
      return;
    }
    
    log(`发现 ${missingTables.length} 个缺失的表:`, 'yellow');
    missingTables.forEach((table, index) => {
      log(`  ${index + 1}. ${table}`, 'blue');
    });
    
    logSection('🔧 修复所有引用 auth.users 的外键约束');
    
    // 修复所有引用 auth.users 的表的外键约束
    try {
      log('查找所有引用 auth.users 的外键约束...', 'yellow');
      
      // 查找所有引用 auth schema 的外键约束
      const authConstraints = await prisma.$queryRaw`
        SELECT 
          tc.table_name,
          tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
          ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
          ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
          AND tc.constraint_type = 'FOREIGN KEY'
          AND ccu.table_schema = 'auth'
        ORDER BY tc.table_name, tc.constraint_name
      `;
      
      if (authConstraints.length > 0) {
        log(`发现 ${authConstraints.length} 个引用 auth schema 的外键约束:`, 'blue');
        
        // 删除所有引用 auth schema 的外键约束
        for (const constraint of authConstraints) {
          try {
            const dropSql = `ALTER TABLE public.${constraint.table_name} DROP CONSTRAINT IF EXISTS ${constraint.constraint_name}`;
            await prisma.$executeRawUnsafe(dropSql);
            log(`  ✅ 已删除: ${constraint.table_name}.${constraint.constraint_name}`, 'green');
          } catch (error) {
            log(`  ⚠️  删除失败: ${constraint.table_name}.${constraint.constraint_name} - ${error.message}`, 'yellow');
          }
        }
        
        log('✅ 所有引用 auth.users 的外键约束已修复', 'green');
      } else {
        log('未找到引用 auth schema 的外键约束', 'blue');
      }
      
      // 删除不在 Prisma schema 中的表（如果存在）
      // 注意：applications 表可能已经不存在，这里只是作为清理步骤
      const tablesToDelete = ['applications'];
      for (const tableName of tablesToDelete) {
        try {
          const tableExists = await prisma.$queryRawUnsafe(`
            SELECT EXISTS (
              SELECT 1 
              FROM information_schema.tables 
              WHERE table_schema = 'public' 
              AND table_name = '${tableName}'
            ) as exists
          `);
          
          if (tableExists && tableExists[0]?.exists) {
            log(`删除 ${tableName} 表（不在 Prisma schema 中）...`, 'yellow');
            await prisma.$executeRawUnsafe(`DROP TABLE IF EXISTS public.${tableName} CASCADE`);
            log(`✅ ${tableName} 表已删除`, 'green');
          } else {
            log(`${tableName} 表不存在，跳过删除`, 'blue');
          }
        } catch (error) {
          log(`⚠️  检查 ${tableName} 表时出现警告: ${error.message}`, 'yellow');
        }
      }
      
    } catch (error) {
      // 如果修复失败，继续尝试（可能表不存在或约束已删除）
      log(`⚠️  修复外键约束时出现警告: ${error.message}`, 'yellow');
      log('继续执行表创建...', 'blue');
    }
    
    logSection('🚀 创建缺失的表');
    log('使用 Prisma db push 创建缺失的表...', 'yellow');
    
    // 使用 Prisma db push 创建缺失的表
    try {
      const output = execSync('npx prisma db push --accept-data-loss --skip-generate', {
        encoding: 'utf-8',
        stdio: 'inherit',
        env: {
          ...process.env,
          DATABASE_URL: process.env.DATABASE_URL,
        },
      });
      
      log('✅ 表创建成功', 'green');
      
      // 生成 Prisma Client
      log('🔧 生成 Prisma Client...', 'yellow');
      execSync('npx prisma generate', {
        encoding: 'utf-8',
        stdio: 'inherit',
        env: process.env,
      });
      log('✅ Prisma Client 生成成功', 'green');
      
    } catch (error) {
      log(`❌ Prisma db push 失败: ${error.message}`, 'red');
      
      // 检查是否是跨 schema 错误
      if (error.message.includes('Cross schema references') || error.message.includes('auth')) {
        log('\n⚠️  检测到跨 schema 引用错误', 'yellow');
        log('请在 Supabase Dashboard > SQL Editor 执行以下 SQL 来修复:', 'yellow');
        log('\n文件: supabase/migrations/009_remove_all_auth_fk.sql', 'blue');
        log('\n或者直接执行以下 SQL:', 'yellow');
        log(`
-- 删除所有引用 auth.users 的外键约束
DO $$
DECLARE
    constraint_rec RECORD;
BEGIN
    FOR constraint_rec IN
        SELECT tc.table_name, tc.constraint_name
        FROM information_schema.table_constraints AS tc
        JOIN information_schema.key_column_usage AS kcu
            ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage AS ccu
            ON ccu.constraint_name = tc.constraint_name
        WHERE tc.table_schema = 'public'
            AND tc.constraint_type = 'FOREIGN KEY'
            AND ccu.table_schema = 'auth'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DROP CONSTRAINT IF EXISTS %I', 
            constraint_rec.table_name, constraint_rec.constraint_name);
        RAISE NOTICE '已删除: %.%', constraint_rec.table_name, constraint_rec.constraint_name;
    END LOOP;
END $$;
        `, 'blue');
        log('\n执行完成后，重新运行: npm run db:create-missing', 'yellow');
      }
      
      throw error;
    }
    
    // 4. 验证表是否创建成功
    logSection('✅ 验证表创建');
    const newExistingTables = await checkExistingTables();
    const stillMissing = await findMissingTables(newExistingTables, expectedTables);
    
    if (stillMissing.length === 0) {
      log('✅ 所有表都已成功创建！', 'green');
    } else {
      log(`⚠️  仍有 ${stillMissing.length} 个表未创建:`, 'yellow');
      stillMissing.forEach(table => {
        log(`  - ${table}`, 'red');
      });
    }
    
  } catch (error) {
    log(`❌ 发生错误: ${error.message}`, 'red');
    console.error(error);
    throw error;
  }
}

async function main() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                       ║', 'cyan');
  log('║     🔧 创建缺失表工具 🔧                             ║', 'cyan');
  log('║                                                       ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');
  
  try {
    await createMissingTables();
    
    logSection('✨ 完成');
    log('✅ 缺失表创建流程已完成！', 'green');
    log('\n📝 下一步:', 'yellow');
    log('  1. 在 Supabase Dashboard 中验证所有表', 'blue');
    log('  2. 应用 RLS 策略: npm run db:rls', 'blue');
    log('  3. 测试应用功能', 'blue');
    
  } catch (error) {
    log(`\n❌ 发生错误: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  log(`\n❌ 未处理的错误: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

