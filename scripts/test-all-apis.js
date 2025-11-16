#!/usr/bin/env node

/**
 * 综合测试所有主要API端点
 */

const http = require('http');

const BASE_URL = 'http://localhost:3000';

const colors = {
  reset: '\x1b[0m',
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

async function makeRequest(path, method = 'GET') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || 3000,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = http.request(options, (res) => {
      let body = '';
      
      res.on('data', (chunk) => {
        body += chunk;
      });
      
      res.on('end', () => {
        try {
          resolve({
            status: res.statusCode,
            body: body ? JSON.parse(body) : null,
          });
        } catch (e) {
          resolve({
            status: res.statusCode,
            body: body,
          });
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function testEndpoint(name, path, expectedStatus = 200) {
  try {
    const response = await makeRequest(path);
    const success = response.status === expectedStatus;
    
    log(`${success ? '✅' : '❌'} ${name}`, success ? 'green' : 'red');
    log(`   状态: ${response.status} (预期: ${expectedStatus})`, success ? 'green' : 'yellow');
    
    if (response.body && typeof response.body === 'object') {
      if (response.body.success !== undefined) {
        log(`   成功: ${response.body.success}`, response.body.success ? 'green' : 'red');
      }
      if (response.body.message) {
        log(`   消息: ${response.body.message}`, 'blue');
      }
      if (response.body.data) {
        if (Array.isArray(response.body.data)) {
          log(`   数据: ${response.body.data.length} 条记录`, 'cyan');
        } else if (response.body.data.items) {
          log(`   数据: ${response.body.data.items.length} 条记录`, 'cyan');
        }
      }
    }
    
    return success;
  } catch (error) {
    log(`❌ ${name}`, 'red');
    log(`   错误: ${error.message}`, 'red');
    return false;
  }
}

async function main() {
  log('=' .repeat(80), 'cyan');
  log('🧪 API综合测试套件', 'cyan');
  log('=' .repeat(80), 'cyan');
  
  const results = [];
  
  log('\n📦 Solutions API', 'magenta');
  log('-' .repeat(80), 'cyan');
  results.push(await testEndpoint('GET /api/solutions', '/api/solutions'));
  results.push(await testEndpoint('GET /api/solutions (分页)', '/api/solutions?page=1&limit=5'));
  results.push(await testEndpoint('GET /api/solutions (分类)', '/api/solutions?category=electronics'));
  results.push(await testEndpoint('GET /api/solutions (状态)', '/api/solutions?status=PUBLISHED'));
  
  log('\n👥 用户管理 API', 'magenta');
  log('-' .repeat(80), 'cyan');
  results.push(await testEndpoint('GET /api/admin/users', '/api/admin/users', [200, 401, 403]));
  
  log('\n🏥 系统健康检查', 'magenta');
  log('-' .repeat(80), 'cyan');
  results.push(await testEndpoint('GET /api/health', '/api/health'));
  
  log('\n📊 其他API端点', 'magenta');
  log('-' .repeat(80), 'cyan');
  results.push(await testEndpoint('GET /api/categories', '/api/categories', [200, 404]));
  
  // 汇总
  log('\n' + '=' .repeat(80), 'cyan');
  log('📊 测试结果汇总', 'cyan');
  log('=' .repeat(80), 'cyan');
  
  const passed = results.filter(r => r).length;
  const total = results.length;
  const percentage = ((passed / total) * 100).toFixed(1);
  
  log(`\n✅ 通过: ${passed}/${total} (${percentage}%)`, passed === total ? 'green' : 'yellow');
  
  if (passed === total) {
    log('\n🎉 所有测试通过！', 'green');
  } else if (passed >= total * 0.8) {
    log('\n✅ 大部分测试通过，系统基本正常', 'green');
  } else {
    log('\n⚠️  多个测试失败，请检查系统状态', 'yellow');
  }
  
  log('\n' + '=' .repeat(80), 'cyan');
}

main().catch(console.error);
