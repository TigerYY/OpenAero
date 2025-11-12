#!/usr/bin/env node

/**
 * 根据Supabase截图测试连接
 * 使用Direct connection和Pooler两种方式
 */

const { PrismaClient } = require('@prisma/client');

const projectRef = 'cardynuoazvaytvinxvm';
const password = encodeURIComponent('Apollo202%@1419');

console.log('🔐 根据Supabase Dashboard截图测试连接\n');
console.log('='.repeat(70));
console.log('密码 (URL编码):', password);
console.log();

const connectionTests = [
  {
    name: '1. Direct Connection (截图显示的)',
    url: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres`,
  },
  {
    name: '2. Direct Connection + sslmode=require',
    url: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`,
  },
  {
    name: '3. Session Pooler (IPv4)',
    url: `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres`,
  },
  {
    name: '4. Session Pooler + sslmode=require',
    url: `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require`,
  },
  {
    name: '5. Transaction Pooler + sslmode=require',
    url: `postgresql://postgres.${projectRef}:${password}@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require`,
  },
  {
    name: '6. Direct Connection (postgres用户,无project ref)',
    url: `postgresql://postgres:${password}@db.${projectRef}.supabase.co:5432/postgres?sslmode=require`,
  },
];

async function testConnection(config) {
  console.log(`\n🔍 ${config.name}`);
  
  const prisma = new PrismaClient({
    datasources: { db: { url: config.url } },
    log: [],
  });

  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, version()`;
    console.log('   ✅ 成功!');
    console.log('   数据库:', result[0]?.current_database);
    console.log('   用户:', result[0]?.current_user);
    
    // 检查表
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `;
    console.log('   表数量:', tables.length);
    
    await prisma.$disconnect();
    return { success: true, url: config.url, name: config.name };
  } catch (error) {
    const errorMsg = error.message.split('\n')[0];
    console.log(`   ❌ ${errorMsg.substring(0, 100)}`);
    await prisma.$disconnect();
    return { success: false, error: errorMsg };
  }
}

async function main() {
  const results = [];
  
  for (const config of connectionTests) {
    const result = await testConnection(config);
    results.push(result);
    
    if (result.success) {
      console.log('\n' + '='.repeat(70));
      console.log('\n🎉 找到可用的连接!\n');
      console.log('连接方式:', result.name);
      console.log();
      
      // 生成DATABASE_URL和DIRECT_URL
      let databaseUrl, directUrl;
      
      if (result.url.includes('6543')) {
        // Transaction模式
        databaseUrl = result.url;
        directUrl = result.url.replace(':6543', ':5432').replace('pgbouncer=true&', '');
      } else {
        // Session/Direct模式
        directUrl = result.url;
        databaseUrl = result.url.replace(':5432', ':6543') + (result.url.includes('?') ? '&' : '?') + 'pgbouncer=true';
      }
      
      console.log('📝 复制以下配置到 .env.local 和 .env.supabase:\n');
      console.log('DATABASE_URL="' + databaseUrl + '"');
      console.log('DIRECT_URL="' + directUrl + '"');
      console.log();
      return;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n❌ 所有连接方式都失败了\n');
  
  // 分析错误
  const authErrors = results.filter(r => !r.success && r.error?.includes('Tenant or user not found')).length;
  const networkErrors = results.filter(r => !r.success && r.error?.includes('Can\'t reach')).length;
  
  console.log('错误分析:');
  console.log(`  - 认证失败: ${authErrors}次`);
  console.log(`  - 网络错误: ${networkErrors}次`);
  
  if (authErrors === results.length) {
    console.log('\n💡 结论: 密码 "Apollo202%@1419" 不正确\n');
    console.log('请在Supabase Dashboard中:');
    console.log('1. 点击截图中的 "View parameters" 查看完整信息');
    console.log('2. 或点击 "Pooler settings" 查看Pooler连接字符串');
    console.log('3. 或重新重置密码并立即复制');
  }
}

main();
