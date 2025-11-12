#!/usr/bin/env node

/**
 * 使用Supabase提供的确切连接字符串测试
 */

const { PrismaClient } = require('@prisma/client');

// 原始连接字符串(密码需要URL编码)
const rawPassword = 'Apollo202%@1419';
const encodedPassword = encodeURIComponent(rawPassword);

console.log('🔐 测试Supabase提供的连接字符串\n');
console.log('='.repeat(70));
console.log('原始密码:', rawPassword);
console.log('URL编码后:', encodedPassword);
console.log();

const tests = [
  {
    name: '1. Direct Connection (编码密码)',
    url: `postgresql://postgres:${encodedPassword}@db.cardynuoazvaytvinxvm.supabase.co:5432/postgres`,
  },
  {
    name: '2. Direct Connection + SSL',
    url: `postgresql://postgres:${encodedPassword}@db.cardynuoazvaytvinxvm.supabase.co:5432/postgres?sslmode=require`,
  },
  {
    name: '3. Direct Connection (原始密码)',
    url: `postgresql://postgres:${rawPassword}@db.cardynuoazvaytvinxvm.supabase.co:5432/postgres`,
  },
];

async function testConnection(config) {
  console.log(`🔍 ${config.name}`);
  console.log(`   URL: ${config.url.replace(/:([^@]+)@/, ':***@')}`);
  
  const prisma = new PrismaClient({
    datasources: { db: { url: config.url } },
    log: ['warn', 'error'],
  });

  try {
    console.log('   连接中...');
    await prisma.$connect();
    
    console.log('   查询中...');
    const result = await prisma.$queryRaw`SELECT current_database(), current_user, inet_server_addr(), inet_server_port()`;
    
    console.log('   ✅ 连接成功!');
    console.log('   数据库:', result[0]?.current_database);
    console.log('   用户:', result[0]?.current_user);
    console.log('   服务器地址:', result[0]?.inet_server_addr);
    console.log('   服务器端口:', result[0]?.inet_server_port);
    
    const tables = await prisma.$queryRaw`
      SELECT count(*) as count
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `;
    console.log('   表数量:', tables[0]?.count);
    
    await prisma.$disconnect();
    return { success: true, url: config.url };
  } catch (error) {
    console.log('   ❌ 失败:', error.message.split('\n')[0]);
    if (error.code) console.log('   错误代码:', error.code);
    await prisma.$disconnect();
    return { success: false, error: error.message };
  }
}

async function main() {
  for (const config of tests) {
    console.log();
    const result = await testConnection(config);
    
    if (result.success) {
      console.log('\n' + '='.repeat(70));
      console.log('\n🎉 找到可用的连接!\n');
      
      // 生成配置
      const directUrl = result.url;
      const databaseUrl = result.url; // 对于Direct connection,两者相同
      
      console.log('📝 在 .env.local 和 .env.supabase 中设置:\n');
      console.log('# Direct Connection');
      console.log(`DATABASE_URL="${databaseUrl}"`);
      console.log(`DIRECT_URL="${directUrl}"`);
      console.log();
      
      console.log('✅ 下一步:');
      console.log('1. 更新 .env.local 文件');
      console.log('2. 更新 .env.supabase 文件');
      console.log('3. 运行: node scripts/verify-database-connection.js');
      console.log('4. 运行: npx prisma generate');
      console.log('5. 运行: npm run dev');
      console.log();
      
      return;
    }
  }
  
  console.log('\n' + '='.repeat(70));
  console.log('\n❌ 所有测试都失败了\n');
  console.log('Direct Connection主机无法访问。');
  console.log('\n请尝试获取Pooler连接字符串:');
  console.log('1. 在Supabase Dashboard点击 "Pooler settings"');
  console.log('2. 选择 "Session" 或 "Transaction" 模式');
  console.log('3. 复制显示的连接字符串');
  console.log('4. 告诉我完整的连接字符串');
}

main();
