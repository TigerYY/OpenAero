/**
 * OAuth提供商配置脚本
 * 用于自动配置Google和GitHub OAuth
 */

const fs = require('fs');
const path = require('path');

// OAuth配置模板
const OAUTH_CONFIG_TEMPLATES = {
  google: {
    name: 'Google OAuth',
    requiredEnvVars: ['GOOGLE_CLIENT_ID', 'GOOGLE_CLIENT_SECRET'],
    supabaseProvider: 'google',
    callbackUrl: 'http://localhost:3000/auth/callback',
    setupInstructions: {
      consoleUrl: 'https://console.cloud.google.com',
      steps: [
        '1. 访问 Google Cloud Console',
        '2. 选择或创建项目',
        '3. 导航到 APIs & Services > Credentials',
        '4. 创建 OAuth Client ID (Web application)',
        '5. 配置重定向URL: http://localhost:3000/auth/callback',
        '6. 复制 Client ID 和 Client Secret'
      ]
    }
  },
  github: {
    name: 'GitHub OAuth',
    requiredEnvVars: ['GITHUB_CLIENT_ID', 'GITHUB_CLIENT_SECRET'],
    supabaseProvider: 'github',
    callbackUrl: 'http://localhost:3000/auth/callback',
    setupInstructions: {
      consoleUrl: 'https://github.com/settings/developers',
      steps: [
        '1. 访问 GitHub Developer Settings',
        '2. 点击 OAuth Apps > New OAuth App',
        '3. 填写应用信息',
        '4. 设置回调URL: http://localhost:3000/auth/callback',
        '5. 复制 Client ID 和生成 Client Secret'
      ]
    }
  }
};

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

function checkEnvFile() {
  const envPath = path.join(process.cwd(), '.env.local');
  
  if (!fs.existsSync(envPath)) {
    log('❌ .env.local 文件不存在', 'red');
    return false;
  }
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  return envContent;
}

function getEnvVarValue(varName, envContent) {
  const match = envContent.match(new RegExp(`^${varName}=(.+)$`, 'm'));
  return match ? match[1].trim() : '';
}

function setEnvVar(varName, value) {
  const envPath = path.join(process.cwd(), '.env.local');
  let envContent = fs.readFileSync(envPath, 'utf8');
  
  const regex = new RegExp(`^${varName}=.*$`, 'm');
  if (envContent.match(regex)) {
    envContent = envContent.replace(regex, `${varName}=${value}`);
  } else {
    envContent += `\n${varName}=${value}`;
  }
  
  fs.writeFileSync(envPath, envContent);
}

function checkOAuthConfig(provider) {
  const config = OAUTH_CONFIG_TEMPLATES[provider];
  const envContent = checkEnvFile();
  
  if (!envContent) {
    return { configured: false, missing: config.requiredEnvVars };
  }
  
  const missing = [];
  const present = [];
  
  config.requiredEnvVars.forEach(varName => {
    const value = getEnvVarValue(varName, envContent);
    if (value) {
      present.push(varName);
    } else {
      missing.push(varName);
    }
  });
  
  return {
    configured: missing.length === 0,
    present,
    missing
  };
}

function displayOAuthStatus() {
  log('\n🔗 OAuth提供商配置状态', 'blue');
  log('================================', 'blue');
  
  Object.keys(OAUTH_CONFIG_TEMPLATES).forEach(provider => {
    const config = OAUTH_CONFIG_TEMPLATES[provider];
    const status = checkOAuthConfig(provider);
    
    log(`\n📋 ${config.name}`, 'cyan');
    log(`   状态: ${status.configured ? '✅ 已配置' : '❌ 未配置'}`, status.configured ? 'green' : 'red');
    
    if (status.present.length > 0) {
      log('   已配置:', 'green');
      status.present.forEach(varName => log(`     ✅ ${varName}`, 'green'));
    }
    
    if (status.missing.length > 0) {
      log('   缺失配置:', 'red');
      status.missing.forEach(varName => log(`     ❌ ${varName}`, 'red'));
    }
  });
}

function showSetupInstructions(provider) {
  const config = OAUTH_CONFIG_TEMPLATES[provider];
  
  log(`\n📖 ${config.name} 配置指南`, 'blue');
  log('================================', 'blue');
  
  log(`\n🌐 访问配置页面:`, 'cyan');
  log(`   ${config.setupInstructions.consoleUrl}`, 'white');
  
  log(`\n📋 配置步骤:`, 'cyan');
  config.setupInstructions.steps.forEach(step => {
    log(`   ${step}`, 'white');
  });
  
  log(`\n🔄 配置完成后，运行以下命令更新环境变量:`, 'cyan');
  log(`   node scripts/setup-oauth-providers.js --set-${provider} <CLIENT_ID> <CLIENT_SECRET>`, 'yellow');
}

function setOAuthConfig(provider, clientId, clientSecret) {
  const config = OAUTH_CONFIG_TEMPLATES[provider];
  
  log(`\n🔧 配置${config.name}...`, 'blue');
  
  // 设置环境变量
  setEnvVar(config.requiredEnvVars[0], clientId);
  setEnvVar(config.requiredEnvVars[1], clientSecret);
  
  // 启用OAuth功能标志
  setEnvVar('FEATURE_OAUTH_PROVIDERS', 'true');
  
  log(`✅ ${config.name}配置完成！`, 'green');
  log(`   Client ID: ${clientId}`, 'white');
  log(`   Client Secret: ${clientSecret.substring(0, 8)}...`, 'white');
  
  // 生成Supabase配置SQL
  generateSupabaseOAuthSQL(provider, clientId, clientSecret);
  
  log(`\n📋 下一步操作:`, 'cyan');
  log(`   1. 访问Supabase Dashboard: https://cardynuoazvaytvinxvm.supabase.co`, 'white');
  log(`   2. 导航到 Authentication > Providers`, 'white');
  log(`   3. 启用${config.name}提供商`, 'white');
  log(`   4. 填入Client ID和Client Secret`, 'white');
  log(`   5. 重启开发服务器`, 'white');
}

function generateSupabaseOAuthSQL(provider, clientId, clientSecret) {
  const config = OAUTH_CONFIG_TEMPLATES[provider];
  
  log(`\n📝 Supabase配置SQL:`, 'cyan');
  log('```sql', 'white');
  log(`-- 更新${config.name}配置`, 'white');
  log(`UPDATE auth.providers`, 'white');
  log(`SET enabled = true,`, 'white');
  log(`    provider_options = jsonb_build_object('client_id', '${clientId}', 'client_secret', '${clientSecret}')`, 'white');
  log(`WHERE provider = '${config.supabaseProvider}';`, 'white');
  log('```', 'white');
}

function validateOAuthSetup() {
  log('\n🧪 验证OAuth配置...', 'blue');
  
  let allConfigured = true;
  
  Object.keys(OAUTH_CONFIG_TEMPLATES).forEach(provider => {
    const status = checkOAuthConfig(provider);
    if (status.configured) {
      log(`✅ ${OAUTH_CONFIG_TEMPLATES[provider].name}已配置`, 'green');
    } else {
      log(`❌ ${OAUTH_CONFIG_TEMPLATES[provider].name}未配置`, 'red');
      allConfigured = false;
    }
  });
  
  // 检查功能标志
  const envContent = checkEnvFile();
  if (envContent) {
    const oauthFlag = getEnvVarValue('FEATURE_OAUTH_PROVIDERS', envContent);
    if (oauthFlag === 'true') {
      log('✅ OAuth功能标志已启用', 'green');
    } else {
      log('⚠️  OAuth功能标志未启用', 'yellow');
      allConfigured = false;
    }
  }
  
  if (allConfigured) {
    log('\n🎉 OAuth配置验证通过！', 'green');
    log('可以开始测试OAuth登录功能了。', 'white');
  } else {
    log('\n⚠️  OAuth配置不完整，请完成配置后重试。', 'yellow');
  }
}

function generateTestPage() {
  const testHtml = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>OAuth登录测试</title>
    <script src="https://cdn.tailwindcss.com"></script>
</head>
<body class="bg-gray-50 min-h-screen flex items-center justify-center p-4">
    <div class="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
        <h1 class="text-2xl font-bold text-center mb-6">🔗 OAuth登录测试</h1>
        
        <div class="space-y-4">
            <button onclick="loginWithGoogle()" class="w-full bg-blue-500 text-white py-3 px-4 rounded-lg hover:bg-blue-600 transition flex items-center justify-center space-x-2">
                <svg class="w-5 h-5" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>使用Google登录</span>
            </button>
            
            <button onclick="loginWithGitHub()" class="w-full bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-900 transition flex items-center justify-center space-x-2">
                <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                </svg>
                <span>使用GitHub登录</span>
            </button>
        </div>
        
        <div id="result" class="mt-6 p-4 rounded-lg hidden"></div>
        
        <div class="mt-6 text-center">
            <a href="/test-supabase-auth.html" class="text-blue-500 hover:underline">返回配置测试</a>
        </div>
    </div>
    
    <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
    <script>
        const supabase = createClient(
            'https://cardynuoazvaytvinxvm.supabase.co',
            'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNhcmR5bnVvYXp2YXl0dmlueHZtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1ODk0MTUsImV4cCI6MjA3NjE2NTQxNX0.s7gVeKupd0Rny4JeQr3SL4BTuv9uE6jdDz_rt-X9UaI'
        );
        
        async function loginWithGoogle() {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'google',
                options: {
                    redirectTo: window.location.origin + '/auth/callback'
                }
            });
            
            if (error) {
                showResult('登录失败: ' + error.message, 'error');
            }
        }
        
        async function loginWithGitHub() {
            const { data, error } = await supabase.auth.signInWithOAuth({
                provider: 'github',
                options: {
                    redirectTo: window.location.origin + '/auth/callback'
                }
            });
            
            if (error) {
                showResult('登录失败: ' + error.message, 'error');
            }
        }
        
        function showResult(message, type) {
            const resultDiv = document.getElementById('result');
            resultDiv.classList.remove('hidden');
            resultDiv.className = \`mt-6 p-4 rounded-lg \$\{type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'}\`;
            resultDiv.textContent = message;
        }
        
        // 检查URL参数中的认证结果
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');
        
        if (error) {
            showResult('OAuth错误: ' + (errorDescription || error), 'error');
        }
    </script>
</body>
</html>
  `;
  
  fs.writeFileSync('test-oauth-login.html', testHtml);
  log('\n📄 OAuth测试页面已创建: test-oauth-login.html', 'green');
}

// 主函数
function main() {
  const args = process.argv.slice(2);
  
  log('🔗 OAuth提供商配置工具', 'magenta');
  log('================================', 'magenta');
  
  if (args.length === 0) {
    // 显示状态
    displayOAuthStatus();
    
    log('\n📋 可用命令:', 'cyan');
    log('  --check                    检查OAuth配置状态', 'white');
    log('  --validate                 验证OAuth配置', 'white');
    log('  --setup-google            显示Google OAuth配置指南', 'white');
    log('  --setup-github             显示GitHub OAuth配置指南', 'white');
    log('  --set-google <id> <secret> 配置Google OAuth', 'white');
    log('  --set-github <id> <secret> 配置GitHub OAuth', 'white');
    log('  --generate-test            生成OAuth测试页面', 'white');
    
    return;
  }
  
  switch (args[0]) {
    case '--check':
      displayOAuthStatus();
      break;
      
    case '--validate':
      validateOAuthSetup();
      break;
      
    case '--setup-google':
      showSetupInstructions('google');
      break;
      
    case '--setup-github':
      showSetupInstructions('github');
      break;
      
    case '--set-google':
      if (args.length < 3) {
        log('❌ 请提供Client ID和Client Secret', 'red');
        log('用法: --set-google <CLIENT_ID> <CLIENT_SECRET>', 'yellow');
        return;
      }
      setOAuthConfig('google', args[1], args[2]);
      break;
      
    case '--set-github':
      if (args.length < 3) {
        log('❌ 请提供Client ID和Client Secret', 'red');
        log('用法: --set-github <CLIENT_ID> <CLIENT_SECRET>', 'yellow');
        return;
      }
      setOAuthConfig('github', args[1], args[2]);
      break;
      
    case '--generate-test':
      generateTestPage();
      break;
      
    default:
      log('❌ 未知命令: ' + args[0], 'red');
      log('使用 --help 查看可用命令', 'yellow');
  }
}

// 运行脚本
main();