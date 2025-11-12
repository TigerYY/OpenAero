#!/usr/bin/env node

/**
 * 手动构建连接字符串测试
 * 使用基本信息组装连接字符串
 */

const { PrismaClient } = require('@prisma/client');

console.log('🔧 手动构建Supabase连接字符串\n');
console.log('='.repeat(70));

// 基本信息
const projectRef = 'cardynuoazvaytvinxvm';
const password = 'Apollo202%@1419';
const encodedPassword = encodeURIComponent(password);

console.log('📋 项目信息:');
console.log('   项目引用ID:', projectRef);
console.log('   原始密码:', password);
console.log('   URL编码密码:', encodedPassword);
console.log();

// 测试多种可能的连接方式
const connectionTests = [
  {
    name: '1. Pooler Transaction模式 (推荐)',
    host: `aws-0-ap-southeast-1.pooler.supabase.com`,
    port: 6543,
    params: 'pgbouncer=true&connection_limit=1',
  },
  {
    name: '2. Pooler Session模式',
    host: `aws-0-ap-southeast-1.pooler.supabase.com`,
    port: 5432,
    params: '',
  },
  {
    name: '3. 直连数据库',
    host: `db.${projectRef}.supabase.co`,
    port: 5432,
    params: '',
  },
  {
    name: '4. IPv6 Pooler',
    host: `aws-0-ap-southeast-1.pooler.supabase.com`,
    port: 6543,
    params: 'pgbouncer=true',
  },
];

async function testConnection(config) {
  console.log(`\n🔍 ${config.name}`);
  
  const url = `postgresql://postgres.${projectRef}:${encodedPassword}@${config.host}:${config.port}/postgres${config.params ? '?' + config.params : ''}`;
  console.log(`   主机: ${config.host}`);
  console.log(`   端口: ${config.port}`);
  
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: [],
  });

  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT current_database(), version()`;
    console.log('   ✅ 连接成功!');
    console.log('   数据库:', result[0]?.current_database);
    
    // 检查表
    const tables = await prisma.$queryRaw`
      SELECT count(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('   表数量:', tables[0]?.count);
    
    await prisma.$disconnect();
    return { success: true, url, config };
  } catch (error) {
    const errorMsg = error.message.split('\n')[0];
    console.log('   ❌ 失败:', errorMsg.substring(0, 100));
    await prisma.$disconnect();
    return { success: false, error: errorMsg };
  }
}

async function main() {
  console.log('\n🚀 开始测试各种连接方式...\n');
  console.log('='.repeat(70));
  
  for (const config of connectionTests) {
    const result = await testConnection(config);
    
    if (result.success) {
      console.log('\n' + '='.repeat(70));
      console.log('\n🎉 找到可用的连接!\n');
      
      // 生成两个URL
      const transactionUrl = result.url;
      let sessionUrl = transactionUrl
        .replace(':6543', ':5432')
        .replace('pgbouncer=true&connection_limit=1', '')
        .replace('pgbouncer=true', '')
        .replace('?&', '?')
        .replace(/\?$/, '');
      
      console.log('📝 请将以下配置复制到 .env.local:\n');
      console.log('DATABASE_URL="' + transactionUrl + '"');
      console.log('DIRECT_URL="' + sessionUrl + '"');
      console.log();
      
      console.log('✅ 配置完成后,运行测试:');
      console.log('   node scripts/verify-database-connection.js');
      console.log();
      return;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n❌ 所有连接方式都失败了\n');
  console.log('可能的原因:');
  console.log('1. 密码 "Apollo202%@1419" 不正确');
  console.log('2. 项目ID不正确');
  console.log('3. 数据库未启动或网络问题');
  console.log();
  console.log('请确认:');
  console.log('- 在Supabase Dashboard的Database页面');
  console.log('- 确实点击了 "Reset Database Password"');
  console.log('- 看到了新密码并完整复制');
  console.log('- 项目ID确实是: cardynuoazvaytvinxvm');
  console.log();
  console.log('建议: 提供Supabase Dashboard中显示的任何连接信息');
}

main();
