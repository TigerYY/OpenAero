#!/usr/bin/env node

/**
 * 数据库重建脚本
 * 用于重建 Supabase 数据库结构，确保与 Prisma schema 同步
 */

// 加载 .env.local 文件
require('dotenv').config({ path: '.env.local' });

const { PrismaClient } = require('@prisma/client');
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logSection(title) {
  console.log('\n' + '='.repeat(60));
  log(title, 'cyan');
  console.log('='.repeat(60) + '\n');
}

async function testConnection() {
  logSection('🔍 测试数据库连接');
  try {
    await prisma.$connect();
    log('✅ 数据库连接成功', 'green');
    
    // 测试查询
    const result = await prisma.$queryRaw`SELECT version()`;
    log(`📊 PostgreSQL 版本: ${result[0]?.version?.substring(0, 50)}...`, 'blue');
    
    return true;
  } catch (error) {
    log(`❌ 数据库连接失败: ${error.message}`, 'red');
    return false;
  }
}

async function checkExistingTables() {
  logSection('📋 检查现有数据库表');
  try {
    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      ORDER BY table_name
    `;
    
    if (tables.length > 0) {
      log(`发现 ${tables.length} 个现有表:`, 'yellow');
      tables.forEach((t, i) => {
        log(`  ${i + 1}. ${t.table_name}`, 'blue');
      });
    } else {
      log('⚠️  数据库中没有表，将创建新表', 'yellow');
    }
    
    return tables;
  } catch (error) {
    log(`❌ 检查表失败: ${error.message}`, 'red');
    return [];
  }
}

async function pushSchema() {
  logSection('🚀 推送 Prisma Schema 到数据库');
  
  try {
    log('正在执行 prisma db push...', 'yellow');
    
    // 使用 execSync 执行 prisma db push
    const output = execSync('npx prisma db push --accept-data-loss', {
      encoding: 'utf-8',
      stdio: 'pipe',
    });
    
    console.log(output);
    log('✅ Schema 推送成功', 'green');
    return true;
  } catch (error) {
    log(`❌ Schema 推送失败: ${error.message}`, 'red');
    if (error.stdout) {
      console.log(error.stdout);
    }
    if (error.stderr) {
      console.error(error.stderr);
    }
    return false;
  }
}

async function generatePrismaClient() {
  logSection('🔧 生成 Prisma Client');
  
  try {
    log('正在生成 Prisma Client...', 'yellow');
    execSync('npx prisma generate', {
      encoding: 'utf-8',
      stdio: 'inherit',
    });
    log('✅ Prisma Client 生成成功', 'green');
    return true;
  } catch (error) {
    log(`❌ Prisma Client 生成失败: ${error.message}`, 'red');
    return false;
  }
}

async function verifyTables() {
  logSection('✅ 验证数据库表');
  
  try {
    // 检查关键表是否存在
    const keyTables = [
      'user_profiles',
      'creator_profiles',
      'solutions',
      'products',
      'orders',
      'order_items',
      'solution_reviews',
      'product_reviews',
    ];
    
    const existingTables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
    `;
    
    const tableNames = existingTables.map(t => t.table_name);
    
    log('关键表检查结果:', 'blue');
    keyTables.forEach(table => {
      if (tableNames.includes(table)) {
        log(`  ✅ ${table}`, 'green');
      } else {
        log(`  ❌ ${table} (缺失)`, 'red');
      }
    });
    
    return true;
  } catch (error) {
    log(`❌ 验证失败: ${error.message}`, 'red');
    return false;
  }
}

async function checkEnums() {
  logSection('📊 检查枚举类型');
  
  try {
    const enums = await prisma.$queryRaw`
      SELECT typname 
      FROM pg_type 
      WHERE typtype = 'e' 
      AND typnamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
      ORDER BY typname
    `;
    
    if (enums.length > 0) {
      log(`发现 ${enums.length} 个枚举类型:`, 'blue');
      enums.forEach((e, i) => {
        log(`  ${i + 1}. ${e.typname}`, 'blue');
      });
    } else {
      log('⚠️  没有找到枚举类型', 'yellow');
    }
    
    return true;
  } catch (error) {
    log(`❌ 检查枚举失败: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                       ║', 'cyan');
  log('║     🔄 Supabase 数据库重建工具 🔄                     ║', 'cyan');
  log('║                                                       ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');
  
  // 检查环境变量
  if (!process.env.DATABASE_URL) {
    log('❌ 错误: DATABASE_URL 环境变量未设置', 'red');
    log('请确保 .env.local 文件中包含 DATABASE_URL', 'yellow');
    log('\n💡 提示:', 'yellow');
    log('  1. 检查 .env.local 文件是否存在', 'blue');
    log('  2. 确认 DATABASE_URL 已正确配置', 'blue');
    log('  3. DATABASE_URL 格式: postgresql://user:password@host:port/database', 'blue');
    process.exit(1);
  }
  
  // 隐藏密码，只显示部分 URL
  const dbUrl = process.env.DATABASE_URL;
  const maskedUrl = dbUrl.replace(/:([^:@]+)@/, ':****@');
  log(`📌 数据库 URL: ${maskedUrl.substring(0, 60)}...`, 'blue');
  console.log('');
  
  try {
    // 1. 测试连接
    const connected = await testConnection();
    if (!connected) {
      process.exit(1);
    }
    
    // 2. 检查现有表
    await checkExistingTables();
    
    // 3. 检查枚举
    await checkEnums();
    
    // 4. 推送 Schema
    const pushed = await pushSchema();
    if (!pushed) {
      log('⚠️  Schema 推送失败，但继续执行后续步骤...', 'yellow');
    }
    
    // 5. 生成 Prisma Client
    await generatePrismaClient();
    
    // 6. 验证表
    await verifyTables();
    
    // 7. 再次检查枚举
    await checkEnums();
    
    logSection('✨ 数据库重建完成');
    log('✅ 所有步骤已完成！', 'green');
    log('\n📝 下一步:', 'yellow');
    log('  1. 检查 Supabase Dashboard 确认表结构', 'blue');
    log('  2. 运行 RLS 策略迁移（如果需要）', 'blue');
    log('  3. 测试应用功能', 'blue');
    
  } catch (error) {
    log(`\n❌ 发生错误: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// 运行主函数
main().catch((error) => {
  log(`\n❌ 未处理的错误: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

