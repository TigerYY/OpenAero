#!/usr/bin/env node

/**
 * 最终测试:使用Pooler连接(绕过Direct Connection)
 */

const { PrismaClient } = require('@prisma/client');

const projectRef = 'cardynuoazvaytvinxvm';
const region = 'aws-0-ap-southeast-1';
const rawPassword = 'Apollo202%@1419';
const encodedPassword = encodeURIComponent(rawPassword);

console.log('🔐 测试Pooler连接(绕过Direct Connection)\n');
console.log('='.repeat(70));
console.log('密码编码:', encodedPassword);
console.log();

const poolerTests = [
  {
    name: 'Session Pooler (推荐用于Direct URL)',
    url: `postgresql://postgres.${projectRef}:${encodedPassword}@${region}.pooler.supabase.com:5432/postgres`,
  },
  {
    name: 'Transaction Pooler (推荐用于DATABASE_URL)',
    url: `postgresql://postgres.${projectRef}:${encodedPassword}@${region}.pooler.supabase.com:6543/postgres?pgbouncer=true`,
  },
  {
    name: 'Session Pooler + SSL',
    url: `postgresql://postgres.${projectRef}:${encodedPassword}@${region}.pooler.supabase.com:5432/postgres?sslmode=require`,
  },
  {
    name: 'Transaction Pooler + SSL',
    url: `postgresql://postgres.${projectRef}:${encodedPassword}@${region}.pooler.supabase.com:6543/postgres?sslmode=require&pgbouncer=true`,
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
    const result = await prisma.$queryRaw`SELECT current_database(), current_user`;
    
    console.log('   ✅ 连接成功!');
    console.log('   数据库:', result[0]?.current_database);
    console.log('   用户:', result[0]?.current_user);
    
    await prisma.$disconnect();
    return { success: true, url: config.url, name: config.name };
  } catch (error) {
    console.log('   ❌', error.message.split('\n')[0].substring(0, 80));
    await prisma.$disconnect();
    return { success: false };
  }
}

async function main() {
  let sessionUrl = null;
  let transactionUrl = null;
  
  for (const config of poolerTests) {
    const result = await testConnection(config);
    
    if (result.success) {
      if (config.name.includes('Session')) {
        sessionUrl = result.url;
      } else if (config.name.includes('Transaction')) {
        transactionUrl = result.url;
      }
    }
  }
  
  console.log('\n' + '='.repeat(70));
  
  if (sessionUrl || transactionUrl) {
    console.log('\n🎉 Pooler连接成功!\n');
    
    console.log('📝 在 .env.local 和 .env.supabase 中设置:\n');
    
    if (transactionUrl) {
      console.log(`DATABASE_URL="${transactionUrl}"`);
    } else if (sessionUrl) {
      // 如果没有Transaction URL,用Session URL生成
      const genUrl = sessionUrl.replace(':5432', ':6543') + (sessionUrl.includes('?') ? '&' : '?') + 'pgbouncer=true';
      console.log(`DATABASE_URL="${genUrl}"`);
    }
    
    if (sessionUrl) {
      console.log(`DIRECT_URL="${sessionUrl}"`);
    } else if (transactionUrl) {
      // 如果没有Session URL,用Transaction URL生成
      const genUrl = transactionUrl.replace(':6543', ':5432').replace(/[?&]pgbouncer=true/g, '');
      console.log(`DIRECT_URL="${genUrl}"`);
    }
    
    console.log('\n✅ 配置完成后执行:');
    console.log('1. npx prisma generate');
    console.log('2. npx prisma db push  # 如果需要推送schema');
    console.log('3. npm run dev');
    console.log();
    
  } else {
    console.log('\n❌ Pooler连接也失败了\n');
    console.log('这说明密码 "Apollo202%@1419" 确实不正确。\n');
    console.log('请执行以下操作:');
    console.log('1. 在Supabase Dashboard点击 "Pooler settings"');
    console.log('2. 复制显示的完整连接字符串(包括密码)');
    console.log('3. 发送给我');
    console.log('\n或者:');
    console.log('- 再次重置数据库密码');
    console.log('- 立即复制新密码(确保没有多余空格)');
    console.log('- 确认密码长度和字符');
  }
}

main();
