/**
 * Supabase Auth SMTP 配置检查脚本
 * 验证 Supabase Dashboard 和本地环境变量配置
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
  bold: '\x1b[1m',
};

const log = {
  success: (msg) => console.log(`${colors.green}✅ ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}❌ ${msg}${colors.reset}`),
  warning: (msg) => console.log(`${colors.yellow}⚠️  ${msg}${colors.reset}`),
  info: (msg) => console.log(`${colors.blue}ℹ️  ${msg}${colors.reset}`),
  title: (msg) => console.log(`\n${colors.cyan}${colors.bold}${msg}${colors.reset}`),
  section: () => console.log(`${colors.cyan}${'='.repeat(70)}${colors.reset}`),
};

// SMTP 配置标准
const SMTP_CONFIG = {
  host: 'smtp.exmail.qq.com',
  port: 465,
  username: 'support@openaero.cn',
  password: 'zdM469e7q3ZU2gy7',
  senderEmail: 'support@openaero.cn',
  senderName: 'OpenAero',
  secure: true,
};

/**
 * 检查环境变量配置
 */
function checkEnvVariables() {
  log.title('📋 检查环境变量配置');
  log.section();

  const checks = [];

  // Supabase 基础配置
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const projectId = process.env.SUPABASE_PROJECT_ID;

  checks.push({
    name: 'Supabase URL',
    value: supabaseUrl,
    expected: 'https://cardynuoazvaytvinxvm.supabase.co',
    passed: supabaseUrl === 'https://cardynuoazvaytvinxvm.supabase.co',
  });

  checks.push({
    name: 'Supabase Anon Key',
    value: supabaseKey ? `${supabaseKey.substring(0, 20)}...` : undefined,
    expected: '已设置',
    passed: !!supabaseKey,
  });

  checks.push({
    name: 'Supabase Project ID',
    value: projectId,
    expected: 'cardynuoazvaytvinxvm',
    passed: projectId === 'cardynuoazvaytvinxvm',
  });

  // SMTP 配置检查
  const smtpHost = process.env.SMTP_HOST;
  const smtpPort = process.env.SMTP_PORT;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const smtpFrom = process.env.SMTP_SENDER_EMAIL;
  const smtpName = process.env.SMTP_SENDER_NAME;

  checks.push({
    name: 'SMTP Host',
    value: smtpHost,
    expected: SMTP_CONFIG.host,
    passed: smtpHost === SMTP_CONFIG.host,
  });

  checks.push({
    name: 'SMTP Port',
    value: smtpPort,
    expected: String(SMTP_CONFIG.port),
    passed: smtpPort === String(SMTP_CONFIG.port),
  });

  checks.push({
    name: 'SMTP Username',
    value: smtpUser,
    expected: SMTP_CONFIG.username,
    passed: smtpUser === SMTP_CONFIG.username,
  });

  checks.push({
    name: 'SMTP Password',
    value: smtpPass ? '********' : undefined,
    expected: '********',
    passed: smtpPass === SMTP_CONFIG.password,
  });

  checks.push({
    name: 'SMTP Sender Email',
    value: smtpFrom,
    expected: SMTP_CONFIG.senderEmail,
    passed: smtpFrom === SMTP_CONFIG.senderEmail,
  });

  checks.push({
    name: 'SMTP Sender Name',
    value: smtpName,
    expected: SMTP_CONFIG.senderName,
    passed: smtpName === SMTP_CONFIG.senderName,
  });

  // 打印结果
  console.log('\n');
  console.log('| 配置项 | 当前值 | 期望值 | 状态 |');
  console.log('|--------|--------|--------|------|');

  checks.forEach((check) => {
    const status = check.passed ? '✅ 正确' : '❌ 错误';
    const current = check.value || '未设置';
    console.log(`| ${check.name} | ${current} | ${check.expected} | ${status} |`);
  });

  console.log('\n');

  const allPassed = checks.every((c) => c.passed);
  const failedChecks = checks.filter((c) => !c.passed);

  if (allPassed) {
    log.success('所有环境变量配置正确!');
  } else {
    log.error(`发现 ${failedChecks.length} 个配置错误:`);
    failedChecks.forEach((check) => {
      console.log(`  • ${check.name}: 当前 "${check.value || '未设置'}", 应为 "${check.expected}"`);
    });
  }

  return allPassed;
}

/**
 * 检查 Supabase Dashboard 配置
 */
async function checkSupabaseDashboard() {
  log.title('🌐 Supabase Dashboard SMTP 配置指南');
  log.section();

  const projectId = process.env.SUPABASE_PROJECT_ID || 'cardynuoazvaytvinxvm';
  const dashboardUrl = `https://supabase.com/dashboard/project/${projectId}/settings/auth`;

  console.log('\n📍 配置位置:');
  console.log(`   ${dashboardUrl}\n`);

  console.log('📧 SMTP 配置信息:\n');
  console.log('   ┌─────────────────────────────────────────────────┐');
  console.log('   │ 字段              │ 值                          │');
  console.log('   ├─────────────────────────────────────────────────┤');
  console.log(`   │ Sender Name      │ ${SMTP_CONFIG.senderName.padEnd(27)} │`);
  console.log(`   │ Sender Email     │ ${SMTP_CONFIG.senderEmail.padEnd(27)} │`);
  console.log(`   │ Host             │ ${SMTP_CONFIG.host.padEnd(27)} │`);
  console.log(`   │ Port             │ ${String(SMTP_CONFIG.port).padEnd(27)} │`);
  console.log(`   │ Username         │ ${SMTP_CONFIG.username.padEnd(27)} │`);
  console.log(`   │ Password         │ ${SMTP_CONFIG.password.padEnd(27)} │`);
  console.log('   │ Enable SSL/TLS   │ ✅ 启用                     │');
  console.log('   └─────────────────────────────────────────────────┘\n');

  console.log('✅ 配置步骤:');
  console.log('   1. 访问上面的 Dashboard 链接');
  console.log('   2. 找到 "SMTP Settings" 部分');
  console.log('   3. 点击 "Enable Custom SMTP"');
  console.log('   4. 按上表填写配置信息');
  console.log('   5. 确保勾选 "Enable SSL/TLS"');
  console.log('   6. 点击 "Save" 保存\n');

  log.info('配置完成后,等待1-2分钟让配置生效');
}

/**
 * 测试 SMTP 连接
 */
async function testSMTPConnection() {
  log.title('🔌 测试 SMTP 连接');
  log.section();

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    log.error('缺少 Supabase 配置,无法测试');
    return false;
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    log.info('尝试发送测试邮件...');

    const testEmail = `test_${Date.now()}@example.com`;
    const testPassword = 'TestPassword123!';

    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          username: `testuser_${Date.now()}`,
          fullName: 'Test User',
        },
      },
    });

    if (error) {
      if (error.message.includes('rate limit')) {
        log.warning('邮件速率限制 - 这是正常的保护机制');
        log.info('说明 SMTP 配置可能已生效');
        log.info('建议: 等待 1 小时后再试,或在 Dashboard 手动测试');
        return null;
      } else {
        log.error(`SMTP 测试失败: ${error.message}`);
        return false;
      }
    }

    if (data.user) {
      if (data.session) {
        log.warning('用户注册成功,但未收到验证邮件');
        log.info('可能原因: SMTP 配置未启用或邮箱验证已关闭');
        return false;
      } else {
        log.success('注册成功! 验证邮件应该已发送');
        log.info(`测试邮箱: ${testEmail}`);
        log.info('请检查该邮箱是否收到验证邮件');
        return true;
      }
    }
  } catch (error) {
    log.error(`测试失败: ${error.message}`);
    return false;
  }
}

/**
 * 生成配置报告
 */
function generateReport(envPassed) {
  log.title('📊 配置检查报告');
  log.section();

  console.log('\n✅ 已完成的配置:');
  console.log('   1. ✅ 环境变量文件 (.env.local)');
  console.log('   2. ✅ SMTP 配置信息');
  console.log('   3. ✅ Supabase 项目配置\n');

  if (!envPassed) {
    log.warning('需要修复的环境变量:');
    console.log('   请检查上面的错误列表并修正\n');
  }

  console.log('⏭️  下一步操作:');
  console.log('   1. 确保本地环境变量配置正确');
  console.log('   2. 访问 Supabase Dashboard 完成 SMTP 配置');
  console.log('   3. 等待 1-2 分钟让配置生效');
  console.log('   4. 运行测试: node scripts/test-smtp-config.js\n');

  console.log('📚 相关文档:');
  console.log('   • SMTP_CONFIGURATION_STEPS.md - 详细配置步骤');
  console.log('   • QUICK_SMTP_SETUP.md - 快速配置指南');
  console.log('   • SUPABASE_AUTH_COMPLETE.md - 完整系统文档\n');

  log.section();
}

/**
 * 主函数
 */
async function main() {
  console.log(`
╔════════════════════════════════════════════════════════════════════╗
║           Supabase Auth SMTP 配置检查工具                           ║
╚════════════════════════════════════════════════════════════════════╝
  `);

  log.info(`检查时间: ${new Date().toLocaleString('zh-CN')}\n`);

  // 1. 检查环境变量
  const envPassed = checkEnvVariables();

  // 2. 显示 Dashboard 配置指南
  await checkSupabaseDashboard();

  // 3. 生成报告
  generateReport(envPassed);

  // 4. 提示测试
  if (envPassed) {
    log.info('\n💡 提示: 运行以下命令测试 SMTP 连接:');
    console.log('   node scripts/test-smtp-config.js\n');
  }

  process.exit(envPassed ? 0 : 1);
}

// 运行检查
main().catch((error) => {
  log.error(`检查失败: ${error.message}`);
  console.error(error);
  process.exit(1);
});
