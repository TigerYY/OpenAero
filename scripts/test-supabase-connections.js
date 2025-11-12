#!/usr/bin/env node

/**
 * 测试不同的Supabase连接字符串
 */

const { PrismaClient } = require('@prisma/client');

const projectRef = 'cardynuoazvaytvinxvm';
const region = 'aws-0-ap-southeast-1';

// 从.env.local读取的密码(假设是Apollo202%1419,编码后Apollo202%251419)
const password = 'Apollo202%251419';

// 测试不同的连接字符串
const connectionStrings = [
  {
    name: 'Pooler Transaction模式(端口6543)',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`,
  },
  {
    name: 'Pooler Session模式(端口5432)',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:5432/postgres`,
  },
  {
    name: '直连模式(db.xxx.supabase.co)',
    url: `postgresql://postgres.${projectRef}:${password}@db.${projectRef}.supabase.com:5432/postgres`,
  },
  {
    name: '直连Pooler(db.xxx.supabase.co:6543)',
    url: `postgresql://postgres.${projectRef}:${password}@db.${projectRef}.supabase.com:6543/postgres?pgbouncer=true`,
  },
];

async function testConnection(name, url) {
  console.log(`\n🔍 测试: ${name}`);
  console.log(`   连接字符串: ${url.substring(0, 60)}...`);
  
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    },
    log: []
  });

  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT current_database()`;
    console.log(`   ✅ 成功! 数据库: ${result[0]?.current_database}`);
    await prisma.$disconnect();
    return true;
  } catch (error) {
    console.log(`   ❌ 失败: ${error.message.split('\n')[0]}`);
    await prisma.$disconnect();
    return false;
  }
}

async function runTests() {
  console.log('🚀 开始测试Supabase数据库连接...\n');
  console.log('=' .repeat(70));
  
  let successCount = 0;
  
  for (const config of connectionStrings) {
    const success = await testConnection(config.name, config.url);
    if (success) {
      successCount++;
      console.log(`\n✅ 推荐使用这个连接字符串!`);
      console.log(`\n在.env.local中设置:`);
      console.log(`DATABASE_URL="${config.url}"`);
      break; // 找到第一个成功的就退出
    }
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (successCount === 0) {
    console.log('\n❌ 所有连接测试都失败了。');
    console.log('\n请检查:');
    console.log('1. 密码是否正确(当前使用: Apollo202%251419)');
    console.log('2. 项目ID是否正确(当前: cardynuoazvaytvinxvm)');
    console.log('3. 网络连接是否正常');
    console.log('4. Supabase项目是否正常运行');
    console.log('\n建议: 访问 Supabase Dashboard > Project Settings > Database');
    console.log('复制 "Connection string" 并在.env.local中更新DATABASE_URL');
  }
}

runTests();
