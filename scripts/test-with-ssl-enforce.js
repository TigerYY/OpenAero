#!/usr/bin/env node

/**
 * 测试强制SSL的连接
 * 根据截图显示,Supabase启用了"Enforce SSL on incoming connections"
 */

const { PrismaClient } = require('@prisma/client');

const projectRef = 'cardynuoazvaytvinxvm';
const region = 'aws-0-ap-southeast-1';
const password = encodeURIComponent('Apollo202%@1419');

console.log('🔐 测试强制SSL连接\n');
console.log('='.repeat(70));
console.log('注意: Supabase启用了"Enforce SSL on incoming connections"');
console.log('所有连接必须使用SSL\n');

const sslConfigs = [
  {
    name: 'Transaction Pooler + sslmode=require',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true&connection_limit=1`,
  },
  {
    name: 'Session Pooler + sslmode=require',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:5432/postgres?sslmode=require`,
  },
  {
    name: 'Transaction Pooler + sslmode=verify-ca',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:6543/postgres?sslmode=verify-ca&pgbouncer=true`,
  },
  {
    name: 'Direct Connection + sslmode=require',
    url: `postgresql://postgres.${projectRef}:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`,
  },
  {
    name: 'Pooler + SSL参数组合',
    url: `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:6543/postgres?sslmode=require&ssl=true&pgbouncer=true`,
  },
];

async function testConnection(name, url) {
  console.log(`\n🔍 ${name}`);
  
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: [],
  });

  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT current_database()`;
    console.log(`   ✅ 成功! 数据库: ${result[0]?.current_database}`);
    await prisma.$disconnect();
    return { success: true, url };
  } catch (error) {
    console.log(`   ❌ ${error.message.split('\n')[0].substring(0, 80)}`);
    await prisma.$disconnect();
    return { success: false };
  }
}

async function main() {
  for (const config of sslConfigs) {
    const result = await testConnection(config.name, config.url);
    if (result.success) {
      console.log('\n' + '='.repeat(70));
      console.log('\n🎉 连接成功!\n');
      console.log('DATABASE_URL="' + result.url + '"');
      return;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n❌ 所有SSL配置都失败\n');
  console.log('这强烈暗示密码不正确。');
  console.log('\n请在Supabase Dashboard中:');
  console.log('1. 查找"Database"或"Connect"页面');
  console.log('2. 寻找显示连接字符串的地方');
  console.log('3. 复制完整的连接字符串');
  console.log('4. 或者提供Host/Port信息');
}

main();
