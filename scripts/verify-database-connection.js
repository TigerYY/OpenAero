#!/usr/bin/env node

/**
 * 验证数据库连接并提供详细的诊断信息
 */

require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');

console.log('🔍 数据库连接完整验证\n');
console.log('='.repeat(70));

// 检查环境变量
console.log('\n📋 步骤1: 检查环境变量');
const databaseUrl = process.env.DATABASE_URL;
const directUrl = process.env.DIRECT_URL;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('DATABASE_URL:', databaseUrl ? '✅ 已设置' : '❌ 未设置');
console.log('DIRECT_URL:', directUrl ? '✅ 已设置' : '❌ 未设置');
console.log('SUPABASE_URL:', supabaseUrl ? '✅ 已设置' : '❌ 未设置');
console.log('SERVICE_ROLE_KEY:', supabaseKey ? '✅ 已设置' : '❌ 未设置');

if (!databaseUrl) {
  console.error('\n❌ DATABASE_URL未设置,请先在.env.local中配置!');
  process.exit(1);
}

// 显示连接信息(隐藏密码)
const urlParts = databaseUrl.match(/postgresql:\/\/([^:]+):([^@]+)@([^\/]+)\/(.*)/);
if (urlParts) {
  console.log('\n📊 连接信息:');
  console.log('   用户名:', urlParts[1]);
  console.log('   密码:', '***' + urlParts[2].slice(-4));
  console.log('   主机:', urlParts[3]);
  console.log('   数据库:', urlParts[4].split('?')[0]);
}

async function verifyConnection() {
  const results = {
    success: [],
    warnings: [],
    errors: [],
  };

  // 测试Prisma连接
  console.log('\n📋 步骤2: 测试Prisma数据库连接');
  const prisma = new PrismaClient({ log: [] });

  try {
    await prisma.$connect();
    console.log('   ✅ Prisma连接成功!');
    results.success.push('Prisma数据库连接');

    // 测试查询
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('   数据库:', dbInfo[0]?.current_database);
    console.log('   用户:', dbInfo[0]?.current_user);
    console.log('   版本:', dbInfo[0]?.version?.substring(0, 50) + '...');
    results.success.push('数据库查询');

    // 检查表
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log('   表数量:', tables.length);
    
    if (tables.length === 0) {
      results.warnings.push('数据库中没有表,可能需要运行: npx prisma db push');
    } else {
      console.log('   表列表:', tables.map(t => t.table_name).slice(0, 10).join(', ') + 
                  (tables.length > 10 ? '...' : ''));
      results.success.push(`发现${tables.length}个数据库表`);

      // 测试用户表
      if (tables.some(t => t.table_name === 'users')) {
        const userCount = await prisma.user.count();
        console.log('   Users表记录数:', userCount);
        results.success.push(`Users表: ${userCount}条记录`);
      }

      // 测试方案表
      if (tables.some(t => t.table_name === 'solutions')) {
        const solutionCount = await prisma.solution.count();
        console.log('   Solutions表记录数:', solutionCount);
        results.success.push(`Solutions表: ${solutionCount}条记录`);
      }
    }

  } catch (error) {
    console.log('   ❌ Prisma连接失败:', error.message);
    results.errors.push({
      type: 'Prisma连接',
      message: error.message,
      code: error.code,
    });
  } finally {
    await prisma.$disconnect();
  }

  // 测试Supabase API
  if (supabaseUrl && supabaseKey) {
    console.log('\n📋 步骤3: 测试Supabase API连接');
    const supabase = createClient(supabaseUrl, supabaseKey);

    try {
      const { data: { users }, error } = await supabase.auth.admin.listUsers();
      if (error) throw error;
      
      console.log('   ✅ Supabase API连接成功!');
      console.log('   Auth用户数:', users.length);
      results.success.push(`Supabase Auth: ${users.length}个用户`);

    } catch (error) {
      console.log('   ❌ Supabase API连接失败:', error.message);
      results.errors.push({
        type: 'Supabase API',
        message: error.message,
      });
    }
  }

  // 输出总结
  console.log('\n' + '='.repeat(70));
  console.log('\n📊 验证结果总结:\n');

  if (results.success.length > 0) {
    console.log('✅ 成功的测试:');
    results.success.forEach((msg, i) => console.log(`   ${i + 1}. ${msg}`));
  }

  if (results.warnings.length > 0) {
    console.log('\n⚠️  警告信息:');
    results.warnings.forEach((msg, i) => console.log(`   ${i + 1}. ${msg}`));
  }

  if (results.errors.length > 0) {
    console.log('\n❌ 错误信息:');
    results.errors.forEach((err, i) => {
      console.log(`   ${i + 1}. ${err.type}: ${err.message}`);
      if (err.code) console.log(`      错误代码: ${err.code}`);
    });
  }

  console.log('\n' + '='.repeat(70));

  if (results.errors.length === 0) {
    console.log('\n🎉 恭喜!数据库连接完全正常!');
    console.log('\n下一步:');
    console.log('1. 运行: npm run dev');
    console.log('2. 访问: http://localhost:3000');
    console.log('3. 测试认证和业务功能');
    process.exit(0);
  } else {
    console.log('\n❌ 发现连接问题,请按照 RESET_DATABASE_PASSWORD.md 重置密码');
    process.exit(1);
  }
}

verifyConnection();
