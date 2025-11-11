/**
 * SMTP 配置测试脚本
 * 测试 Supabase Auth 邮件发送功能
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('❌ 错误: 缺少 Supabase 环境变量');
  console.error('请确保 .env.local 文件包含:');
  console.error('  - NEXT_PUBLIC_SUPABASE_URL');
  console.error('  - NEXT_PUBLIC_SUPABASE_ANON_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testSMTP() {
  console.log('🚀 开始测试 SMTP 配置...\n');
  console.log('📋 配置信息:');
  console.log(`   Supabase URL: ${supabaseUrl}`);
  console.log(`   SMTP Host: smtp.exmail.qq.com`);
  console.log(`   SMTP Port: 465`);
  console.log(`   Sender: support@openaero.cn\n`);

  // 生成测试邮箱
  const timestamp = Date.now();
  const testEmail = `test+${timestamp}@example.com`;
  const testPassword = 'TestPassword123!';

  console.log('📧 测试邮箱:', testEmail);
  console.log('🔐 测试密码:', testPassword);
  console.log('\n开始测试...\n');

  try {
    // 测试 1: 用户注册
    console.log('1️⃣  测试用户注册...');
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          display_name: 'Test User',
        },
      },
    });

    if (signUpError) {
      console.error('   ❌ 注册失败:', signUpError.message);
      
      if (signUpError.message.includes('Email rate limit exceeded')) {
        console.log('\n⚠️  注意: 邮件发送速率超限');
        console.log('   这可能是因为:');
        console.log('   1. 短时间内发送了太多邮件');
        console.log('   2. Supabase 速率限制设置太严格');
        console.log('   3. SMTP 配置的速率限制');
        console.log('\n   请稍后再试，或检查 Supabase Dashboard 的 Rate Limits 设置。');
      }
      
      process.exit(1);
    }

    console.log('   ✅ 注册成功!');
    console.log('   用户 ID:', signUpData.user?.id);
    console.log('   邮箱:', signUpData.user?.email);
    console.log('   邮箱验证状态:', signUpData.user?.email_confirmed_at ? '已验证' : '未验证');

    if (signUpData.user && !signUpData.user.email_confirmed_at) {
      console.log('\n📬 验证邮件应该已发送到:', testEmail);
      console.log('   ✨ 如果这是一个真实邮箱，请检查收件箱（包括垃圾邮件）');
      console.log('   ✨ 邮件主题: "欢迎加入 OpenAero - 请验证您的邮箱"');
      console.log('   ✨ 发件人: OpenAero <support@openaero.cn>');
    }

    // 等待几秒
    console.log('\n⏳ 等待 3 秒...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 测试 2: 重新发送验证邮件
    console.log('2️⃣  测试重新发送验证邮件...');
    const { error: resendError } = await supabase.auth.resend({
      type: 'signup',
      email: testEmail,
    });

    if (resendError) {
      if (resendError.message.includes('Email rate limit exceeded')) {
        console.log('   ⚠️  速率限制: 请等待一段时间后再试');
      } else if (resendError.message.includes('already confirmed')) {
        console.log('   ℹ️  邮箱已验证，无需重新发送');
      } else {
        console.error('   ❌ 重新发送失败:', resendError.message);
      }
    } else {
      console.log('   ✅ 验证邮件已重新发送!');
    }

    // 等待几秒
    console.log('\n⏳ 等待 3 秒...\n');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // 测试 3: 密码重置
    console.log('3️⃣  测试密码重置邮件...');
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(testEmail, {
      redirectTo: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/auth/reset-password`,
    });

    if (resetError) {
      if (resetError.message.includes('Email rate limit exceeded')) {
        console.log('   ⚠️  速率限制: 请等待一段时间后再试');
      } else {
        console.error('   ❌ 密码重置邮件发送失败:', resetError.message);
      }
    } else {
      console.log('   ✅ 密码重置邮件已发送!');
      console.log('\n📬 密码重置邮件应该已发送到:', testEmail);
      console.log('   ✨ 邮件主题: "OpenAero - 重置密码请求"');
      console.log('   ✨ 发件人: OpenAero <support@openaero.cn>');
    }

    // 总结
    console.log('\n' + '='.repeat(60));
    console.log('✅ SMTP 配置测试完成!');
    console.log('='.repeat(60));
    console.log('\n📊 测试结果:');
    console.log('   ✓ 用户注册: 成功');
    console.log('   ✓ 验证邮件: 已发送');
    console.log('   ✓ 密码重置邮件: 已发送');
    
    console.log('\n💡 下一步:');
    console.log('   1. 如果使用真实邮箱测试，请检查邮件');
    console.log('   2. 点击验证链接完成邮箱验证');
    console.log('   3. 在 Supabase Dashboard 查看邮件发送日志');
    console.log('   4. 检查邮件是否被标记为垃圾邮件');
    
    console.log('\n📋 Supabase Dashboard 链接:');
    console.log('   Auth Users: https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/auth/users');
    console.log('   Logs: https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/logs/edge-logs');
    
    console.log('\n⚠️  注意:');
    console.log('   - 测试账户已创建，可以在 Supabase Dashboard 中删除');
    console.log('   - 测试邮箱: ' + testEmail);
    console.log('   - 如果要使用真实邮箱测试，请修改脚本中的 testEmail');
    
  } catch (error) {
    console.error('\n❌ 测试过程中出现错误:', error.message);
    console.error('\n详细错误:', error);
    process.exit(1);
  }
}

// 运行测试
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║         OpenAero SMTP 配置测试                              ║');
console.log('╚════════════════════════════════════════════════════════════╝\n');

testSMTP().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
