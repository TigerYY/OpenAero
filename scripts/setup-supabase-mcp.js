#!/usr/bin/env node

/**
 * Supabase MCP 服务器设置脚本
 * 用于配置和验证 Supabase MCP 服务器连接
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

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

function checkEnvironmentVariables() {
  log('\n🔍 检查环境变量...', 'cyan');
  
  const requiredVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
  ];
  
  const optionalVars = [
    'SUPABASE_ACCESS_TOKEN', // Supabase Personal Access Token for MCP
  ];
  
  const missing = [];
  const present = [];
  
  requiredVars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
      log(`  ✅ ${varName}`, 'green');
    } else {
      missing.push(varName);
      log(`  ❌ ${varName} (缺失)`, 'red');
    }
  });
  
  optionalVars.forEach(varName => {
    if (process.env[varName]) {
      present.push(varName);
      log(`  ✅ ${varName}`, 'green');
    } else {
      log(`  ⚠️  ${varName} (可选，但MCP需要)`, 'yellow');
    }
  });
  
  return { missing, present };
}

function createMCPConfig() {
  log('\n📝 创建 MCP 配置文件...', 'cyan');
  
  const configDir = path.join(process.cwd(), '.cursor');
  const configFile = path.join(configDir, 'mcp.json');
  
  // 确保 .cursor 目录存在
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true });
    log(`  ✅ 创建目录: ${configDir}`, 'green');
  }
  
  const mcpConfig = {
    mcpServers: {
      supabase: {
        command: 'npx',
        args: [
          '-y',
          '@supabase/mcp-server-supabase@latest',
          '--access-token',
          '${SUPABASE_ACCESS_TOKEN}',
        ],
        env: {
          SUPABASE_URL: '${NEXT_PUBLIC_SUPABASE_URL}',
          SUPABASE_ANON_KEY: '${NEXT_PUBLIC_SUPABASE_ANON_KEY}',
          SUPABASE_SERVICE_ROLE_KEY: '${SUPABASE_SERVICE_ROLE_KEY}',
        },
      },
    },
  };
  
  try {
    fs.writeFileSync(configFile, JSON.stringify(mcpConfig, null, 2));
    log(`  ✅ MCP 配置文件已创建: ${configFile}`, 'green');
    return true;
  } catch (error) {
    log(`  ❌ 创建配置文件失败: ${error.message}`, 'red');
    return false;
  }
}

function testMCPConnection() {
  log('\n🧪 测试 MCP 服务器连接...', 'cyan');
  
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    log('  ⚠️  跳过测试: SUPABASE_ACCESS_TOKEN 未设置', 'yellow');
    log('  💡 提示: 在 Supabase 控制台创建 Personal Access Token', 'yellow');
    return false;
  }
  
  try {
    log('  📦 安装/更新 MCP 服务器包...', 'blue');
    execSync('npx -y @supabase/mcp-server-supabase@latest --version', {
      stdio: 'inherit',
    });
    log('  ✅ MCP 服务器包可用', 'green');
    return true;
  } catch (error) {
    log(`  ❌ 测试失败: ${error.message}`, 'red');
    return false;
  }
}

function generateInstructions() {
  log('\n📚 使用说明:', 'cyan');
  log('\n1. 获取 Supabase Personal Access Token:', 'blue');
  log('   - 登录 Supabase 控制台: https://supabase.com/dashboard', 'reset');
  log('   - 导航至: Settings > Access Tokens', 'reset');
  log('   - 创建新的 Access Token', 'reset');
  log('   - 将 Token 添加到 .env.local:', 'reset');
  log('     SUPABASE_ACCESS_TOKEN=your_token_here', 'reset');
  
  log('\n2. 配置 Cursor IDE:', 'blue');
  log('   - Cursor 会自动读取 .cursor/mcp.json 配置', 'reset');
  log('   - 重启 Cursor IDE 以加载 MCP 配置', 'reset');
  
  log('\n3. 验证配置:', 'blue');
  log('   - 运行: npm run mcp:test', 'reset');
  log('   - 或在 Cursor 中尝试使用 Supabase MCP 工具', 'reset');
  
  log('\n4. MCP 功能:', 'blue');
  log('   - 查询数据库表结构', 'reset');
  log('   - 执行 SQL 查询', 'reset');
  log('   - 管理数据库迁移', 'reset');
  log('   - 查看 API 端点', 'reset');
  log('   - 管理认证用户', 'reset');
}

function main() {
  log('🚀 Supabase MCP 服务器设置', 'cyan');
  log('=' .repeat(50), 'cyan');
  
  // 加载环境变量
  require('dotenv').config({ path: '.env.local' });
  
  // 检查环境变量
  const { missing, present } = checkEnvironmentVariables();
  
  if (missing.length > 0) {
    log(`\n⚠️  缺少必需的环境变量: ${missing.join(', ')}`, 'yellow');
    log('请确保 .env.local 文件包含所有必需的变量', 'yellow');
  }
  
  // 创建 MCP 配置
  const configCreated = createMCPConfig();
  
  if (!configCreated) {
    log('\n❌ 设置失败', 'red');
    process.exit(1);
  }
  
  // 测试连接
  const connectionOk = testMCPConnection();
  
  // 生成说明
  generateInstructions();
  
  log('\n' + '='.repeat(50), 'cyan');
  if (missing.length === 0 && connectionOk) {
    log('✅ Supabase MCP 设置完成!', 'green');
  } else {
    log('⚠️  设置完成，但需要配置 SUPABASE_ACCESS_TOKEN', 'yellow');
  }
}

if (require.main === module) {
  main();
}

module.exports = { checkEnvironmentVariables, createMCPConfig, testMCPConnection };

