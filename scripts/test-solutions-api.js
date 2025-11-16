#!/usr/bin/env node

/**
 * 测试Solutions API
 * 验证列名修复后的API功能
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

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

async function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonBody = body ? JSON.parse(body) : null;
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: jsonBody,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: body,
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }

    req.end();
  });
}

async function testAPI(name, path, method = 'GET', data = null, expectedStatus = 200) {
  try {
    log(`\n📝 测试: ${name}`, 'cyan');
    log(`   ${method} ${path}`, 'blue');
    
    const startTime = Date.now();
    const response = await makeRequest(path, method, data);
    const duration = Date.now() - startTime;
    
    log(`   状态: ${response.status} (${duration}ms)`, 
        response.status === expectedStatus ? 'green' : 'yellow');
    
    if (response.body) {
      if (typeof response.body === 'object') {
        // 显示关键信息
        if (Array.isArray(response.body)) {
          log(`   返回: ${response.body.length} 条记录`, 'green');
          if (response.body.length > 0) {
            const firstItem = response.body[0];
            log(`   示例字段: ${Object.keys(firstItem).slice(0, 5).join(', ')}`, 'blue');
          }
        } else if (response.body.error) {
          log(`   错误: ${response.body.error}`, 'red');
          if (response.body.details) {
            log(`   详情: ${response.body.details}`, 'yellow');
          }
        } else {
          const keys = Object.keys(response.body);
          log(`   返回字段: ${keys.slice(0, 5).join(', ')}${keys.length > 5 ? '...' : ''}`, 'blue');
        }
      } else {
        log(`   返回: ${response.body.substring(0, 100)}`, 'blue');
      }
    }
    
    return {
      success: response.status === expectedStatus,
      status: response.status,
      body: response.body,
      duration,
    };
  } catch (error) {
    log(`   ❌ 请求失败: ${error.message}`, 'red');
    return {
      success: false,
      error: error.message,
    };
  }
}

async function runTests() {
  log('=' .repeat(80), 'cyan');
  log('🧪 Solutions API 测试套件', 'cyan');
  log('=' .repeat(80), 'cyan');
  
  const results = [];

  // 测试1: 获取Solutions列表
  results.push(await testAPI(
    'GET /api/solutions - 获取解决方案列表',
    '/api/solutions',
    'GET',
    null,
    200
  ));

  // 测试2: 获取分页Solutions
  results.push(await testAPI(
    'GET /api/solutions?page=1&limit=10 - 分页查询',
    '/api/solutions?page=1&limit=10',
    'GET',
    null,
    200
  ));

  // 测试3: 按分类筛选
  results.push(await testAPI(
    'GET /api/solutions?category=electronics - 分类筛选',
    '/api/solutions?category=electronics',
    'GET',
    null,
    200
  ));

  // 测试4: 按状态筛选
  results.push(await testAPI(
    'GET /api/solutions?status=PUBLISHED - 状态筛选',
    '/api/solutions?status=PUBLISHED',
    'GET',
    null,
    200
  ));

  // 测试5: 健康检查
  results.push(await testAPI(
    'GET /api/health - 健康检查',
    '/api/health',
    'GET',
    null,
    200
  ));

  // 测试6: 测试不存在的Solution
  results.push(await testAPI(
    'GET /api/solutions/[id] - 获取单个解决方案（不存在）',
    '/api/solutions/non-existent-id',
    'GET',
    null,
    404
  ));

  // 汇总结果
  log('\n' + '=' .repeat(80), 'cyan');
  log('📊 测试结果汇总', 'cyan');
  log('=' .repeat(80), 'cyan');
  
  const passed = results.filter(r => r.success).length;
  const total = results.length;
  
  log(`\n✅ 通过: ${passed}/${total}`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 所有测试通过！Solutions API 工作正常！', 'green');
  } else {
    log('\n⚠️  部分测试失败，请检查详细日志', 'yellow');
  }
  
  // 显示性能统计
  const durations = results.filter(r => r.duration).map(r => r.duration);
  if (durations.length > 0) {
    const avgDuration = durations.reduce((a, b) => a + b, 0) / durations.length;
    log(`\n⚡ 平均响应时间: ${avgDuration.toFixed(2)}ms`, 'blue');
  }
  
  log('\n' + '=' .repeat(80), 'cyan');
  
  return passed === total;
}

// 主函数
async function main() {
  try {
    // 先检查服务器是否运行
    log('🔍 检查开发服务器状态...', 'cyan');
    
    try {
      await makeRequest('/api/health');
      log('✅ 开发服务器正在运行\n', 'green');
    } catch (error) {
      log('❌ 无法连接到开发服务器', 'red');
      log('请确保运行了: npm run dev\n', 'yellow');
      process.exit(1);
    }
    
    // 运行测试
    const success = await runTests();
    
    process.exit(success ? 0 : 1);
  } catch (error) {
    log(`\n❌ 测试过程出错: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
