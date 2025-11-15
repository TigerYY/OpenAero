#!/usr/bin/env node

/**
 * 应用 Solution creatorId 迁移脚本
 * 直接执行 SQL 迁移文件，绕过 Prisma 的跨 schema 检查
 */

require('dotenv').config({ path: '.env.local' });

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, '../supabase/migrations/009_add_solution_creator_relation.sql');

if (!fs.existsSync(migrationFile)) {
  console.error('❌ 迁移文件不存在:', migrationFile);
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ DATABASE_URL 环境变量未设置');
  process.exit(1);
}

console.log('🔧 应用 Solution creatorId 迁移...');
console.log('📝 迁移文件:', migrationFile);
console.log('');

try {
  // 使用 psql 执行 SQL 文件
  execSync(`psql "${databaseUrl}" -f "${migrationFile}"`, {
    stdio: 'inherit',
    env: process.env,
  });
  
  console.log('');
  console.log('✅ 迁移成功！');
  console.log('');
  console.log('📋 下一步：');
  console.log('  1. 运行: npx prisma generate');
  console.log('  2. 验证: 检查 solutions 表是否有 creatorId 字段');
} catch (error) {
  console.error('');
  console.error('❌ 迁移失败！');
  console.error('');
  console.error('💡 提示: 如果 psql 命令不存在，可以：');
  console.error('  1. 安装 PostgreSQL 客户端工具');
  console.error('  2. 或者直接在 Supabase Dashboard 的 SQL Editor 中执行迁移文件');
  process.exit(1);
}

