#!/usr/bin/env node

/**
 * 测试双重URL编码的密码
 * 根据之前的错误报告,密码可能需要双重编码
 */

const { PrismaClient } = require('@prisma/client');

const projectRef = 'cardynuoazvaytvinxvm';
const region = 'aws-0-ap-southeast-1';

console.log('🔍 测试密码编码方式\n');
console.log('='.repeat(70));

// 原始密码
const rawPassword = 'Apollo202%1419';

// 不同的编码方式
const encodingTests = [
  {
    name: '单次编码',
    password: encodeURIComponent(rawPassword),
    explanation: `${rawPassword} -> ${encodeURIComponent(rawPassword)}`,
  },
  {
    name: '双重编码',
    password: encodeURIComponent(encodeURIComponent(rawPassword)),
    explanation: `${rawPassword} -> ${encodeURIComponent(rawPassword)} -> ${encodeURIComponent(encodeURIComponent(rawPassword))}`,
  },
  {
    name: '手动双重编码 (Apollo202%25251419)',
    password: 'Apollo202%25251419',
    explanation: '根据error-fix-report.html中的建议',
  },
  {
    name: '原始密码(无编码)',
    password: rawPassword,
    explanation: '直接使用原始密码',
  },
];

async function testPassword(name, password, explanation) {
  console.log(`\n📝 测试: ${name}`);
  console.log(`   编码过程: ${explanation}`);
  console.log(`   最终密码: ${password}`);
  
  const url = `postgresql://postgres.${projectRef}:${password}@${region}.pooler.supabase.com:5432/postgres?sslmode=require`;
  
  const prisma = new PrismaClient({
    datasources: { db: { url } },
    log: [],
  });

  try {
    await prisma.$connect();
    const result = await prisma.$queryRaw`SELECT current_database(), current_user`;
    console.log(`   ✅ 成功! 数据库: ${result[0]?.current_database}`);
    await prisma.$disconnect();
    return { success: true, password, url };
  } catch (error) {
    const errorMsg = error.message.split('\n')[0];
    console.log(`   ❌ 失败: ${errorMsg}`);
    await prisma.$disconnect();
    return { success: false };
  }
}

async function main() {
  let successfulConfig = null;

  for (const test of encodingTests) {
    const result = await testPassword(test.name, test.password, test.explanation);
    if (result.success) {
      successfulConfig = result;
      break;
    }
  }

  console.log('\n' + '='.repeat(70));

  if (successfulConfig) {
    console.log('\n🎉 找到正确的密码编码方式!\n');
    console.log('在 .env.local 中更新:\n');
    
    // Transaction模式
    const transactionUrl = successfulConfig.url.replace(':5432', ':6543').replace('sslmode=require', 'pgbouncer=true&connection_limit=1&sslmode=require');
    console.log(`DATABASE_URL="${transactionUrl}"`);
    
    // Session模式
    console.log(`DIRECT_URL="${successfulConfig.url}"`);
    
  } else {
    console.log('\n❌ 所有编码方式都失败了');
    console.log('\n这说明密码本身就不正确,与编码方式无关。');
    console.log('\n下一步操作:');
    console.log('1. 访问 Supabase Dashboard');
    console.log('2. 进入 Project Settings > Database');
    console.log('3. 重置数据库密码');
    console.log('4. 复制新密码并更新配置');
  }

  console.log('\n' + '='.repeat(70));
}

main();
