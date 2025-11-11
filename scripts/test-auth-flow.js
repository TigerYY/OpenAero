#!/usr/bin/env node

/**
 * OpenAero 认证系统自动化测试脚本
 * 
 * 测试所有认证相关功能:
 * - 用户注册
 * - 邮箱验证
 * - 用户登录
 * - 获取用户信息
 * - 密码重置流程
 * - 登出功能
 */

import 'dotenv/config';

const API_BASE = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const TEST_EMAIL = `test-${Date.now()}@example.com`;
const TEST_PASSWORD = 'Test123456!';
const TEST_USERNAME = `testuser${Date.now()}`;

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warn(message) {
  log(`⚠️  ${message}`, 'yellow');
}

// API 调用辅助函数
async function apiCall(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;
  
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });

    const data = await response.json();
    
    return {
      status: response.status,
      ok: response.ok,
      data,
    };
  } catch (err) {
    return {
      status: 0,
      ok: false,
      error: err.message,
    };
  }
}

// 测试结果收集
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: [],
};

function recordTest(name, passed, message = '') {
  testResults.total++;
  if (passed) {
    testResults.passed++;
    success(`${name}: ${message || 'PASSED'}`);
  } else {
    testResults.failed++;
    error(`${name}: ${message || 'FAILED'}`);
  }
  
  testResults.tests.push({ name, passed, message });
}

// ============================================
// 测试用例
// ============================================

async function test1_UserRegistration() {
  info('\n📝 测试 1: 用户注册');
  
  const result = await apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      username: TEST_USERNAME,
      fullName: '测试用户',
    }),
  });

  if (result.ok && result.data.success) {
    recordTest('用户注册', true, '注册成功');
    return result.data.data;
  } else {
    recordTest('用户注册', false, result.data?.error || '注册失败');
    return null;
  }
}

async function test2_UserLogin() {
  info('\n🔐 测试 2: 用户登录');
  
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    }),
  });

  if (result.ok && result.data.success) {
    recordTest('用户登录', true, '登录成功');
    return result.data.data;
  } else {
    recordTest('用户登录', false, result.data?.error || '登录失败');
    return null;
  }
}

async function test3_GetUserInfo(accessToken) {
  info('\n👤 测试 3: 获取用户信息');
  
  if (!accessToken) {
    recordTest('获取用户信息', false, '缺少访问令牌');
    return;
  }

  const result = await apiCall('/api/users/me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (result.ok && result.data.success) {
    recordTest('获取用户信息', true, `获取成功: ${result.data.data.email}`);
  } else {
    recordTest('获取用户信息', false, result.data?.error || '获取失败');
  }
}

async function test4_UnauthorizedAccess() {
  info('\n🚫 测试 4: 未授权访问');
  
  const result = await apiCall('/api/users/me', {
    method: 'GET',
    // 不提供 token
  });

  if (!result.ok && result.status === 401) {
    recordTest('未授权访问拒绝', true, '正确返回 401');
  } else {
    recordTest('未授权访问拒绝', false, '应该返回 401');
  }
}

async function test5_ForgotPassword() {
  info('\n🔑 测试 5: 忘记密码');
  
  const result = await apiCall('/api/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
    }),
  });

  if (result.ok && result.data.success) {
    recordTest('忘记密码', true, '重置邮件已发送');
    warn('请检查邮箱以继续密码重置测试');
  } else {
    recordTest('忘记密码', false, result.data?.error || '发送失败');
  }
}

async function test6_InvalidLogin() {
  info('\n❌ 测试 6: 错误密码登录');
  
  const result = await apiCall('/api/auth/login', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: 'WrongPassword123!',
    }),
  });

  if (!result.ok) {
    recordTest('错误密码拒绝', true, '正确拒绝错误密码');
  } else {
    recordTest('错误密码拒绝', false, '不应该允许错误密码登录');
  }
}

async function test7_Logout(accessToken) {
  info('\n👋 测试 7: 用户登出');
  
  if (!accessToken) {
    recordTest('用户登出', false, '缺少访问令牌');
    return;
  }

  const result = await apiCall('/api/auth/logout', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (result.ok && result.data.success) {
    recordTest('用户登出', true, '登出成功');
  } else {
    recordTest('用户登出', false, result.data?.error || '登出失败');
  }
}

async function test8_DuplicateRegistration() {
  info('\n🔄 测试 8: 重复注册');
  
  const result = await apiCall('/api/auth/register', {
    method: 'POST',
    body: JSON.stringify({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
      username: `${TEST_USERNAME}_new`,
      fullName: '测试用户2',
    }),
  });

  if (!result.ok) {
    recordTest('重复注册拒绝', true, '正确拒绝重复邮箱');
  } else {
    recordTest('重复注册拒绝', false, '不应该允许重复邮箱注册');
  }
}

// ============================================
// 主测试流程
// ============================================

async function runTests() {
  console.log('\n' + '='.repeat(60));
  log('🧪 OpenAero 认证系统自动化测试', 'blue');
  console.log('='.repeat(60));
  
  info(`\n📋 测试配置:`);
  info(`   API Base: ${API_BASE}`);
  info(`   测试邮箱: ${TEST_EMAIL}`);
  info(`   测试用户名: ${TEST_USERNAME}`);
  
  let userData = null;
  let sessionData = null;

  try {
    // 测试 1: 用户注册
    userData = await test1_UserRegistration();
    await sleep(1000);

    // 测试 2: 用户登录
    sessionData = await test2_UserLogin();
    await sleep(1000);

    // 测试 3: 获取用户信息
    if (sessionData?.session?.access_token) {
      await test3_GetUserInfo(sessionData.session.access_token);
      await sleep(1000);
    }

    // 测试 4: 未授权访问
    await test4_UnauthorizedAccess();
    await sleep(1000);

    // 测试 5: 忘记密码
    await test5_ForgotPassword();
    await sleep(1000);

    // 测试 6: 错误密码登录
    await test6_InvalidLogin();
    await sleep(1000);

    // 测试 7: 用户登出
    if (sessionData?.session?.access_token) {
      await test7_Logout(sessionData.session.access_token);
      await sleep(1000);
    }

    // 测试 8: 重复注册
    await test8_DuplicateRegistration();

  } catch (err) {
    error(`\n测试过程中发生错误: ${err.message}`);
    console.error(err);
  }

  // 打印测试总结
  printSummary();
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function printSummary() {
  console.log('\n' + '='.repeat(60));
  log('📊 测试总结', 'blue');
  console.log('='.repeat(60));
  
  console.log(`\n总测试数: ${testResults.total}`);
  success(`通过: ${testResults.passed}`);
  error(`失败: ${testResults.failed}`);
  
  const passRate = testResults.total > 0 
    ? ((testResults.passed / testResults.total) * 100).toFixed(2)
    : 0;
  
  console.log(`\n通过率: ${passRate}%`);
  
  if (testResults.failed > 0) {
    console.log('\n❌ 失败的测试:');
    testResults.tests
      .filter(t => !t.passed)
      .forEach(t => {
        error(`   - ${t.name}: ${t.message}`);
      });
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (testResults.failed === 0) {
    success('🎉 所有测试通过!');
  } else {
    warn('⚠️  部分测试失败,请检查上述错误');
  }
  
  console.log('\n💡 提示:');
  info('   - 某些测试可能因为邮件速率限制而失败');
  info('   - 如需完整测试,请确保开发服务器正在运行 (npm run dev)');
  info('   - 检查 Supabase Dashboard 确认数据变化');
  info('   - 详细测试指南: AUTHENTICATION_TESTING_GUIDE.md');
  
  console.log('\n');
}

// 启动测试
runTests().catch(err => {
  error(`测试启动失败: ${err.message}`);
  console.error(err);
  process.exit(1);
});
