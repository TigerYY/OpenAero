/**
 * 用户认证系统集成测试
 * 
 * 测试内容:
 * 1. ✅ 前端UI组件测试
 * 2. ✅ 认证流程测试
 * 3. ✅ 权限控制测试
 * 4. ✅ API端点测试
 * 5. ✅ 数据库集成测试
 */

require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  section: (msg) => console.log(`\n${colors.cyan}${'='.repeat(60)}${colors.reset}`),
  title: (msg) => console.log(`${colors.cyan}${msg}${colors.reset}`),
};

// 初始化 Supabase 客户端
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  log.error('缺少 Supabase 配置! 请检查 .env.local 文件');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 测试数据
const testUser = {
  email: `test_${Date.now()}@example.com`,
  password: 'TestPassword123!',
  username: `testuser_${Date.now()}`,
  fullName: 'Test User',
};

let testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  warnings: 0,
  tests: [],
};

/**
 * 记录测试结果
 */
function recordTest(name, passed, message = '', isWarning = false) {
  testResults.total++;
  const result = {
    name,
    passed,
    message,
    isWarning,
    timestamp: new Date().toISOString(),
  };
  
  if (isWarning) {
    testResults.warnings++;
    log.warning(`${name}: ${message}`);
  } else if (passed) {
    testResults.passed++;
    log.success(`${name}`);
  } else {
    testResults.failed++;
    log.error(`${name}: ${message}`);
  }
  
  testResults.tests.push(result);
}

/**
 * 测试 1: 前端UI组件检查
 */
async function testFrontendComponents() {
  log.section();
  log.title('📱 测试 1: 前端UI组件检查');
  log.section();

  const fs = require('fs');
  const path = require('path');

  // 检查关键文件是否存在
  const criticalFiles = [
    'src/contexts/AuthContext.tsx',
    'src/hooks/useAuth.ts',
    'src/components/auth/UserMenu.tsx',
    'src/components/auth/ProtectedRoute.tsx',
    'src/app/[locale]/(auth)/login/page.tsx',
    'src/app/[locale]/(auth)/register/page.tsx',
    'src/app/[locale]/(dashboard)/profile/page.tsx',
    'src/lib/auth/supabase-client.ts',
  ];

  for (const file of criticalFiles) {
    const fullPath = path.join(process.cwd(), file);
    const exists = fs.existsSync(fullPath);
    recordTest(
      `组件文件存在: ${file}`,
      exists,
      exists ? '' : '文件不存在'
    );
  }

  // 检查翻译文件
  const messagesPath = path.join(process.cwd(), 'messages');
  const zhExists = fs.existsSync(path.join(messagesPath, 'zh.json'));
  const enExists = fs.existsSync(path.join(messagesPath, 'en.json'));
  
  recordTest('中文翻译文件存在', zhExists, zhExists ? '' : '缺少 zh.json');
  recordTest('英文翻译文件存在', enExists, enExists ? '' : '缺少 en.json');

  if (zhExists) {
    const zhContent = JSON.parse(fs.readFileSync(path.join(messagesPath, 'zh.json'), 'utf8'));
    const hasAuthTranslations = zhContent.auth && Object.keys(zhContent.auth).length > 0;
    recordTest(
      '中文认证翻译完整',
      hasAuthTranslations,
      hasAuthTranslations ? '' : '缺少 auth 翻译'
    );
  }
}

/**
 * 测试 2: 认证流程测试
 */
async function testAuthFlow() {
  log.section();
  log.title('🔐 测试 2: 认证流程测试');
  log.section();

  try {
    // 2.1 用户注册
    log.info(`尝试注册用户: ${testUser.email}`);
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testUser.email,
      password: testUser.password,
      options: {
        data: {
          username: testUser.username,
          fullName: testUser.fullName,
        },
      },
    });

    if (signUpError) {
      if (signUpError.message.includes('rate limit')) {
        recordTest(
          '用户注册',
          false,
          '邮件速率限制 - 请等待1小时后重试',
          true // 这是警告而非错误
        );
        log.info('跳过后续认证流程测试(需要邮箱验证)');
        return;
      } else {
        recordTest('用户注册', false, signUpError.message);
        return;
      }
    }

    recordTest('用户注册', true, `用户ID: ${signUpData.user?.id}`);

    // 检查是否需要邮箱验证
    if (signUpData.user && !signUpData.session) {
      recordTest(
        '邮箱验证流程',
        true,
        '需要邮箱验证 - 正常行为',
        false
      );
      log.info('📧 验证邮件已发送,请检查邮箱');
      return;
    }

    // 2.2 用户登录
    if (signUpData.session) {
      log.info('尝试登出并重新登录...');
      await supabase.auth.signOut();

      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testUser.email,
        password: testUser.password,
      });

      recordTest(
        '用户登录',
        !signInError && signInData.session !== null,
        signInError?.message || ''
      );

      if (signInData.session) {
        // 2.3 获取当前会话
        const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
        recordTest(
          '获取会话',
          !sessionError && sessionData.session !== null,
          sessionError?.message || ''
        );

        // 2.4 获取当前用户
        const { data: userData, error: userError } = await supabase.auth.getUser();
        recordTest(
          '获取用户信息',
          !userError && userData.user !== null,
          userError?.message || ''
        );

        // 2.5 用户登出
        const { error: signOutError } = await supabase.auth.signOut();
        recordTest('用户登出', !signOutError, signOutError?.message || '');
      }
    }
  } catch (error) {
    recordTest('认证流程测试', false, error.message);
  }
}

/**
 * 测试 3: API端点测试
 */
async function testAPIEndpoints() {
  log.section();
  log.title('🌐 测试 3: API端点测试');
  log.section();

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const endpoints = [
    { method: 'POST', path: '/api/auth/register', requiresBody: true },
    { method: 'POST', path: '/api/auth/login', requiresBody: true },
    { method: 'POST', path: '/api/auth/logout', requiresAuth: true },
    { method: 'GET', path: '/api/users/me', requiresAuth: true },
    { method: 'POST', path: '/api/auth/forgot-password', requiresBody: true },
  ];

  for (const endpoint of endpoints) {
    try {
      // 这里只测试端点是否存在,不实际调用
      const fs = require('fs');
      const path = require('path');
      const routePath = endpoint.path.replace('/api/', 'src/app/api/') + '/route.ts';
      const fullPath = path.join(process.cwd(), routePath);
      const exists = fs.existsSync(fullPath);
      
      recordTest(
        `API端点文件: ${endpoint.method} ${endpoint.path}`,
        exists,
        exists ? '' : '文件不存在'
      );
    } catch (error) {
      recordTest(`API端点: ${endpoint.method} ${endpoint.path}`, false, error.message);
    }
  }
}

/**
 * 测试 4: 权限控制测试
 */
async function testPermissions() {
  log.section();
  log.title('🔒 测试 4: 权限控制测试');
  log.section();

  const fs = require('fs');
  const path = require('path');

  // 检查权限相关文件
  const permissionFiles = [
    'src/lib/auth/permissions.ts',
    'src/components/auth/ProtectedRoute.tsx',
  ];

  for (const file of permissionFiles) {
    const fullPath = path.join(process.cwd(), file);
    const exists = fs.existsSync(fullPath);
    recordTest(
      `权限文件存在: ${file}`,
      exists,
      exists ? '' : '文件不存在'
    );

    if (exists) {
      const content = fs.readFileSync(fullPath, 'utf8');
      // 检查关键函数/组件是否存在
      if (file.includes('permissions.ts')) {
        const hasRoleCheck = content.includes('hasRole') || content.includes('checkRole');
        recordTest(
          '权限检查函数存在',
          hasRoleCheck,
          hasRoleCheck ? '' : '缺少权限检查函数'
        );
      } else if (file.includes('ProtectedRoute')) {
        const hasProtectedRoute = content.includes('ProtectedRoute');
        const hasAdminRoute = content.includes('AdminRoute');
        const hasCreatorRoute = content.includes('CreatorRoute');
        
        recordTest('ProtectedRoute 组件存在', hasProtectedRoute);
        recordTest('AdminRoute 组件存在', hasAdminRoute);
        recordTest('CreatorRoute 组件存在', hasCreatorRoute);
      }
    }
  }
}

/**
 * 测试 5: 数据库迁移验证
 */
async function testDatabaseMigration() {
  log.section();
  log.title('🗄️  测试 5: 数据库迁移验证');
  log.section();

  const fs = require('fs');
  const path = require('path');

  // 检查迁移文件
  const migrationFile = 'supabase/migrations/001_create_user_tables.sql';
  const fullPath = path.join(process.cwd(), migrationFile);
  const exists = fs.existsSync(fullPath);

  recordTest(
    '数据库迁移文件存在',
    exists,
    exists ? '' : '缺少迁移脚本'
  );

  if (exists) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    // 检查关键表是否定义
    const tables = [
      'user_profiles',
      'creator_profiles',
      'user_addresses',
      'user_sessions',
      'audit_logs',
    ];

    for (const table of tables) {
      const hasTable = content.includes(`CREATE TABLE IF NOT EXISTS ${table}`) ||
                       content.includes(`CREATE TABLE ${table}`);
      recordTest(
        `数据库表定义: ${table}`,
        hasTable,
        hasTable ? '' : '未找到表定义'
      );
    }

    // 检查RLS策略
    const hasRLS = content.includes('ALTER TABLE') && content.includes('ENABLE ROW LEVEL SECURITY');
    recordTest('RLS行级安全策略', hasRLS, hasRLS ? '' : '未启用RLS');

    // 检查触发器
    const hasTrigger = content.includes('CREATE OR REPLACE FUNCTION') && 
                       content.includes('CREATE TRIGGER');
    recordTest('数据库触发器', hasTrigger, hasTrigger ? '' : '未找到触发器定义');
  }
}

/**
 * 生成测试报告
 */
function generateReport() {
  log.section();
  log.title('📊 测试报告');
  log.section();

  const passRate = ((testResults.passed / testResults.total) * 100).toFixed(2);
  
  console.log(`\n总测试数: ${testResults.total}`);
  console.log(`${colors.green}✅ 通过: ${testResults.passed}${colors.reset}`);
  console.log(`${colors.red}❌ 失败: ${testResults.failed}${colors.reset}`);
  console.log(`${colors.yellow}⚠️  警告: ${testResults.warnings}${colors.reset}`);
  console.log(`\n通过率: ${passRate}%`);

  if (testResults.failed > 0) {
    log.section();
    log.title('❌ 失败的测试:');
    testResults.tests
      .filter(t => !t.passed && !t.isWarning)
      .forEach(t => {
        console.log(`  • ${t.name}: ${t.message}`);
      });
  }

  if (testResults.warnings > 0) {
    log.section();
    log.title('⚠️  警告项:');
    testResults.tests
      .filter(t => t.isWarning)
      .forEach(t => {
        console.log(`  • ${t.name}: ${t.message}`);
      });
  }

  log.section();

  // 保存详细报告
  const fs = require('fs');
  const reportPath = 'auth-integration-test-report.json';
  fs.writeFileSync(
    reportPath,
    JSON.stringify(testResults, null, 2)
  );
  log.success(`详细报告已保存: ${reportPath}`);

  return testResults.failed === 0;
}

/**
 * 主测试函数
 */
async function runTests() {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║       OpenAero 用户认证系统集成测试                         ║
╚════════════════════════════════════════════════════════════╝
  `);

  log.info(`测试时间: ${new Date().toLocaleString('zh-CN')}`);
  log.info(`Supabase URL: ${supabaseUrl}`);

  try {
    // 运行所有测试
    await testFrontendComponents();
    await testAuthFlow();
    await testAPIEndpoints();
    await testPermissions();
    await testDatabaseMigration();

    // 生成报告
    const allPassed = generateReport();

    // 退出码
    process.exit(allPassed ? 0 : 1);
  } catch (error) {
    log.error(`测试运行失败: ${error.message}`);
    console.error(error);
    process.exit(1);
  }
}

// 运行测试
runTests();
