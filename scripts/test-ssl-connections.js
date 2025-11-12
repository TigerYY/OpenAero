#!/usr/bin/env node

/**
 * 测试不同SSL配置的数据库连接
 */

const { PrismaClient } = require('@prisma/client');

const projectRef = 'cardynuoazvaytvinxvm';
const region = 'aws-0-ap-southeast-1';
const password = 'Apollo202%251419';

console.log('🔍 测试不同SSL配置的数据库连接\n');
console.log('='.repeat(70));

// 测试不同的SSL配置
const connectionConfigs = [
  {
    name: 'Transaction Pooler + sslmode=require',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=require`,
  },
  {
    name: 'Transaction Pooler + sslmode=disable',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&sslmode=disable`,
  },
  {
    name: 'Session Pooler + sslmode=require',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:5432/postgres?sslmode=require`,
  },
  {
    name: 'Session Pooler + sslmode=prefer',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:5432/postgres?sslmode=prefer`,
  },
  {
    name: 'Session Pooler + ssl=true',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:5432/postgres?ssl=true`,
  },
  {
    name: 'Transaction Pooler (无SSL参数)',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`,
  },
  {
    name: 'Direct Connection + sslmode=require',
    url: `postgresql://postgres.${projectRef}:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`,
  },
  {
    name: 'Direct Connection + sslmode=verify-full',
    url: `postgresql://postgres.${projectRef}:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=verify-full`,
  },
];

async function testConnection(name, url, index, total) {
  console.log(`\n[${index + 1}/${total}] 测试: ${name}`);
  
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    },
    log: [],
  });

  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT current_database(), current_user`;
    console.log(`      ✅ 成功! 数据库: ${result[0]?.current_database}, 用户: ${result[0]?.current_user}`);
    await prisma.$disconnect();
    return { success: true, url, name };
  } catch (error) {
    const errorMsg = error.message.split('\n')[0];
    console.log(`      ❌ 失败: ${errorMsg.substring(0, 80)}`);
    await prisma.$disconnect();
    return { success: false, error: errorMsg, name };
  }
}

async function runTests() {
  const results = {
    successful: [],
    failed: [],
  };

  for (let i = 0; i < connectionConfigs.length; i++) {
    const config = connectionConfigs[i];
    const result = await testConnection(config.name, config.url, i, connectionConfigs.length);
    
    if (result.success) {
      results.successful.push(result);
    } else {
      results.failed.push(result);
    }
  }

  console.log('\n' + '='.repeat(70));
  console.log('\n📊 测试结果总结:\n');

  if (results.successful.length > 0) {
    console.log(`✅ 成功的连接 (${results.successful.length}个):\n`);
    results.successful.forEach((r, i) => {
      console.log(`${i + 1}. ${r.name}`);
      console.log(`   连接字符串: ${r.url}\n`);
    });

    console.log('\n🎯 推荐配置:\n');
    const recommended = results.successful[0];
    console.log('在 .env.local 中设置:\n');
    console.log(`DATABASE_URL="${recommended.url}"`);
    
    // 生成DIRECT_URL
    let directUrl = recommended.url.replace(':6543', ':5432').replace('pgbouncer=true&connection_limit=1&', '');
    if (!directUrl.includes('sslmode=')) {
      directUrl += (directUrl.includes('?') ? '&' : '?') + 'sslmode=require';
    }
    console.log(`DIRECT_URL="${directUrl}"`);
    
  } else {
    console.log('❌ 所有连接测试都失败了\n');
    
    // 分析错误类型
    const errorTypes = {};
    results.failed.forEach(r => {
      const errorType = r.error.includes('Tenant or user not found') ? '认证失败' :
                       r.error.includes('Can\'t reach') ? '无法连接服务器' :
                       r.error.includes('SSL') ? 'SSL错误' : '其他错误';
      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;
    });

    console.log('错误类型分布:');
    Object.entries(errorTypes).forEach(([type, count]) => {
      console.log(`  - ${type}: ${count}次`);
    });

    if (errorTypes['认证失败'] === results.failed.length) {
      console.log('\n💡 所有测试都显示认证失败,说明问题不在SSL配置,而是:');
      console.log('   1. 数据库密码不正确');
      console.log('   2. 用户名格式错误');
      console.log('   3. 数据库权限问题');
      console.log('\n建议: 在Supabase Dashboard重置数据库密码');
    } else if (errorTypes['SSL错误'] > 0) {
      console.log('\n💡 发现SSL相关错误,建议检查SSL证书配置');
    }
  }

  console.log('\n' + '='.repeat(70));
}

runTests();
