/**
 * 检查 SMTP 配置状态
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ 错误: 缺少环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkSMTPStatus() {
  console.log('🔍 检查 SMTP 配置状态...\n');
  
  console.log('📋 当前配置:');
  console.log(`   Supabase URL: ${supabaseUrl}`);
  console.log(`   项目 ID: cardynuoazvaytvinxvm\n`);
  
  console.log('⚠️  注意: SMTP 配置需要在 Supabase Dashboard 中完成\n');
  
  console.log('📍 配置位置:');
  console.log('   https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/settings/auth\n');
  
  console.log('📧 SMTP 配置信息:');
  console.log('   ┌─────────────────────────────────────────┐');
  console.log('   │ Host:     smtp.exmail.qq.com            │');
  console.log('   │ Port:     465                           │');
  console.log('   │ User:     support@openaero.cn          │');
  console.log('   │ Password: zdM469e7q3ZU2gy7             │');
  console.log('   │ SSL/TLS:  ✅ 启用                       │');
  console.log('   └─────────────────────────────────────────┘\n');
  
  console.log('✅ 配置步骤:');
  console.log('   1. 访问上面的链接');
  console.log('   2. 找到 "SMTP Settings" 部分');
  console.log('   3. 点击 "Enable Custom SMTP"');
  console.log('   4. 填写上面的配置信息');
  console.log('   5. 点击 "Save" 保存\n');
  
  console.log('📖 详细文档:');
  console.log('   - 快速配置: QUICK_SMTP_SETUP.md');
  console.log('   - 详细步骤: SMTP_CONFIGURATION_STEPS.md\n');
  
  // 检查是否有邮件速率限制
  console.log('⏰ 邮件速率限制检查:');
  console.log('   如果看到 "email rate limit exceeded" 错误:');
  console.log('   - 这是正常的保护机制');
  console.log('   - 等待 1 小时后再试');
  console.log('   - 或在 Dashboard 中调整速率限制\n');
  
  console.log('🎯 下一步:');
  console.log('   1. 完成 Supabase Dashboard 中的 SMTP 配置');
  console.log('   2. 等待速率限制重置 (约 1 小时)');
  console.log('   3. 重新运行: node scripts/test-smtp-config.js\n');
}

checkSMTPStatus();
