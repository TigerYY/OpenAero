#!/usr/bin/env node

/**
 * 数据库连接测试脚本
 * 测试Prisma与Supabase PostgreSQL的连接
 */

const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function testDatabaseConnection() {
  console.log('🔍 开始测试数据库连接...\n');

  const results = {
    success: [],
    warnings: [],
    errors: [],
  };

  try {
    // 测试1: 基本连接测试
    console.log('✅ 测试1: 数据库连接');
    await prisma.$connect();
    results.success.push('数据库连接成功');

    // 测试2: 执行简单查询
    console.log('✅ 测试2: 执行查询');
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('   查询结果:', result);
    results.success.push('查询执行成功');

    // 测试3: 检查数据库版本
    console.log('✅ 测试3: 数据库版本');
    const version = await prisma.$queryRaw`SELECT version()`;
    console.log('   PostgreSQL版本:', version[0]?.version?.substring(0, 50) + '...');
    results.success.push('数据库版本查询成功');

    // 测试4: 检查Schema是否存在
    console.log('✅ 测试4: 检查数据库表');
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log('   找到的表数量:', tables.length);
    if (tables.length > 0) {
      console.log('   表列表:', tables.map(t => t.table_name).join(', '));
      results.success.push(`发现${tables.length}个数据库表`);
    } else {
      results.warnings.push('数据库中没有找到表,可能需要运行Prisma迁移');
    }

    // 测试5: 测试User模型(如果表存在)
    if (tables.some(t => t.table_name === 'users')) {
      console.log('✅ 测试5: 查询Users表');
      const userCount = await prisma.user.count();
      console.log('   用户数量:', userCount);
      results.success.push(`Users表查询成功,共${userCount}条记录`);
    } else {
      results.warnings.push('Users表不存在,跳过用户查询测试');
    }

    // 测试6: 测试Solution模型(如果表存在)
    if (tables.some(t => t.table_name === 'solutions')) {
      console.log('✅ 测试6: 查询Solutions表');
      const solutionCount = await prisma.solution.count();
      console.log('   方案数量:', solutionCount);
      results.success.push(`Solutions表查询成功,共${solutionCount}条记录`);
    } else {
      results.warnings.push('Solutions表不存在,跳过方案查询测试');
    }

    // 测试7: 测试Order模型(如果表存在)
    if (tables.some(t => t.table_name === 'orders')) {
      console.log('✅ 测试7: 查询Orders表');
      const orderCount = await prisma.order.count();
      console.log('   订单数量:', orderCount);
      results.success.push(`Orders表查询成功,共${orderCount}条记录`);
    } else {
      results.warnings.push('Orders表不存在,跳过订单查询测试');
    }

    // 测试8: 检查Supabase Auth表
    console.log('✅ 测试8: 检查Supabase Auth表');
    const authTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'auth'
      ORDER BY table_name
    `;
    if (authTables.length > 0) {
      console.log('   Supabase Auth表:', authTables.map(t => t.table_name).join(', '));
      results.success.push(`发现${authTables.length}个Supabase Auth表`);
    }

  } catch (error) {
    console.error('❌ 测试失败:', error);
    results.errors.push({
      message: error.message,
      code: error.code,
      meta: error.meta,
    });
  } finally {
    await prisma.$disconnect();
    console.log('\n📊 测试结果汇总:');
    console.log('='.repeat(60));
    
    if (results.success.length > 0) {
      console.log('\n✅ 成功的测试:');
      results.success.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg}`);
      });
    }

    if (results.warnings.length > 0) {
      console.log('\n⚠️  警告信息:');
      results.warnings.forEach((msg, index) => {
        console.log(`   ${index + 1}. ${msg}`);
      });
    }

    if (results.errors.length > 0) {
      console.log('\n❌ 错误信息:');
      results.errors.forEach((error, index) => {
        console.log(`   ${index + 1}. ${error.message}`);
        if (error.code) console.log(`      错误代码: ${error.code}`);
        if (error.meta) console.log(`      详细信息:`, error.meta);
      });
    }

    console.log('\n' + '='.repeat(60));
    
    if (results.errors.length === 0) {
      console.log('✅ 数据库连接测试完成 - 所有测试通过!');
      process.exit(0);
    } else {
      console.log('❌ 数据库连接测试完成 - 发现错误,请检查配置');
      process.exit(1);
    }
  }
}

// 运行测试
testDatabaseConnection();
