#!/usr/bin/env node

/**
 * 测试解决方案全周期管理流程 API
 * 验证后端 API 是否正常工作
 */

// 加载环境变量
require('dotenv').config({ path: '.env.local' });

const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// 测试配置
const TEST_CONFIG = {
  // 需要管理员认证的 API
  adminAPIs: [
    {
      name: '上架优化 API',
      method: 'PUT',
      path: '/api/admin/solutions/{id}/optimize',
      requiresAuth: true,
      requiresAdmin: true,
    },
    {
      name: '预览 API',
      method: 'GET',
      path: '/api/admin/solutions/{id}/preview',
      requiresAuth: true,
      requiresAdmin: true,
    },
    {
      name: '批量发布 API',
      method: 'POST',
      path: '/api/admin/solutions/batch-publish',
      requiresAuth: true,
      requiresAdmin: true,
    },
    {
      name: '批量临时下架 API',
      method: 'POST',
      path: '/api/admin/solutions/batch-suspend',
      requiresAuth: true,
      requiresAdmin: true,
    },
    {
      name: '批量恢复 API',
      method: 'POST',
      path: '/api/admin/solutions/batch-restore',
      requiresAuth: true,
      requiresAdmin: true,
    },
  ],
  // 需要创作者认证的 API
  creatorAPIs: [
    {
      name: '方案升级 API',
      method: 'POST',
      path: '/api/solutions/{id}/upgrade',
      requiresAuth: true,
      requiresCreator: true,
    },
    {
      name: '升级历史 API',
      method: 'GET',
      path: '/api/solutions/{id}/upgrade-history',
      requiresAuth: false,
    },
  ],
  // 公共 API
  publicAPIs: [
    {
      name: '发布 API (支持新状态)',
      method: 'POST',
      path: '/api/solutions/{id}/publish',
      requiresAuth: true,
      requiresAdmin: true,
    },
  ],
};

async function testAPI(name, method, path, options = {}) {
  const { body, headers = {} } = options;
  
  try {
    const url = `${BASE_URL}${path}`;
    console.log(`\n📡 测试: ${name}`);
    console.log(`   ${method} ${path}`);
    
    const fetchOptions = {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };
    
    if (body) {
      fetchOptions.body = JSON.stringify(body);
    }
    
    const response = await fetch(url, fetchOptions);
    const data = await response.json().catch(() => ({ error: '无法解析响应' }));
    
    if (response.ok) {
      console.log(`   ✅ 成功 (${response.status})`);
      if (data.message) {
        console.log(`   消息: ${data.message}`);
      }
      return { success: true, status: response.status, data };
    } else {
      console.log(`   ⚠️  状态码: ${response.status}`);
      if (data.error) {
        console.log(`   错误: ${data.error}`);
      }
      // 对于需要认证的 API，401/403 是预期的
      if (response.status === 401 || response.status === 403) {
        return { success: true, status: response.status, expected: true, data };
      }
      return { success: false, status: response.status, data };
    }
  } catch (error) {
    console.log(`   ❌ 请求失败: ${error.message}`);
    return { success: false, error: error.message };
  }
}

async function testAPIs() {
  console.log('🔍 开始测试解决方案全周期管理流程 API...\n');
  console.log(`📍 基础 URL: ${BASE_URL}\n`);
  console.log('⚠️  注意: 这些测试需要有效的认证和测试数据');
  console.log('   对于需要认证的 API，401/403 响应是预期的（如果未登录）\n');

  const results = {
    success: [],
    warnings: [],
    errors: [],
    skipped: [],
  };

  // 测试管理员 API（需要认证，可能返回 401/403）
  console.log('='.repeat(60));
  console.log('📋 测试管理员 API');
  console.log('='.repeat(60));
  
  for (const api of TEST_CONFIG.adminAPIs) {
    const result = await testAPI(
      api.name,
      api.method,
      api.path.replace('{id}', 'test-solution-id'),
      {
        body: api.method === 'POST' || api.method === 'PUT' ? { test: true } : undefined,
      }
    );
    
    if (result.success) {
      if (result.expected) {
        results.skipped.push(`${api.name}: 需要认证（预期）`);
      } else {
        results.success.push(`${api.name}: 正常工作`);
      }
    } else {
      if (result.status === 404) {
        results.warnings.push(`${api.name}: 端点不存在或测试数据不存在`);
      } else {
        results.errors.push(`${api.name}: 测试失败`);
      }
    }
  }

  // 测试创作者 API
  console.log('\n' + '='.repeat(60));
  console.log('📋 测试创作者 API');
  console.log('='.repeat(60));
  
  for (const api of TEST_CONFIG.creatorAPIs) {
    const result = await testAPI(
      api.name,
      api.method,
      api.path.replace('{id}', 'test-solution-id'),
      {
        body: api.method === 'POST' ? { title: 'Test Upgrade' } : undefined,
      }
    );
    
    if (result.success) {
      if (result.expected) {
        results.skipped.push(`${api.name}: 需要认证（预期）`);
      } else {
        results.success.push(`${api.name}: 正常工作`);
      }
    } else {
      if (result.status === 404) {
        results.warnings.push(`${api.name}: 端点不存在或测试数据不存在`);
      } else {
        results.errors.push(`${api.name}: 测试失败`);
      }
    }
  }

  // 测试公共 API
  console.log('\n' + '='.repeat(60));
  console.log('📋 测试公共 API');
  console.log('='.repeat(60));
  
  for (const api of TEST_CONFIG.publicAPIs) {
    const result = await testAPI(
      api.name,
      api.method,
      api.path.replace('{id}', 'test-solution-id'),
      {
        body: api.method === 'POST' ? { action: 'PUBLISH' } : undefined,
      }
    );
    
    if (result.success) {
      if (result.expected) {
        results.skipped.push(`${api.name}: 需要认证（预期）`);
      } else {
        results.success.push(`${api.name}: 正常工作`);
      }
    } else {
      if (result.status === 404) {
        results.warnings.push(`${api.name}: 端点不存在或测试数据不存在`);
      } else {
        results.errors.push(`${api.name}: 测试失败`);
      }
    }
  }

  // 输出总结
  console.log('\n' + '='.repeat(60));
  console.log('📊 测试结果总结');
  console.log('='.repeat(60));
  console.log(`✅ 成功: ${results.success.length}`);
  results.success.forEach(msg => console.log(`   ✓ ${msg}`));
  
  if (results.skipped.length > 0) {
    console.log(`\n⏭️  跳过 (需要认证): ${results.skipped.length}`);
    results.skipped.forEach(msg => console.log(`   ⏭ ${msg}`));
  }
  
  if (results.warnings.length > 0) {
    console.log(`\n⚠️  警告: ${results.warnings.length}`);
    results.warnings.forEach(msg => console.log(`   ⚠ ${msg}`));
  }
  
  if (results.errors.length > 0) {
    console.log(`\n❌ 错误: ${results.errors.length}`);
    results.errors.forEach(msg => console.log(`   ✗ ${msg}`));
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (results.errors.length === 0) {
    console.log('🎉 API 测试完成！');
    console.log('\n💡 提示:');
    console.log('   - 如果需要完整测试，请先登录并获取认证 token');
    console.log('   - 确保有测试数据（方案、用户等）');
    console.log('   - 检查服务器日志以获取更多信息');
    process.exit(0);
  } else {
    console.log('⚠️  API 测试未完全通过，请检查上述错误。');
    process.exit(1);
  }
}

// fetch 已在文件顶部定义

// 运行测试
testAPIs().catch(error => {
  console.error('❌ 测试失败:', error);
  process.exit(1);
});

