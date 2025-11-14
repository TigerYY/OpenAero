#!/usr/bin/env node

/**
 * 修复 applications 表的外键约束
 * 如果 applications 表引用了 auth.users，我们需要处理这个约束
 */

// 加载 .env.local 文件
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function checkApplicationsTable() {
  try {
    // 检查 applications 表是否存在
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'applications'
    `;
    
    if (tables.length === 0) {
      console.log('✅ applications 表不存在，无需修复');
      return;
    }
    
    // 检查外键约束
    const constraints = await prisma.$queryRaw`
      SELECT 
        tc.constraint_name,
        tc.table_name,
        kcu.column_name,
        ccu.table_schema AS foreign_table_schema,
        ccu.table_name AS foreign_table_name,
        ccu.column_name AS foreign_column_name
      FROM information_schema.table_constraints AS tc
      JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
      JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
      WHERE tc.table_schema = 'public'
        AND tc.table_name = 'applications'
        AND tc.constraint_type = 'FOREIGN KEY'
    `;
    
    console.log('发现的外键约束:');
    constraints.forEach(constraint => {
      console.log(`  - ${constraint.constraint_name}: ${constraint.column_name} -> ${constraint.foreign_table_schema}.${constraint.foreign_table_name}.${constraint.foreign_column_name}`);
      
      if (constraint.foreign_table_schema === 'auth') {
        console.log(`    ⚠️  此约束引用了 auth schema，需要删除或修改`);
      }
    });
    
    // 如果引用了 auth.users，删除该约束
    const authConstraints = constraints.filter(c => c.foreign_table_schema === 'auth');
    if (authConstraints.length > 0) {
      console.log('\n删除引用 auth schema 的约束...');
      for (const constraint of authConstraints) {
        try {
          await prisma.$executeRawUnsafe(
            `ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS ${constraint.constraint_name}`
          );
          console.log(`  ✅ 已删除约束: ${constraint.constraint_name}`);
        } catch (error) {
          console.error(`  ❌ 删除约束失败: ${constraint.constraint_name}`, error.message);
        }
      }
    }
    
  } catch (error) {
    console.error('检查失败:', error.message);
  }
}

async function main() {
  console.log('🔍 检查 applications 表...\n');
  await checkApplicationsTable();
  await prisma.$disconnect();
}

main().catch(console.error);

