#!/usr/bin/env node

/**
 * Supabase 完整集成检查脚本
 * 检查所有功能模块与 Supabase 的集成状态
 */

const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function section(title) {
  log(`\n${'='.repeat(60)}`, 'cyan');
  log(`  ${title}`, 'bright');
  log('='.repeat(60), 'cyan');
}

// 检查报告
const report = {
  timestamp: new Date().toISOString(),
  categories: {},
  summary: {
    totalChecks: 0,
    passed: 0,
    failed: 0,
    warnings: 0,
    notApplicable: 0,
  },
};

function addCheck(category, name, status, message, details = null) {
  if (!report.categories[category]) {
    report.categories[category] = [];
  }
  
  report.categories[category].push({
    name,
    status,
    message,
    details,
  });
  
  report.summary.totalChecks++;
  
  if (status === 'PASS') report.summary.passed++;
  else if (status === 'FAIL') report.summary.failed++;
  else if (status === 'WARNING') report.summary.warnings++;
  else if (status === 'N/A') report.summary.notApplicable++;
}

async function checkEnvironmentVariables() {
  section('1. 环境变量配置检查');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_PROJECT_ID',
    'DATABASE_URL',
    'DIRECT_URL',
  ];
  
  const optionalVars = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASS',
  ];
  
  log('\n📋 必需环境变量:', 'blue');
  for (const varName of requiredVars) {
    const exists = !!process.env[varName];
    const status = exists ? 'PASS' : 'FAIL';
    const icon = exists ? '✅' : '❌';
    
    log(`  ${icon} ${varName}: ${exists ? '已设置' : '未设置'}`, exists ? 'green' : 'red');
    addCheck('环境变量', varName, status, exists ? '已设置' : '未设置');
  }
  
  log('\n📋 可选环境变量 (SMTP):', 'blue');
  for (const varName of optionalVars) {
    const exists = !!process.env[varName];
    const icon = exists ? '✅' : '⚠️';
    
    log(`  ${icon} ${varName}: ${exists ? '已设置' : '未设置'}`, exists ? 'green' : 'yellow');
    addCheck('SMTP配置', varName, exists ? 'PASS' : 'WARNING', exists ? '已设置' : '未设置');
  }
}

async function checkSupabaseConnection() {
  section('2. Supabase 连接测试');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    log('  ❌ 缺少 Supabase 配置', 'red');
    addCheck('Supabase连接', '基础配置', 'FAIL', '缺少环境变量');
    return null;
  }
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 测试基础连接
    log('\n🔌 测试数据库连接...', 'blue');
    const { error: pingError } = await supabase
      .from('user_profiles')
      .select('count', { count: 'exact', head: true });
    
    if (pingError && !pingError.message.includes('JWT')) {
      log(`  ❌ 连接失败: ${pingError.message}`, 'red');
      addCheck('Supabase连接', '数据库连接', 'FAIL', pingError.message);
      return null;
    } else {
      log('  ✅ 数据库连接成功', 'green');
      addCheck('Supabase连接', '数据库连接', 'PASS', '连接成功');
      return supabase;
    }
  } catch (err) {
    log(`  ❌ 连接异常: ${err.message}`, 'red');
    addCheck('Supabase连接', '数据库连接', 'FAIL', `异常: ${err.message}`);
    return null;
  }
}

async function checkDatabaseTables(supabase) {
  section('3. 数据库表结构检查');
  
  if (!supabase) {
    log('  ⚠️  跳过: 无 Supabase 连接', 'yellow');
    return;
  }
  
  const tables = [
    { name: 'user_profiles', description: '用户扩展资料表', required: true },
    { name: 'creator_profiles', description: '创作者认证资料表', required: true },
    { name: 'user_addresses', description: '用户地址表', required: true },
    { name: 'user_sessions', description: '用户会话日志表', required: true },
    { name: 'audit_logs', description: '系统审计日志表', required: false },
  ];
  
  log('\n📊 检查数据表...', 'blue');
  
  for (const table of tables) {
    try {
      const { data, error } = await supabase
        .from(table.name)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        const isRLSError = error.message.includes('JWT') || error.message.includes('row-level');
        const status = isRLSError ? 'PASS' : (table.required ? 'FAIL' : 'WARNING');
        const icon = isRLSError ? '✅' : (table.required ? '❌' : '⚠️');
        const msg = isRLSError ? '存在 (RLS保护)' : `错误: ${error.message}`;
        
        log(`  ${icon} ${table.name}: ${msg}`, isRLSError ? 'green' : 'red');
        addCheck('数据库表', table.name, status, msg);
      } else {
        log(`  ✅ ${table.name}: 存在且可访问`, 'green');
        addCheck('数据库表', table.name, 'PASS', '存在且可访问');
      }
    } catch (err) {
      log(`  ❌ ${table.name}: 检查异常 - ${err.message}`, 'red');
      addCheck('数据库表', table.name, 'FAIL', `异常: ${err.message}`);
    }
  }
}

async function checkAuthIntegration(supabase) {
  section('4. 认证系统集成检查');
  
  if (!supabase) {
    log('  ⚠️  跳过: 无 Supabase 连接', 'yellow');
    return;
  }
  
  log('\n🔐 检查认证功能...', 'blue');
  
  // 检查 Auth 配置
  try {
    const { data, error } = await supabase.auth.getSession();
    log('  ✅ Auth API 可用', 'green');
    addCheck('认证系统', 'Auth API', 'PASS', 'API可用');
  } catch (err) {
    log(`  ❌ Auth API 异常: ${err.message}`, 'red');
    addCheck('认证系统', 'Auth API', 'FAIL', `异常: ${err.message}`);
  }
  
  // 检查认证相关文件
  const authFiles = [
    { path: 'src/contexts/AuthContext.tsx', description: '认证上下文' },
    { path: 'src/hooks/useAuth.ts', description: '认证Hook' },
    { path: 'src/lib/auth/supabase-client.ts', description: 'Supabase客户端' },
    { path: 'src/lib/auth/supabase-auth-service.ts', description: '认证服务' },
    { path: 'src/components/auth/UserMenu.tsx', description: '用户菜单' },
    { path: 'src/components/auth/ProtectedRoute.tsx', description: '路由保护' },
  ];
  
  log('\n📁 检查认证文件...', 'blue');
  for (const file of authFiles) {
    const filePath = path.join(__dirname, '..', file.path);
    const exists = fs.existsSync(filePath);
    const icon = exists ? '✅' : '❌';
    
    log(`  ${icon} ${file.description}: ${exists ? '存在' : '缺失'}`, exists ? 'green' : 'red');
    addCheck('认证文件', file.description, exists ? 'PASS' : 'FAIL', exists ? '存在' : '缺失');
  }
}

async function checkCodeIntegration() {
  section('5. 代码集成检查');
  
  log('\n🔍 扫描代码使用情况...', 'blue');
  
  const srcPath = path.join(__dirname, '..', 'src');
  
  // 检查 Supabase 使用
  try {
    const { execSync } = require('child_process');
    
    // 检查 supabase.auth 使用
    const authUsage = execSync(
      `grep -r "supabase\\.auth" ${srcPath} --include="*.ts" --include="*.tsx" | wc -l`,
      { encoding: 'utf8' }
    ).trim();
    
    log(`  ✅ supabase.auth 使用次数: ${authUsage}`, 'green');
    addCheck('代码集成', 'supabase.auth使用', 'PASS', `${authUsage} 处使用`);
    
    // 检查 createClient 使用
    const clientUsage = execSync(
      `grep -r "createClient" ${srcPath} --include="*.ts" --include="*.tsx" | wc -l`,
      { encoding: 'utf8' }
    ).trim();
    
    log(`  ✅ createClient 使用次数: ${clientUsage}`, 'green');
    addCheck('代码集成', 'createClient使用', 'PASS', `${clientUsage} 处使用`);
    
    // 检查 AuthContext 使用
    const contextUsage = execSync(
      `grep -r "useAuth\\|AuthContext" ${srcPath} --include="*.ts" --include="*.tsx" | wc -l`,
      { encoding: 'utf8' }
    ).trim();
    
    log(`  ✅ AuthContext 使用次数: ${contextUsage}`, 'green');
    addCheck('代码集成', 'AuthContext使用', 'PASS', `${contextUsage} 处使用`);
    
  } catch (err) {
    log(`  ⚠️  代码扫描失败: ${err.message}`, 'yellow');
    addCheck('代码集成', '代码扫描', 'WARNING', `扫描失败: ${err.message}`);
  }
}

async function checkAPIEndpoints() {
  section('6. API 端点检查');
  
  log('\n🌐 检查 API 路由...', 'blue');
  
  const apiFiles = [
    { path: 'src/app/api/auth/login/route.ts', description: '登录API' },
    { path: 'src/app/api/auth/register/route.ts', description: '注册API' },
    { path: 'src/app/api/auth/logout/route.ts', description: '登出API' },
    { path: 'src/app/api/auth/callback/route.ts', description: 'OAuth回调' },
    { path: 'src/app/api/users/me/route.ts', description: '用户信息API' },
  ];
  
  for (const file of apiFiles) {
    const filePath = path.join(__dirname, '..', file.path);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      // 检查文件内容是否使用 Supabase
      const content = fs.readFileSync(filePath, 'utf8');
      const usesSupabase = content.includes('supabase') || content.includes('createClient');
      
      const icon = usesSupabase ? '✅' : '⚠️';
      const status = usesSupabase ? 'PASS' : 'WARNING';
      
      log(`  ${icon} ${file.description}: ${usesSupabase ? 'Supabase集成' : '未使用Supabase'}`, usesSupabase ? 'green' : 'yellow');
      addCheck('API端点', file.description, status, usesSupabase ? 'Supabase集成' : '未使用Supabase');
    } else {
      log(`  ❌ ${file.description}: 文件不存在`, 'red');
      addCheck('API端点', file.description, 'FAIL', '文件不存在');
    }
  }
}

async function checkUIComponents() {
  section('7. UI 组件集成检查');
  
  log('\n🎨 检查前端组件...', 'blue');
  
  const components = [
    { path: 'src/components/layout/Header.tsx', description: 'Header组件', shouldUseAuth: true },
    { path: 'src/components/auth/UserMenu.tsx', description: 'UserMenu组件', shouldUseAuth: true },
    { path: 'src/app/[locale]/(auth)/login/page.tsx', description: '登录页面', shouldUseAuth: true },
    { path: 'src/app/[locale]/(auth)/register/page.tsx', description: '注册页面', shouldUseAuth: true },
    { path: 'src/app/[locale]/(dashboard)/profile/page.tsx', description: '个人资料页面', shouldUseAuth: true },
  ];
  
  for (const comp of components) {
    const filePath = path.join(__dirname, '..', comp.path);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      const content = fs.readFileSync(filePath, 'utf8');
      const usesAuth = content.includes('useAuth') || content.includes('AuthContext') || content.includes('supabase');
      
      const icon = usesAuth ? '✅' : (comp.shouldUseAuth ? '⚠️' : '✅');
      const status = usesAuth ? 'PASS' : (comp.shouldUseAuth ? 'WARNING' : 'PASS');
      
      log(`  ${icon} ${comp.description}: ${usesAuth ? '已集成认证' : '未集成认证'}`, usesAuth ? 'green' : 'yellow');
      addCheck('UI组件', comp.description, status, usesAuth ? '已集成认证' : '未集成认证');
    } else {
      log(`  ❌ ${comp.description}: 文件不存在`, 'red');
      addCheck('UI组件', comp.description, 'FAIL', '文件不存在');
    }
  }
}

async function checkI18nIntegration() {
  section('8. 国际化集成检查');
  
  log('\n🌍 检查多语言配置...', 'blue');
  
  const i18nFiles = [
    { path: 'messages/en.json', lang: '英文' },
    { path: 'messages/zh.json', lang: '中文' },
  ];
  
  for (const file of i18nFiles) {
    const filePath = path.join(__dirname, '..', file.path);
    const exists = fs.existsSync(filePath);
    
    if (exists) {
      try {
        const content = JSON.parse(fs.readFileSync(filePath, 'utf8'));
        const hasAuthKeys = content.auth && Object.keys(content.auth).length > 0;
        
        const icon = hasAuthKeys ? '✅' : '⚠️';
        const status = hasAuthKeys ? 'PASS' : 'WARNING';
        
        log(`  ${icon} ${file.lang}翻译: ${hasAuthKeys ? `包含 ${Object.keys(content.auth || {}).length} 个认证字段` : '缺少认证翻译'}`, hasAuthKeys ? 'green' : 'yellow');
        addCheck('国际化', `${file.lang}翻译`, status, hasAuthKeys ? `${Object.keys(content.auth || {}).length} 个认证字段` : '缺少认证翻译');
      } catch (err) {
        log(`  ❌ ${file.lang}翻译: JSON 解析失败`, 'red');
        addCheck('国际化', `${file.lang}翻译`, 'FAIL', 'JSON解析失败');
      }
    } else {
      log(`  ❌ ${file.lang}翻译: 文件不存在`, 'red');
      addCheck('国际化', `${file.lang}翻译`, 'FAIL', '文件不存在');
    }
  }
}

async function checkSecurityFeatures() {
  section('9. 安全特性检查');
  
  log('\n🔐 检查安全功能...', 'blue');
  
  // 检查 RLS 迁移文件
  const rlsFile = path.join(__dirname, '..', 'supabase/migrations/001_create_user_tables.sql');
  if (fs.existsSync(rlsFile)) {
    const content = fs.readFileSync(rlsFile, 'utf8');
    
    const hasRLS = content.includes('ENABLE ROW LEVEL SECURITY');
    const hasPolicies = content.includes('CREATE POLICY');
    const hasTriggers = content.includes('CREATE TRIGGER');
    
    log(`  ${hasRLS ? '✅' : '❌'} RLS (行级安全): ${hasRLS ? '已启用' : '未启用'}`, hasRLS ? 'green' : 'red');
    addCheck('安全特性', 'RLS行级安全', hasRLS ? 'PASS' : 'FAIL', hasRLS ? '已启用' : '未启用');
    
    log(`  ${hasPolicies ? '✅' : '❌'} 安全策略: ${hasPolicies ? '已定义' : '未定义'}`, hasPolicies ? 'green' : 'red');
    addCheck('安全特性', '安全策略', hasPolicies ? 'PASS' : 'FAIL', hasPolicies ? '已定义' : '未定义');
    
    log(`  ${hasTriggers ? '✅' : '⚠️'} 数据库触发器: ${hasTriggers ? '已配置' : '未配置'}`, hasTriggers ? 'green' : 'yellow');
    addCheck('安全特性', '数据库触发器', hasTriggers ? 'PASS' : 'WARNING', hasTriggers ? '已配置' : '未配置');
  } else {
    log('  ❌ 未找到 RLS 迁移文件', 'red');
    addCheck('安全特性', 'RLS迁移文件', 'FAIL', '文件不存在');
  }
  
  // 检查权限系统
  const permissionsFile = path.join(__dirname, '..', 'src/lib/auth/permissions.ts');
  if (fs.existsSync(permissionsFile)) {
    const content = fs.readFileSync(permissionsFile, 'utf8');
    
    const hasRoles = content.includes('UserRole');
    const hasPermissions = content.includes('PERMISSIONS');
    const hasChecks = content.includes('hasPermission') || content.includes('checkRole');
    
    log(`  ${hasRoles ? '✅' : '❌'} 角色定义: ${hasRoles ? '已定义' : '未定义'}`, hasRoles ? 'green' : 'red');
    addCheck('权限系统', '角色定义', hasRoles ? 'PASS' : 'FAIL', hasRoles ? '已定义' : '未定义');
    
    log(`  ${hasPermissions ? '✅' : '❌'} 权限列表: ${hasPermissions ? '已定义' : '未定义'}`, hasPermissions ? 'green' : 'red');
    addCheck('权限系统', '权限列表', hasPermissions ? 'PASS' : 'FAIL', hasPermissions ? '已定义' : '未定义');
    
    log(`  ${hasChecks ? '✅' : '❌'} 权限检查函数: ${hasChecks ? '已实现' : '未实现'}`, hasChecks ? 'green' : 'red');
    addCheck('权限系统', '权限检查函数', hasChecks ? 'PASS' : 'FAIL', hasChecks ? '已实现' : '未实现');
  } else {
    log('  ❌ 权限系统文件不存在', 'red');
    addCheck('权限系统', '权限文件', 'FAIL', '文件不存在');
  }
}

async function checkMigrationFiles() {
  section('10. 数据库迁移文件检查');
  
  log('\n📜 检查迁移脚本...', 'blue');
  
  const migrationsPath = path.join(__dirname, '..', 'supabase/migrations');
  
  if (fs.existsSync(migrationsPath)) {
    const files = fs.readdirSync(migrationsPath).filter(f => f.endsWith('.sql'));
    
    log(`  ✅ 找到 ${files.length} 个迁移文件`, 'green');
    addCheck('数据库迁移', '迁移文件数量', 'PASS', `${files.length} 个文件`);
    
    files.forEach(file => {
      log(`     • ${file}`, 'cyan');
    });
    
    // 检查关键迁移
    const hasCoreUserTables = files.some(f => f.includes('user_tables') || f.includes('001_create'));
    const hasAuthSetup = files.some(f => f.includes('auth') || f.includes('002_setup'));
    
    log(`  ${hasCoreUserTables ? '✅' : '⚠️'} 核心用户表迁移: ${hasCoreUserTables ? '存在' : '缺失'}`, hasCoreUserTables ? 'green' : 'yellow');
    addCheck('数据库迁移', '核心用户表', hasCoreUserTables ? 'PASS' : 'WARNING', hasCoreUserTables ? '存在' : '缺失');
    
    log(`  ${hasAuthSetup ? '✅' : '⚠️'} 认证设置迁移: ${hasAuthSetup ? '存在' : '缺失'}`, hasAuthSetup ? 'green' : 'yellow');
    addCheck('数据库迁移', '认证设置', hasAuthSetup ? 'PASS' : 'WARNING', hasAuthSetup ? '存在' : '缺失');
  } else {
    log('  ❌ 迁移目录不存在', 'red');
    addCheck('数据库迁移', '迁移目录', 'FAIL', '目录不存在');
  }
}

function generateSummary() {
  section('📊 检查总结');
  
  const { totalChecks, passed, failed, warnings, notApplicable } = report.summary;
  const passRate = ((passed / totalChecks) * 100).toFixed(1);
  
  log(`\n总检查项: ${totalChecks}`, 'blue');
  log(`✅ 通过: ${passed}`, 'green');
  log(`❌ 失败: ${failed}`, 'red');
  log(`⚠️  警告: ${warnings}`, 'yellow');
  log(`ℹ️  不适用: ${notApplicable}`, 'cyan');
  log(`\n📈 通过率: ${passRate}%`, passRate >= 80 ? 'green' : passRate >= 60 ? 'yellow' : 'red');
  
  // 集成状态评估
  log('\n🎯 集成状态评估:', 'bright');
  
  if (failed === 0 && warnings <= 3) {
    log('  🎉 优秀! Supabase 集成完整且功能正常', 'green');
  } else if (failed <= 3 && warnings <= 10) {
    log('  ✅ 良好! 主要功能已集成,有少量待优化项', 'green');
  } else if (failed <= 10) {
    log('  ⚠️  一般! 部分功能未完全集成,需要改进', 'yellow');
  } else {
    log('  ❌ 需要注意! 多项功能缺失或集成不完整', 'red');
  }
  
  // 关键问题
  if (failed > 0) {
    log('\n❗ 关键问题:', 'red');
    Object.entries(report.categories).forEach(([category, checks]) => {
      const failedChecks = checks.filter(c => c.status === 'FAIL');
      if (failedChecks.length > 0) {
        log(`  ${category}:`, 'yellow');
        failedChecks.forEach(check => {
          log(`    • ${check.name}: ${check.message}`, 'red');
        });
      }
    });
  }
  
  // 建议改进
  if (warnings > 0) {
    log('\n💡 建议改进:', 'yellow');
    Object.entries(report.categories).forEach(([category, checks]) => {
      const warningChecks = checks.filter(c => c.status === 'WARNING');
      if (warningChecks.length > 0) {
        log(`  ${category}:`, 'cyan');
        warningChecks.forEach(check => {
          log(`    • ${check.name}: ${check.message}`, 'yellow');
        });
      }
    });
  }
}

async function main() {
  log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
  log('║                                                            ║', 'cyan');
  log('║         OpenAero Supabase 完整集成检查                     ║', 'bright');
  log('║                                                            ║', 'cyan');
  log('╚════════════════════════════════════════════════════════════╝', 'cyan');
  
  try {
    await checkEnvironmentVariables();
    const supabase = await checkSupabaseConnection();
    await checkDatabaseTables(supabase);
    await checkAuthIntegration(supabase);
    await checkCodeIntegration();
    await checkAPIEndpoints();
    await checkUIComponents();
    await checkI18nIntegration();
    await checkSecurityFeatures();
    await checkMigrationFiles();
    
    generateSummary();
    
    // 保存报告
    const reportPath = path.join(__dirname, '..', 'supabase-integration-report.json');
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    log(`\n📄 详细报告已保存: supabase-integration-report.json`, 'blue');
    
    // 返回状态码
    const success = report.summary.failed === 0;
    process.exit(success ? 0 : 1);
    
  } catch (error) {
    log(`\n❌ 检查过程出错: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// 运行检查
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });
main();
