#!/usr/bin/env node

/**
 * 执行多角色支持迁移脚本
 * 运行: node scripts/apply-multi-roles-migration.js
 */

require('dotenv').config({ path: '.env.local' });
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrationFile = path.join(__dirname, '../supabase/migrations/015_migrate_to_multi_roles.sql');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ 错误: DATABASE_URL 环境变量未设置');
  console.error('   请在 .env.local 文件中设置 DATABASE_URL');
  console.error('');
  console.error('   或者使用以下方法之一手动执行迁移:');
  console.error('');
  console.error('方法 1: 使用 Supabase Dashboard SQL Editor（推荐）');
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (supabaseUrl) {
    const projectId = supabaseUrl.replace('https://', '').split('.')[0];
    console.error(`   1. 访问: https://supabase.com/dashboard/project/${projectId}/sql/new`);
  }
  console.error(`   2. 复制文件内容: ${migrationFile}`);
  console.error('   3. 在 SQL Editor 中粘贴并运行');
  console.error('');
  process.exit(1);
}

if (!fs.existsSync(migrationFile)) {
  console.error('❌ 错误: 迁移文件不存在:', migrationFile);
  process.exit(1);
}

console.log('📋 开始执行多角色支持迁移...');
console.log('   迁移文件:', migrationFile);
console.log('');

try {
  // 使用 psql 执行 SQL 文件
  const command = `psql "${databaseUrl}" -f "${migrationFile}"`;
  console.log('执行命令:', command.replace(databaseUrl, 'DATABASE_URL=***'));
  console.log('');

  execSync(command, {
    stdio: 'inherit',
    env: {
      ...process.env,
      PGPASSWORD: databaseUrl.match(/password=([^&]+)/)?.[1] || '',
    },
  });

  console.log('');
  console.log('✅ 多角色支持迁移执行成功！');
  console.log('');
  console.log('📊 迁移内容:');
  console.log('   ✓ 添加 roles 数组列');
  console.log('   ✓ 迁移现有角色数据到 roles 数组');
  console.log('   ✓ 设置 NOT NULL 约束和默认值');
  console.log('   ✓ 创建 GIN 索引 (idx_user_profiles_roles)');
  console.log('   ✓ 创建辅助查询函数:');
  console.log('     - user_has_role()');
  console.log('     - user_has_any_role()');
  console.log('     - user_has_all_roles()');
  console.log('');
  console.log('📝 下一步:');
  console.log('   1. 运行 npx prisma generate 更新 Prisma Client');
  console.log('   2. 验证数据库结构: npx prisma db pull');
  console.log('   3. 测试多角色功能');
  console.log('');
  console.log('⚠️  注意: role 列仍然保留以保持向后兼容');
  console.log('   建议在确认所有代码更新后，再删除 role 列');
} catch (error) {
  console.error('');
  console.error('❌ 迁移执行失败:', error.message);
  console.error('');
  console.error('请检查:');
  console.error('   1. DATABASE_URL 是否正确');
  console.error('   2. 数据库连接是否正常');
  console.error('   3. 是否有足够的权限执行 DDL 操作');
  console.error('');
  console.error('或者使用 Supabase Dashboard SQL Editor 手动执行迁移');
  process.exit(1);
}
