#!/usr/bin/env node

/**
 * 使用.env.local配置测试数据库连接
 */

// 先加载.env.local
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');

console.log('🔍 使用的DATABASE_URL:', process.env.DATABASE_URL?.substring(0, 100) + '...\n');

const prisma = new PrismaClient({
  log: ['error', 'warn'],
});

async function testConnection() {
  try {
    console.log('✅ 测试数据库连接...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功!\n');

    console.log('✅ 测试查询...');
    const result = await prisma.$queryRaw`SELECT current_database(), version()`;
    console.log('   当前数据库:', result[0]?.current_database);
    console.log('   PostgreSQL版本:', result[0]?.version?.substring(0, 50) + '...\n');

    console.log('✅ 检查数据库表...');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log(`   找到 ${tables.length} 个表:`, tables.map(t => t.table_name).join(', ') || '(无)');

    if (tables.length === 0) {
      console.log('\n⚠️  数据库中没有表,需要运行迁移:');
      console.log('   npx prisma db push\n');
    } else {
      // 测试用户表
      if (tables.some(t => t.table_name === 'users')) {
        const userCount = await prisma.user.count();
        console.log(`\n✅ Users表: ${userCount} 条记录`);
      }
      
      // 测试方案表
      if (tables.some(t => t.table_name === 'solutions')) {
        const solutionCount = await prisma.solution.count();
        console.log(`✅ Solutions表: ${solutionCount} 条记录`);
      }
    }

    console.log('\n✅ 所有测试通过!数据库连接正常。');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ 数据库连接失败:', error.message);
    if (error.code) console.error('   错误代码:', error.code);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
