#!/usr/bin/env node

/**
 * RLS 策略应用脚本
 * 用于在 Supabase 数据库中应用 Row Level Security 策略
 */

// 加载 .env.local 文件
require('dotenv').config({ path: '.env.local' });

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

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

async function applyRLSPolicies() {
  logSection('🔐 应用 RLS 策略');

  // 检查环境变量
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log('❌ 错误: Supabase 环境变量未设置', 'red');
    log('请确保 .env.local 中包含:', 'yellow');
    log('  - NEXT_PUBLIC_SUPABASE_URL', 'blue');
    log('  - SUPABASE_SERVICE_ROLE_KEY', 'blue');
    process.exit(1);
  }

  // 创建 Supabase 客户端
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  // RLS 迁移文件列表（按顺序执行）
  const migrationFiles = [
    '004_fix_user_profiles_rls_recursion.sql',
    '005_create_avatars_storage_policies.sql',
  ];

  const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations');

  for (const fileName of migrationFiles) {
    const filePath = path.join(migrationsDir, fileName);
    
    if (!fs.existsSync(filePath)) {
      log(`⚠️  跳过: ${fileName} (文件不存在)`, 'yellow');
      continue;
    }

    log(`📄 执行迁移: ${fileName}`, 'blue');
    
    try {
      const sql = fs.readFileSync(filePath, 'utf-8');
      
      // 执行 SQL
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // 如果 RPC 不存在，尝试直接执行（需要管理员权限）
        log(`  ⚠️  RPC 方法不可用，请手动在 Supabase Dashboard 执行`, 'yellow');
        log(`  📝 文件路径: ${filePath}`, 'blue');
      } else {
        log(`  ✅ ${fileName} 执行成功`, 'green');
      }
    } catch (error) {
      log(`  ⚠️  执行失败: ${error.message}`, 'yellow');
      log(`  💡 请手动在 Supabase Dashboard > SQL Editor 中执行此文件`, 'blue');
      log(`  📝 文件路径: ${filePath}`, 'blue');
    }
  }

  logSection('📋 RLS 策略应用指南');
  log('由于 Supabase 的安全限制，RLS 策略需要通过以下方式之一应用:', 'yellow');
  log('\n方法 1: 使用 Supabase Dashboard (推荐)', 'cyan');
  log('  1. 打开 Supabase Dashboard', 'blue');
  log('  2. 进入 SQL Editor', 'blue');
  log('  3. 按顺序执行以下迁移文件:', 'blue');
  migrationFiles.forEach((file, index) => {
    log(`     ${index + 1}. ${file}`, 'blue');
  });
  
  log('\n方法 2: 使用 Supabase CLI', 'cyan');
  log('  supabase db push', 'blue');
  
  log('\n方法 3: 手动检查 RLS 策略', 'cyan');
  log('  在 Supabase Dashboard > Authentication > Policies 中检查', 'blue');
}

async function checkRLSPolicies() {
  logSection('🔍 检查 RLS 策略状态');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
    log('⚠️  无法检查 RLS 策略（环境变量未设置）', 'yellow');
    return;
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // 检查关键表的 RLS 状态
    const keyTables = ['user_profiles', 'creator_profiles', 'solutions', 'products'];
    
    for (const table of keyTables) {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .limit(1);
      
      if (error && error.code === '42501') {
        log(`  ✅ ${table}: RLS 已启用`, 'green');
      } else if (error) {
        log(`  ⚠️  ${table}: ${error.message}`, 'yellow');
      } else {
        log(`  ⚠️  ${table}: RLS 可能未启用或策略允许访问`, 'yellow');
      }
    }
  } catch (error) {
    log(`  ⚠️  检查失败: ${error.message}`, 'yellow');
  }
}

async function main() {
  console.log('\n');
  log('╔═══════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                       ║', 'cyan');
  log('║     🔐 Supabase RLS 策略应用工具 🔐                   ║', 'cyan');
  log('║                                                       ║', 'cyan');
  log('╚═══════════════════════════════════════════════════════╝', 'cyan');
  console.log('\n');

  try {
    await applyRLSPolicies();
    await checkRLSPolicies();
    
    logSection('✨ 完成');
    log('✅ RLS 策略应用指南已显示', 'green');
    log('\n📝 下一步:', 'yellow');
    log('  1. 在 Supabase Dashboard 中执行 RLS 迁移', 'blue');
    log('  2. 验证 RLS 策略是否正确应用', 'blue');
    log('  3. 测试应用功能', 'blue');
    
  } catch (error) {
    log(`\n❌ 发生错误: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main().catch((error) => {
  log(`\n❌ 未处理的错误: ${error.message}`, 'red');
  console.error(error);
  process.exit(1);
});

