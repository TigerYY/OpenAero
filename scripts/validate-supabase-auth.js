/**
 * Supabase Auth配置验证和测试脚本
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 颜色输出
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function log(message, color = 'white') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 配置检查
function checkConfiguration() {
  log('\n🔍 检查Supabase配置...', 'blue');
  
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY'
  ];
  
  const optional = [
    'NEXTAUTH_URL',
    'GOOGLE_CLIENT_ID',
    'GOOGLE_CLIENT_SECRET',
    'GITHUB_CLIENT_ID',
    'GITHUB_CLIENT_SECRET',
    'SMTP_HOST',
    'SMTP_USER',
    'SMTP_PASS'
  ];
  
  let allRequiredPresent = true;
  
  // 检查必需的环境变量
  log('\n📋 必需配置:', 'cyan');
  required.forEach(key => {
    const value = process.env[key];
    const status = value ? '✅' : '❌';
    const color = value ? 'green' : 'red';
    log(`  ${status} ${key}`, color);
    if (!value) allRequiredPresent = false;
  });
  
  // 检查可选的环境变量
  log('\n📋 可选配置:', 'cyan');
  optional.forEach(key => {
    const value = process.env[key];
    const status = value ? '✅' : '⚪';
    const color = value ? 'green' : 'white';
    log(`  ${status} ${key}`, color);
  });
  
  // 检查功能标志
  log('\n🚩 功能标志:', 'cyan');
  const featureFlags = [
    'FEATURE_SUPABASE_AUTH',
    'FEATURE_OAUTH_PROVIDERS',
    'FEATURE_EMAIL_VERIFICATION',
    'FEATURE_PASSWORD_RESET',
    'FEATURE_MIGRATION_MODE',
    'DEBUG_AUTH'
  ];
  
  featureFlags.forEach(key => {
    const value = process.env[key];
    const status = value === 'true' ? '🟢' : value === 'false' ? '🔴' : '⚪';
    log(`  ${status} ${key}=${value || '未设置'}`);
  });
  
  return allRequiredPresent;
}

// 测试Supabase连接
async function testSupabaseConnection() {
  log('\n🔗 测试Supabase连接...', 'blue');
  
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      log('❌ 缺少连接信息', 'red');
      return false;
    }
    
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    // 测试基本连接
    const { data, error } = await supabase
      .from('users')
      .select('count')
      .limit(1);
    
    if (error) {
      if (error.code === 'PGRST116') {
        log('⚠️  users表不存在（这是正常的，可以通过迁移创建）', 'yellow');
      } else {
        log(`❌ 连接测试失败: ${error.message}`, 'red');
        return false;
      }
    } else {
      log('✅ 数据库连接成功', 'green');
    }
    
    // 测试认证服务
    const { data: authData, error: authError } = await supabase.auth.getSession();
    
    if (authError && authError.message !== 'No session') {
      log(`⚠️  认证服务可能未完全配置: ${authError.message}`, 'yellow');
    } else {
      log('✅ 认证服务响应正常', 'green');
    }
    
    return true;
    
  } catch (error) {
    log(`❌ 连接测试失败: ${error.message}`, 'red');
    return false;
  }
}

// 生成配置建议
function generateRecommendations() {
  log('\n💡 配置建议:', 'blue');
  
  const recommendations = [];
  
  // OAuth配置建议
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    recommendations.push('🔗 配置Google OAuth以支持Google登录');
  }
  
  if (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET) {
    recommendations.push('🐙 配置GitHub OAuth以支持GitHub登录');
  }
  
  // SMTP配置建议
  if (!process.env.SMTP_HOST) {
    recommendations.push('📧 配置SMTP服务以支持邮箱验证和密码重置');
  }
  
  // 功能标志建议
  if (process.env.FEATURE_SUPABASE_AUTH !== 'true') {
    recommendations.push('🚀 设置FEATURE_SUPABASE_AUTH=true以启用Supabase Auth');
  }
  
  if (process.env.FEATURE_OAUTH_PROVIDERS !== 'true' && 
      (process.env.GOOGLE_CLIENT_ID || process.env.GITHUB_CLIENT_ID)) {
    recommendations.push('🔗 设置FEATURE_OAUTH_PROVIDERS=true以启用OAuth登录');
  }
  
  if (recommendations.length === 0) {
    log('✅ 配置看起来很完整！', 'green');
  } else {
    recommendations.forEach(rec => log(`  ${rec}`));
  }
  
  return recommendations;
}

// 生成下一步操作指南
function generateNextSteps() {
  log('\n📋 下一步操作指南:', 'blue');
  
  const steps = [
    '1. 访问Supabase Dashboard: https://cardynuoazvaytvinxvm.supabase.co',
    '2. 进入 Authentication > Settings 配置:',
    '   - Site URL: http://localhost:3000',
    '   - Redirect URLs: http://localhost:3000/auth/callback',
    '3. 在 Authentication > Providers 中配置OAuth:',
    '   - Google OAuth（如果需要）',
    '   - GitHub OAuth（如果需要）',
    '4. 在 Authentication > Email 中配置SMTP（如果需要）',
    '5. 在SQL Editor中执行迁移脚本:',
    '   - supabase/migrations/002_setup_auth.sql',
    '6. 测试认证功能:',
    '   - 运行 npm run test:auth',
    '   - 访问 http://localhost:3000/test-login.html',
    '7. 启用功能标志（在.env.local中）:',
    '   - FEATURE_SUPABASE_AUTH=true',
    '   - FEATURE_MIGRATION_MODE=true（可选）',
  ];
  
  steps.forEach(step => log(`  ${step}`, 'white'));
  
  log('\n📖 更多信息:', 'cyan');
  log('  📁 supabase/migrations/ - 数据库迁移脚本', 'white');
  log('  📁 src/lib/supabase-auth-config.ts - 配置助手', 'white');
  log('  📁 src/lib/feature-flags.ts - 功能标志管理', 'white');
  log('  📁 scripts/setup-supabase-auth.js - 配置脚本', 'white');
}

// 主函数
async function main() {
  log('🚀 Supabase Auth配置验证工具', 'magenta');
  log('=====================================', 'magenta');
  
  // 检查配置
  const configOk = checkConfiguration();
  
  // 测试连接
  const connectionOk = await testSupabaseConnection();
  
  // 生成建议
  const recommendations = generateRecommendations();
  
  // 生成下一步操作
  generateNextSteps();
  
  // 总结
  log('\n📊 验证总结:', 'blue');
  log(`  配置完整性: ${configOk ? '✅' : '❌'}`, configOk ? 'green' : 'red');
  log(`  连接状态: ${connectionOk ? '✅' : '❌'}`, connectionOk ? 'green' : 'red');
  log(`  建议数量: ${recommendations.length}`, 'white');
  
  if (configOk && connectionOk) {
    log('\n🎉 基础配置验证通过！可以开始配置Supabase Auth了。', 'green');
  } else {
    log('\n⚠️  请先解决配置问题后再继续。', 'yellow');
  }
}

// 运行验证
main().catch(console.error);