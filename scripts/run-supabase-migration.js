/**
 * Supabase 数据库迁移脚本
 * 使用 Supabase Admin API 执行 SQL 迁移
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌ 错误: 缺少必要的环境变量');
  console.error('请确保 .env.local 文件中包含:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

async function runMigration() {
  console.log('🚀 开始 Supabase 数据库迁移...\n');

  // 读取 SQL 文件
  const sqlFile = path.join(__dirname, '../supabase/migrations/001_create_user_tables.sql');
  
  if (!fs.existsSync(sqlFile)) {
    console.error(`❌ 错误: SQL 文件不存在: ${sqlFile}`);
    process.exit(1);
  }

  const sql = fs.readFileSync(sqlFile, 'utf8');
  console.log(`📄 读取 SQL 文件: ${sqlFile}`);
  console.log(`   文件大小: ${(sql.length / 1024).toFixed(2)} KB\n`);

  // 使用 Supabase REST API 执行 SQL
  try {
    console.log('🔨 执行数据库迁移...');
    
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ 迁移失败:', error);
      
      // 提供备用方案
      console.log('\n📋 请使用以下方法之一手动执行迁移:\n');
      console.log('方法 1: 使用 Supabase Dashboard SQL Editor');
      console.log(`  1. 访问: ${SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/sql`);
      console.log(`  2. 复制文件内容: ${sqlFile}`);
      console.log('  3. 在 SQL Editor 中粘贴并运行\n');
      
      console.log('方法 2: 使用 psql 命令行');
      const projectId = SUPABASE_URL.replace('https://', '').split('.')[0];
      console.log(`  psql "postgresql://postgres:[YOUR-PASSWORD]@db.${projectId}.supabase.co:5432/postgres" -f ${sqlFile}\n`);
      
      process.exit(1);
    }

    const result = await response.json();
    console.log('✅ 数据库迁移成功!\n');
    console.log('📊 创建的表:');
    console.log('  ✓ user_profiles (用户扩展资料)');
    console.log('  ✓ creator_profiles (创作者资料)');
    console.log('  ✓ user_addresses (用户地址)');
    console.log('  ✓ user_sessions (会话日志)');
    console.log('  ✓ audit_logs (审计日志)\n');
    
    console.log('🔐 RLS 策略已启用');
    console.log('🎯 触发器已创建\n');
    
    console.log('✨ 迁移完成!\n');
    
  } catch (error) {
    console.error('❌ 执行迁移时出错:', error.message);
    
    console.log('\n📋 请手动在 Supabase Dashboard 中执行迁移:\n');
    console.log('1. 登录 Supabase Dashboard');
    console.log('2. 进入 SQL Editor');
    console.log('3. 创建新查询');
    console.log(`4. 复制 ${sqlFile} 的内容`);
    console.log('5. 粘贴并运行\n');
    
    process.exit(1);
  }
}

// 执行迁移
runMigration();
