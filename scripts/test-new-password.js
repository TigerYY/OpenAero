#!/usr/bin/env node

/**
 * 使用新密码测试数据库连接
 */

const { PrismaClient } = require('@prisma/client');

const projectRef = 'cardynuoazvaytvinxvm';
const region = 'aws-0-ap-southeast-1';

// 新密码
const rawPassword = 'Apollo202%@1419';
console.log('🔐 新密码:', rawPassword);

// URL编码新密码 (% -> %25, @ -> %40)
const encodedPassword = encodeURIComponent(rawPassword);
console.log('🔐 URL编码后:', encodedPassword);
console.log('🔐 验证解码:', decodeURIComponent(encodedPassword));
console.log();

// 构建连接字符串
const configs = [
  {
    name: 'Transaction Pooler (端口6543)',
    url: `postgresql://postgres.${projectRef}:${encodedPassword}@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1`,
  },
  {
    name: 'Session Pooler (端口5432)',
    url: `postgresql://postgres.${projectRef}:${encodedPassword}@${region}.pooler.supabase.com:5432/postgres`,
  },
];

async function testConnection(name, url) {
  console.log(`🔍 测试: ${name}`);
  
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: ['error'],
  });

  try {
    await prisma.$connect();
    console.log('   ✅ 连接成功!');
    
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('   📊 数据库:', result[0]?.current_database);
    console.log('   👤 用户:', result[0]?.current_user);
    console.log('   📌 版本:', result[0]?.version?.substring(0, 60) + '...');
    
    // 检查表
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    console.log('   📋 表数量:', tables.length);
    if (tables.length > 0) {
      console.log('   📋 表列表:', tables.map(t => t.table_name).join(', '));
    }
    
    await prisma.$disconnect();
    return { success: true, url };
  } catch (error) {
    console.log('   ❌ 失败:', error.message.split('\n')[0]);
    await prisma.$disconnect();
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('🚀 开始测试新密码的数据库连接...\n');
  console.log('='.repeat(70));
  
  for (const config of configs) {
    const result = await testConnection(config.name, config.url);
    
    if (result.success) {
      console.log('\n' + '='.repeat(70));
      console.log('\n🎉 数据库连接成功!\n');
      
      // 生成配置
      const transactionUrl = configs[0].url;
      const sessionUrl = configs[1].url;
      
      console.log('📝 请复制以下配置到 .env.local 和 .env.supabase:\n');
      console.log('DATABASE_URL="' + transactionUrl + '"');
      console.log('DIRECT_URL="' + sessionUrl + '"');
      console.log();
      return;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n❌ 连接失败,请检查密码是否正确复制');
}

main();
