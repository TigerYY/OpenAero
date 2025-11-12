#!/usr/bin/env node

/**
 * 使用正确密码测试Supabase连接
 */

const { PrismaClient } = require('@prisma/client');

const projectRef = 'cardynuoazvaytvinxvm';
const region = 'aws-0-ap-southeast-1';

// 原始密码
const rawPassword = 'Apollo202%1419';
console.log('原始密码:', rawPassword);

// URL编码密码
const encodedPassword = encodeURIComponent(rawPassword);
console.log('URL编码后:', encodedPassword);
console.log('验证解码:', decodeURIComponent(encodedPassword));
console.log();

// 构建连接字符串
const connectionStrings = [
  {
    name: 'Transaction Pooler (推荐)',
    url: `postgresql://postgres.${projectRef}:${encodedPassword}@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`,
  },
  {
    name: 'Session Pooler',
    url: `postgresql://postgres.${projectRef}:${encodedPassword}@${region}.pooler.supabase.com:5432/postgres`,
  },
];

async function testConnection(name, url) {
  console.log(`\n🔍 测试: ${name}`);
  
  const prisma = new PrismaClient({
    datasources: {
      db: { url }
    },
    log: ['error'],
  });

  try {
    await prisma.$connect();
    console.log('   ✅ 连接成功!');
    
    const result = await prisma.$queryRaw`SELECT current_database(), version()`;
    console.log('   数据库:', result[0]?.current_database);
    console.log('   版本:', result[0]?.version?.substring(0, 50) + '...');
    
    // 检查表
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log('   表数量:', tables.length);
    
    await prisma.$disconnect();
    return { success: true, url };
  } catch (error) {
    console.log('   ❌ 失败:', error.message.split('\n')[0]);
    await prisma.$disconnect();
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 测试Supabase数据库连接...\n');
  console.log('='.repeat(70));
  
  for (const config of connectionStrings) {
    const result = await testConnection(config.name, config.url);
    
    if (result.success) {
      console.log('\n' + '='.repeat(70));
      console.log('\n✅ 找到可用的连接字符串!\n');
      console.log('请在 .env.local 和 .env.supabase 中设置:\n');
      console.log('DATABASE_URL="' + result.url + '"');
      console.log();
      return;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n❌ 所有连接测试都失败了。');
  console.log('\n可能的原因:');
  console.log('1. 密码不正确');
  console.log('2. Supabase项目配置有变化');
  console.log('3. 网络连接问题');
  console.log('\n建议: 在Supabase Dashboard中验证数据库密码');
}

main();
