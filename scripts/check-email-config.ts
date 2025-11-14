/**
 * 检查邮箱验证配置脚本
 * 诊断新用户注册邮件发送问题
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

// 加载环境变量
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const appUrl = process.env.NEXT_PUBLIC_APP_URL;

console.log('\n=== 📧 邮箱验证配置检查 ===\n');

// 1. 检查环境变量
console.log('1️⃣ 环境变量检查:');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ 已设置' : '❌ 未设置'}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ 已设置' : '❌ 未设置'}`);
console.log(`   NEXT_PUBLIC_APP_URL: ${appUrl || '❌ 未设置'}`);
if (!appUrl) {
  console.log('   ⚠️  警告: NEXT_PUBLIC_APP_URL 未设置，将使用默认值');
  console.log('   建议在 .env.local 中添加: NEXT_PUBLIC_APP_URL=http://localhost:3000');
}

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('\n❌ 错误: 缺少必要的 Supabase 环境变量');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

// 2. 检查 Supabase 配置
console.log('\n2️⃣ Supabase 配置检查:');
console.log(`   Supabase URL: ${supabaseUrl}`);
console.log(`   App URL: ${appUrl || 'http://localhost:3000'}`);

// 3. 测试注册流程
async function testRegistration() {
  console.log('\n3️⃣ 测试注册流程:');
  
  const testEmail = `test_${Date.now()}@example.com`;
  const testPassword = 'TestPassword123!';
  
  console.log(`   测试邮箱: ${testEmail}`);
  console.log(`   测试密码: ${testPassword}`);
  console.log('\n   正在尝试注册...');
  
  try {
    const { data, error } = await supabase.auth.signUp({
      email: testEmail,
      password: testPassword,
      options: {
        emailRedirectTo: `${appUrl || 'http://localhost:3000'}/auth/callback`,
        data: {
          test: true,
        },
      },
    });

    if (error) {
      console.error(`   ❌ 注册失败: ${error.message}`);
      
      if (error.message.includes('rate limit')) {
        console.log('\n   ⚠️  邮件速率限制');
        console.log('   说明: Supabase 可能已配置 SMTP，但触发了速率限制');
        console.log('   建议: 等待一段时间后重试，或检查 Supabase Dashboard');
      } else if (error.message.includes('email')) {
        console.log('\n   ⚠️  邮箱相关错误');
        console.log('   可能原因:');
        console.log('   - SMTP 未配置');
        console.log('   - 邮箱验证已禁用');
        console.log('   - 邮件服务限制');
      }
      
      return false;
    }

    if (data.user) {
      if (data.session) {
        console.log('   ⚠️  用户已创建并自动登录（未发送验证邮件）');
        console.log('   可能原因:');
        console.log('   - Supabase Dashboard 中 "Enable Email Confirmations" 已关闭');
        console.log('   - 检查: Settings > Authentication > Email > Enable Email Confirmations');
        return false;
      } else {
        console.log('   ✅ 用户已创建，验证邮件应已发送');
        console.log(`   用户 ID: ${data.user.id}`);
        console.log(`   邮箱: ${data.user.email}`);
        console.log(`   邮箱已验证: ${data.user.email_confirmed_at ? '是' : '否'}`);
        
        if (!data.user.email_confirmed_at) {
          console.log('\n   📧 验证邮件状态:');
          console.log('   - 如果收到邮件: SMTP 配置正常 ✅');
          console.log('   - 如果未收到邮件: 请检查以下配置');
          console.log('     1. Supabase Dashboard > Settings > Auth > SMTP Settings');
          console.log('     2. 检查垃圾邮件文件夹');
          console.log('     3. 检查邮件服务限制');
        }
        
        return true;
      }
    }

    return false;
  } catch (error: any) {
    console.error(`   ❌ 异常: ${error.message}`);
    return false;
  }
}

// 4. 提供配置指南
function showConfigurationGuide() {
  console.log('\n4️⃣ Supabase SMTP 配置指南:');
  console.log('\n   步骤 1: 登录 Supabase Dashboard');
  console.log('   https://supabase.com/dashboard/project/cardynuoazvaytvinxvm/settings/auth');
  
  console.log('\n   步骤 2: 配置 SMTP Settings');
  console.log('   - 找到 "SMTP Settings" 部分');
  console.log('   - 点击 "Enable Custom SMTP"');
  console.log('   - 填写以下信息:');
  console.log('     Host: smtp.exmail.qq.com');
  console.log('     Port: 465');
  console.log('     Username: support@openaero.cn');
  console.log('     Password: zdM469e7q3ZU2gy7');
  console.log('     Sender email: support@openaero.cn');
  console.log('     Sender name: OpenAero');
  console.log('     Enable SSL/TLS: ✅');
  
  console.log('\n   步骤 3: 检查 Email Settings');
  console.log('   - Enable Email Signup: ✅ ON');
  console.log('   - Enable Email Confirmations: ✅ ON');
  console.log('   - Site URL: http://localhost:3000 (开发环境)');
  
  console.log('\n   步骤 4: 检查 Email Templates');
  console.log('   - 确认邮件模板已配置');
  console.log('   - 模板文件: supabase/email-templates.json');
}

// 主函数
async function main() {
  const result = await testRegistration();
  
  if (!result) {
    showConfigurationGuide();
  }
  
  console.log('\n=== ✅ 检查完成 ===\n');
}

main().catch(console.error);

